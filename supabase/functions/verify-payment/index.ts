import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyPaymentRequest {
  reference: string;
  userId: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const reference = body?.reference;
    const userId = body?.userId;

    // Input validation
    if (!reference || typeof reference !== 'string' || reference.length > 100) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate reference format (alphanumeric and common special chars)
    if (!/^[a-zA-Z0-9_-]+$/.test(reference)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate userId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!userId || typeof userId !== 'string' || !uuidRegex.test(userId)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify payment with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackData.status || paystackData.data.status !== "success") {
      console.error("Payment verification failed:", paystackData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "payment_failed", 
          message: "Payment verification failed" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Record payment in database
    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        amount: paystackData.data.amount / 100, // Convert from pesewas to cedis
        type: "registration",
        status: "completed",
        payment_gateway: "paystack",
        transaction_id: reference,
        payment_details: {
          channel: paystackData.data.channel,
          currency: paystackData.data.currency,
          paid_at: paystackData.data.paid_at,
        },
      });

    if (paymentError) {
      console.error("Failed to record payment:", paymentError);
      // Don't fail the request, payment was successful
    }

    // Update profile to mark registration fee as paid
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ registration_fee_paid: true })
      .eq("id", userId);

    if (profileError) {
      console.error("Failed to update profile:", profileError);
    }

    console.log("Payment verified and recorded for user:", userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Payment verified successfully",
        data: {
          amount: paystackData.data.amount / 100,
          currency: paystackData.data.currency,
          reference: reference,
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in verify-payment:", error);
    // Return generic error - don't expose internal details
    return new Response(
      JSON.stringify({ success: false, error: "server_error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
