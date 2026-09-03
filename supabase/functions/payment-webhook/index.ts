// Receives Korapay and Paystack webhooks and keeps the finance ledger in sync.
// Every successful charge is verified with the gateway, recorded in `payments`
// with the 70/30 revenue split, and the matching order/project is marked paid.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KORAPAY_SECRET_KEY = Deno.env.get("KORAPAY_SECRET_KEY") || "";
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-korapay-signature, x-paystack-signature",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const hmac = (algo: "sha256" | "sha512", key: string, payload: string) =>
  createHmac(algo, key).update(payload).digest("hex");

const timingSafeEqual = (a: string, b: string) => {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

type Verified = { reference: string; amount: number; currency: string; gateway: "Korapay" | "Paystack" };

async function verifyKorapay(reference: string): Promise<Verified | null> {
  const resp = await fetch(`https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${KORAPAY_SECRET_KEY}` },
  });
  const body = await resp.json().catch(() => ({}));
  if (!body?.status || body?.data?.status !== "success") return null;
  return { reference, amount: Number(body.data.amount), currency: String(body.data.currency || "GHS"), gateway: "Korapay" };
}

async function verifyPaystack(reference: string): Promise<Verified | null> {
  const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });
  const body = await resp.json().catch(() => ({}));
  if (!body?.status || body?.data?.status !== "success") return null;
  // Paystack amounts arrive in the smallest currency unit
  return { reference, amount: Number(body.data.amount) / 100, currency: String(body.data.currency || "GHS"), gateway: "Paystack" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const raw = await req.text();
    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    const korapaySignature = req.headers.get("x-korapay-signature") || "";
    const paystackSignature = req.headers.get("x-paystack-signature") || "";

    let verified: Verified | null = null;

    if (paystackSignature) {
      if (!PAYSTACK_SECRET_KEY) return json({ error: "paystack_not_configured" }, 400);
      if (!timingSafeEqual(paystackSignature, hmac("sha512", PAYSTACK_SECRET_KEY, raw))) {
        return json({ error: "invalid_signature" }, 401);
      }
      const reference = String(payload?.data?.reference || "");
      if (!reference) return json({ error: "missing_reference" }, 400);
      if (payload?.event && payload.event !== "charge.success") {
        return json({ success: true, ignored: payload.event });
      }
      verified = await verifyPaystack(reference);
    } else if (korapaySignature) {
      if (!KORAPAY_SECRET_KEY) return json({ error: "korapay_not_configured" }, 400);
      // Korapay signs only the `data` object of the payload
      if (!timingSafeEqual(korapaySignature, hmac("sha256", KORAPAY_SECRET_KEY, JSON.stringify(payload?.data ?? {})))) {
        return json({ error: "invalid_signature" }, 401);
      }
      const reference = String(payload?.data?.reference || payload?.data?.payment_reference || "");
      if (!reference) return json({ error: "missing_reference" }, 400);
      if (payload?.event && !String(payload.event).endsWith("charge.success")) {
        return json({ success: true, ignored: payload.event });
      }
      verified = await verifyKorapay(reference);
    } else {
      return json({ error: "missing_signature" }, 401);
    }

    if (!verified) return json({ error: "not_successful", message: "Gateway did not confirm this charge." }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Idempotency — never double-post the same transaction to the ledger
    const { data: existingPayment } = await admin
      .from("payments")
      .select("id")
      .eq("transaction_id", verified.reference)
      .maybeSingle();
    if (existingPayment) return json({ success: true, message: "Already recorded.", ledger_id: existingPayment.id });

    // Live USD -> GHS rate from settings (falls back to the platform default)
    const { data: rateSetting } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", "usd_to_ghs_rate")
      .maybeSingle();
    const usdToGhs = Number((rateSetting?.value as any) ?? 15.5) || 15.5;
    const amountGhs =
      verified.currency.toUpperCase() === "USD"
        ? Math.round(verified.amount * usdToGhs * 100) / 100
        : Math.round(verified.amount * 100) / 100;

    const { data: shareSetting } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", "revenue_share_percentage")
      .maybeSingle();
    const sharePercent = Number((shareSetting?.value as any) ?? 70) || 70;
    const talentShare = Math.round((amountGhs * sharePercent) / 100 * 100) / 100;
    const platformProfit = Math.round((amountGhs - talentShare) * 100) / 100;

    // Match the charge to an order, then to the client account behind it
    const { data: order } = await admin
      .from("client_orders")
      .select("id, client_email, payment_status, service_type, tier")
      .eq("payment_reference", verified.reference)
      .maybeSingle();

    let clientUserId: string | null = null;
    let projectId: string | null = null;

    if (order) {
      if (order.payment_status !== "completed") {
        await admin.from("client_orders").update({ payment_status: "completed" }).eq("id", order.id);
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("email", order.client_email)
        .maybeSingle();
      clientUserId = profile?.id ?? null;

      // Publish the project to the marketplace now that funds have landed
      if (clientUserId) {
        const { data: project } = await admin
          .from("client_projects")
          .select("id, paid_at")
          .eq("created_by", clientUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (project) {
          projectId = project.id;
          if (!project.paid_at) {
            await admin
              .from("client_projects")
              .update({ paid_at: new Date().toISOString(), price_ghs: amountGhs, status: "pending" })
              .eq("id", project.id);
          }
        }
      }
    }

    if (!clientUserId) {
      // No client account to attribute the funds to yet — log it and let the
      // checkout flow record the ledger row once the account exists.
      console.warn("payment-webhook: no client account for reference", verified.reference);
      return json({ success: true, message: "Charge verified but no client account matched yet." });
    }

    const { data: inserted, error: insertError } = await admin
      .from("payments")
      .insert({
        user_id: clientUserId,
        amount: amountGhs,
        type: "client_order",
        status: "completed",
        transaction_id: verified.reference,
        payment_gateway: verified.gateway,
        payment_details: {
          source: "webhook",
          order_id: order?.id ?? null,
          project_id: projectId,
          service_type: order?.service_type ?? null,
          tier: order?.tier ?? null,
          currency: verified.currency,
          share_percent: sharePercent,
          talent_share: talentShare,
          platform_profit: platformProfit,
        },
      })
      .select("id")
      .maybeSingle();

    if (insertError) {
      console.error("payment-webhook ledger insert failed:", insertError);
      return json({ error: "ledger_insert_failed", message: insertError.message }, 500);
    }

    await admin.from("system_logs").insert({
      action_type: "payment_webhook_recorded",
      description: `${verified.gateway} charge of GH₵${amountGhs.toFixed(2)} recorded in the ledger`,
      new_value: {
        reference: verified.reference,
        amount: amountGhs,
        share_percent: sharePercent,
        talent_share: talentShare,
        platform_profit: platformProfit,
      },
    });

    return json({ success: true, ledger_id: inserted?.id, amount: amountGhs, talent_share: talentShare, platform_profit: platformProfit });
  } catch (e) {
    console.error("payment-webhook error:", e);
    return json({ error: "server_error", message: (e as Error).message }, 500);
  }
});
