import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const KORAPAY_SECRET_KEY = Deno.env.get("KORAPAY_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PROFESSION_UPGRADE_FEE = 80; // GHS

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { reference } = await req.json();
    if (!reference || !/^[a-zA-Z0-9_\-]+$/.test(String(reference))) {
      return new Response(JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ success: false, error: "unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Idempotency
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("transaction_id", reference)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ success: true, alreadyProcessed: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Verify with Korapay
    const kr = await fetch(
      `https://api.korapay.com/merchant/api/v1/charges/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${KORAPAY_SECRET_KEY}` } }
    );
    const krData = await kr.json();
    if (!krData.status || krData.data?.status !== "success") {
      return new Response(JSON.stringify({ success: false, error: "payment_failed" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const verifiedAmount = Number(krData.data.amount) || 0;
    const currency = krData.data.currency || "GHS";
    const amountInGhs = currency === "USD" ? verifiedAmount * 15.5 : verifiedAmount;

    if (amountInGhs + 0.5 < PROFESSION_UPGRADE_FEE) {
      return new Response(JSON.stringify({ success: false, error: "insufficient_amount" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Record payment + flip flag
    await supabase.from("payments").insert({
      user_id: user.id,
      amount: amountInGhs,
      type: "profession_upgrade",
      status: "completed",
      payment_gateway: "korapay",
      transaction_id: reference,
      payment_details: { channel: krData.data.payment_method || "korapay", currency },
    });

    await supabase
      .from("designer_details")
      .update({ extra_profession_paid: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err) {
    console.error("verify-profession-upgrade error:", err);
    return new Response(JSON.stringify({ success: false, error: "server_error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
