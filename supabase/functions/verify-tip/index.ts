import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const KORAPAY_SECRET_KEY = Deno.env.get("KORAPAY_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REFERENCE_RE = /^PH-TIP-[0-9]{10,20}-[A-Za-z0-9_-]{8,40}$/;
const TOKEN_RE = /^[a-f0-9]{32,128}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const cleanText = (value: unknown, max: number) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const isLimited = async (supabase: any, action: string, identifier: string) => {
  try {
    const { data } = await supabase.rpc("check_rate_limit", { p_action: action, p_identifier: identifier });
    return data && data.allowed === false ? data : null;
  } catch {
    return null;
  }
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action === "init" ? "init" : "verify";
    let reference = cleanText(body.reference, 120);

    if (action === "init" && !REFERENCE_RE.test(reference)) {
      reference = `PH-TIP-${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    }
    if (!REFERENCE_RE.test(reference)) return json({ success: false, error: "invalid_reference" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = await isLimited(supabase, "tip_payment", `${action}:${ip}`);
    if (limit) return json({ success: false, error: "rate_limited", retry_after_seconds: limit.retry_after_seconds }, 429);

    if (action === "init") {
      const token = cleanText(body.token, 128).toLowerCase();
      const amount = Math.round(Number(body.amount || 0) * 100) / 100;
      const message = cleanText(body.message, 500) || null;

      if (!TOKEN_RE.test(token) || !Number.isFinite(amount) || amount < 5 || amount > 100000) {
        return json({ success: false, error: "invalid_request" }, 400);
      }

      const { data: project } = await supabase
        .from("client_projects")
        .select("id, client_name, client_email, accepted_designer_id, status")
        .eq("tracking_token", token)
        .maybeSingle();

      if (!project?.id || !project.accepted_designer_id) {
        return json({ success: false, error: "project_not_tip_ready", message: "This project is not ready for tips yet." }, 400);
      }

      const clientName = cleanText(project.client_name, 100) || null;
      const clientEmailRaw = cleanText(project.client_email, 255).toLowerCase();
      const clientEmail = EMAIL_RE.test(clientEmailRaw) ? clientEmailRaw : null;

      const { data: existingTip } = await supabase
        .from("project_tips")
        .select("id, status")
        .eq("transaction_id", reference)
        .maybeSingle();
      if (existingTip) return json({ success: false, error: "reference_already_used" }, 409);

      const { error } = await supabase.from("project_tip_intents").insert({
        reference,
        project_id: project.id,
        designer_id: project.accepted_designer_id,
        client_name: clientName,
        client_email: clientEmail,
        amount,
        currency: "GHS",
        message,
        status: "pending",
        gateway: "korapay",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });

      if (error) {
        console.error("tip intent create failed:", error);
        return json({ success: false, error: "intent_failed" }, 500);
      }

      return json({ success: true, reference, amount, currency: "GHS" });
    }

    const { data: intent } = await supabase
      .from("project_tip_intents")
      .select("id, reference, project_id, designer_id, client_name, client_email, amount, currency, message, status, expires_at, verified_tip_id")
      .eq("reference", reference)
      .maybeSingle();

    if (!intent) return json({ success: false, error: "tip_intent_not_found" }, 404);
    if (intent.status === "completed") return json({ success: true, alreadyProcessed: true, tipId: intent.verified_tip_id });
    if (intent.status !== "pending" || new Date(intent.expires_at).getTime() < Date.now()) {
      await supabase.from("project_tip_intents").update({ status: "expired" }).eq("id", intent.id).eq("status", "pending");
      return json({ success: false, error: "tip_intent_expired" }, 400);
    }

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("transaction_id", reference)
      .maybeSingle();
    if (existingPayment) return json({ success: false, error: "reference_already_used" }, 409);

    const { data: existingOrder } = await supabase
      .from("client_orders")
      .select("id")
      .eq("payment_reference", reference)
      .maybeSingle();
    if (existingOrder) return json({ success: false, error: "reference_already_used" }, 409);

    if (!KORAPAY_SECRET_KEY) return json({ success: false, error: "korapay_not_configured" }, 500);

    const kr = await fetch(`https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${KORAPAY_SECRET_KEY}` },
    });
    const krData = await kr.json().catch(() => ({}));
    if (!krData?.status || krData?.data?.status !== "success") {
      return json({ success: false, error: "payment_failed" }, 400);
    }

    const verifiedAmount = Math.round(Number(krData.data.amount || 0) * 100) / 100;
    const currency = String(krData.data.currency || "GHS").toUpperCase();
    if (currency !== "GHS" || verifiedAmount + 0.01 < Number(intent.amount)) {
      await supabase.from("project_tip_intents").update({ status: "failed" }).eq("id", intent.id);
      return json({ success: false, error: "amount_mismatch" }, 400);
    }

    const { data: project } = await supabase
      .from("client_projects")
      .select("id, accepted_designer_id, tip_total")
      .eq("id", intent.project_id)
      .maybeSingle();

    if (!project || project.accepted_designer_id !== intent.designer_id) {
      await supabase.from("project_tip_intents").update({ status: "failed" }).eq("id", intent.id);
      return json({ success: false, error: "project_assignment_changed" }, 409);
    }

    const { data: insertedTip, error: tipError } = await supabase
      .from("project_tips")
      .insert({
        project_id: intent.project_id,
        designer_id: intent.designer_id,
        client_email: intent.client_email,
        client_name: intent.client_name,
        amount: verifiedAmount,
        currency: "GHS",
        transaction_id: reference,
        status: "completed",
        message: intent.message,
      })
      .select("id")
      .maybeSingle();

    if (tipError) {
      console.error("tip insert failed:", tipError);
      return json({ success: false, error: "tip_record_failed" }, 500);
    }

    await Promise.all([
      supabase
        .from("client_projects")
        .update({ tip_total: Number(project.tip_total || 0) + verifiedAmount, updated_at: new Date().toISOString() })
        .eq("id", intent.project_id),
      supabase
        .from("project_tip_intents")
        .update({ status: "completed", verified_tip_id: insertedTip?.id || null })
        .eq("id", intent.id),
    ]);

    return json({ success: true, amount: verifiedAmount, tipId: insertedTip?.id || null });
  } catch (err) {
    console.error("verify-tip error:", err);
    return json({ success: false, error: "server_error" }, 500);
  }
});
