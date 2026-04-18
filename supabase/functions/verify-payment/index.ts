import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const KORAPAY_SECRET_KEY = Deno.env.get("KORAPAY_SECRET_KEY");
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const reference = body?.reference;
    const gateway = body?.gateway || 'korapay';


    // Input validation for reference
    if (!reference || typeof reference !== 'string' || reference.length > 200) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!/^[a-zA-Z0-9_\-]+$/.test(reference)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify JWT and extract userId from token
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const userId = user.id;

    // Check for duplicate payment reference
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("transaction_id", reference)
      .maybeSingle();

    if (existingPayment) {
      return new Response(
        JSON.stringify({ success: false, error: "payment_already_processed" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let verifiedAmount: number;
    let verifiedCurrency: string;
    let paymentChannel: string;
    let paidAt: string;


    if (gateway === 'paystack') {
      const paystackResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
      );
      const paystackData = await paystackResponse.json();

      if (!paystackData.status || paystackData.data?.status !== "success") {
        console.error("Paystack verification failed:", paystackData);
        return new Response(
          JSON.stringify({ success: false, error: "payment_failed", message: "Payment verification failed" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      verifiedAmount = paystackData.data.amount / 100;
      verifiedCurrency = paystackData.data.currency;
      paymentChannel = paystackData.data.channel || "paystack";
      paidAt = paystackData.data.paid_at || new Date().toISOString();
    } else {
      // Verify payment with Korapay
      const korapayResponse = await fetch(
        `https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${KORAPAY_SECRET_KEY}` } }
      );

      const korapayData = await korapayResponse.json();

      if (!korapayData.status || korapayData.data?.status !== "success") {
        console.error("Korapay verification failed:", korapayData);
        return new Response(
          JSON.stringify({ success: false, error: "payment_failed", message: "Payment verification failed" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      verifiedAmount = korapayData.data.amount;
      verifiedCurrency = korapayData.data.currency;
      paymentChannel = korapayData.data.payment_method || korapayData.data.channel || "korapay";
      paidAt = korapayData.data.paid_at || new Date().toISOString();
    }

    // Convert USD to GHS for storage if needed
    const amountInGhs = verifiedCurrency === 'USD' ? verifiedAmount * 15.5 : verifiedAmount;

    // Record payment in database
    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        amount: amountInGhs,
        type: "registration",
        status: "completed",
        payment_gateway: gateway,
        transaction_id: reference,
        payment_details: {
          channel: paymentChannel,
          currency: verifiedCurrency,
          original_amount: verifiedAmount,
          paid_at: paidAt,
        },
      });


    if (paymentError) {
      console.error("Failed to record payment:", paymentError);
    }

    // Get user profile for Discord invite
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, discord_invite_sent")
      .eq("id", userId)
      .single();

    // Update profile to mark registration fee as paid
    await supabase
      .from("profiles")
      .update({ registration_fee_paid: true })
      .eq("id", userId);

    console.log("Payment verified and recorded for user:", userId);

    // Send verification email, welcome email, and Discord invite in parallel
    if (profile) {
      const promises: Promise<void>[] = [];

      promises.push(
        (async () => {
          try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/send-verification-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
              body: JSON.stringify({
                email: profile.email,
                fullName: profile.full_name || "Designer",
                userId,
                redirectUrl: req.headers.get("origin") || "https://primehaven.tech",
              }),
            });
            if (res.ok) console.log("Verification email sent for user:", userId);
            else console.error("Failed to send verification email:", await res.json());
          } catch (e) { console.error("Error sending verification email:", e); }
        })()
      );

      promises.push(
        (async () => {
          try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/send-welcome-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
              body: JSON.stringify({ email: profile.email, fullName: profile.full_name || "Designer" }),
            });
            if (res.ok) console.log("Welcome email sent for user:", userId);
            else console.error("Failed to send welcome email:", await res.json());
          } catch (e) { console.error("Error sending welcome email:", e); }
        })()
      );

      if (!profile.discord_invite_sent) {
        promises.push(
          (async () => {
            try {
              const res = await fetch(`${SUPABASE_URL}/functions/v1/create-discord-invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
                body: JSON.stringify({ userId, email: profile.email, fullName: profile.full_name || "Designer" }),
              });
              if (res.ok) console.log("Discord invite sent for user:", userId);
              else console.error("Failed to send Discord invite:", await res.json());
            } catch (e) { console.error("Error sending Discord invite:", e); }
          })()
        );
      }

      await Promise.allSettled(promises);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment verified successfully",
        data: { amount: amountInGhs, currency: verifiedCurrency, reference },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in verify-payment:", error);
    return new Response(
      JSON.stringify({ success: false, error: "server_error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
