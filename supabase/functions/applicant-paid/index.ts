// @ts-nocheck
// Records that a passed applicant settled the registration fee and links their
// new professional account. Paid registrations are verified by verify-payment.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, TOKEN_RE, limited, safePublicOrigin } from "../_shared/applicants.ts";
import { withCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(withCors(async (req: Request): Promise<Response> => {
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "unauthorized" }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ success: false, error: "unauthorized" }, 401);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await limited(supabase, "applicant_payment", `${token}:${ip}`)) {
      return json({ success: false, error: "rate_limited", message: "Too many payment checks. Please try again later." }, 429);
    }

    const { data: applicant } = await supabase
      .from("applicants")
      .select("id, email, status, track")
      .eq("access_token", token)
      .maybeSingle();

    if (!applicant) return json({ success: false, error: "not_found" }, 404);
    if (!["passed", "paid", "active"].includes(applicant.status)) {
      return json({ success: false, error: "stage_locked" }, 403);
    }
    if (user.email?.toLowerCase() !== applicant.email.toLowerCase()) {
      return json({ success: false, error: "forbidden" }, 403);
    }

    // Confirm the payment row exists (verify-payment writes it after verifying
    // with the gateway) so status can't be forced from the browser.
    let { data: payment } = await supabase
      .from("payments")
      .select("id, user_id, status")
      .eq("transaction_id", reference)
      .maybeSingle();
    let freeRegistration = false;

    if (!payment && body.promoCode) {
      const promoCode = String(body.promoCode).trim().toUpperCase().slice(0, 100);
      if (applicant.status !== "passed") {
        return json({ success: false, error: "stage_locked" }, 403);
      }
      const { data: promo, error: promoError } = await supabase
        .from("promo_codes")
        .select("code, discount_percent, is_active, expiry_date")
        .eq("code", promoCode)
        .maybeSingle();
      const expired = promo?.expiry_date ? new Date(promo.expiry_date).getTime() <= Date.now() : false;
      if (
        promoError ||
        !promo ||
        !promo.is_active ||
        expired ||
        Number(promo.discount_percent) !== 100
      ) {
        return json({ success: false, error: "invalid_free_registration" }, 400);
      }

      const { data: createdPayment, error: createPaymentError } = await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          amount: 0,
          type: "registration",
          status: "completed",
          payment_gateway: "promo",
          transaction_id: reference,
          payment_details: { promo_code: promoCode, discount_percent: 100 },
        })
        .select("id, user_id, status")
        .single();
      if (createPaymentError || !createdPayment) {
        console.error("Free applicant payment insert failed:", createPaymentError);
        return json({ success: false, error: "payment_record_failed" }, 500);
      }
      payment = createdPayment;
      freeRegistration = true;
    }

    if (!payment || payment.status !== "completed") {
      return json({ success: false, error: "payment_not_verified", message: "We could not confirm that payment yet." }, 400);
    }
    if (payment.user_id !== user.id) return json({ success: false, error: "payment_user_mismatch" }, 403);

    await supabase
      .from("applicants")
      .update({
        status: applicant.status === "active" ? "active" : "paid",
        payment_reference: reference,
        paid_at: new Date().toISOString(),
        user_id: payment.user_id,
      })
      .eq("id", applicant.id);

    // Ensure designer_details and profiles reflect the onboarded talent track
    if (payment.user_id && applicant.track) {
      await supabase
        .from("designer_details")
        .upsert({
          user_id: payment.user_id,
          professional_title: applicant.track,
          professions: [applicant.track],
        }, { onConflict: "user_id" });

      await supabase
        .from("profiles")
        .update({ is_active: true, registration_fee_paid: true, specialty: applicant.track })
        .eq("id", payment.user_id);
    }

    if (freeRegistration) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/send-verification-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "apikey": SUPABASE_SERVICE_ROLE_KEY!,
            },
            body: JSON.stringify({
              email: profile.email,
              fullName: profile.full_name || applicant.email,
              userId: user.id,
              redirectUrl: safePublicOrigin(req.headers.get("origin")),
            }),
          });
          if (!response.ok) console.error("Free applicant verification email failed:", await response.text());
        } catch (emailError) {
          console.error("Free applicant verification email failed:", emailError);
        }
      }
    }

    return json({ success: true });
  } catch (err) {
    console.error("applicant-paid error:", err);
    return json({ success: false, error: "unexpected_error" }, 500);
  }
}));
