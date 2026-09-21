// @ts-nocheck
// Records that a passed applicant settled the registration fee and links their
// new professional account. The payment itself is verified by verify-payment.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, TOKEN_RE, limited } from "../_shared/applicants.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim().toLowerCase();
    const reference = String(body.reference || "").trim().slice(0, 200);

    if (!TOKEN_RE.test(token)) return json({ success: false, error: "invalid_token" }, 400);
    if (!/^[a-zA-Z0-9_-]+$/.test(reference)) return json({ success: false, error: "invalid_request" }, 400);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await limited(supabase, "applicant_payment", `${token}:${ip}`)) {
      return json({ success: false, error: "rate_limited", message: "Too many payment checks. Please try again later." }, 429);
    }

    const { data: applicant } = await supabase
      .from("applicants")
      .select("id, email, status")
      .eq("access_token", token)
      .maybeSingle();

    if (!applicant) return json({ success: false, error: "not_found" }, 404);
    if (!["passed", "paid", "active"].includes(applicant.status)) {
      return json({ success: false, error: "stage_locked" }, 403);
    }

    // Confirm the payment row exists (verify-payment writes it after verifying
    // with the gateway) so status can't be forced from the browser.
    const { data: payment } = await supabase
      .from("payments")
      .select("id, user_id, status")
      .eq("transaction_id", reference)
      .maybeSingle();

    if (!payment || payment.status !== "completed") {
      return json({ success: false, error: "payment_not_verified", message: "We could not confirm that payment yet." }, 400);
    }

    await supabase
      .from("applicants")
      .update({
        status: applicant.status === "active" ? "active" : "paid",
        payment_reference: reference,
        paid_at: new Date().toISOString(),
        user_id: payment.user_id,
      })
      .eq("id", applicant.id);

    return json({ success: true });
  } catch (err) {
    console.error("applicant-paid error:", err);
    return json({ success: false, error: "unexpected_error" }, 500);
  }
});
