import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const KORAPAY_SECRET_KEY = Deno.env.get("KORAPAY_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { reference, projectId, clientName, clientEmail, message, amount } = await req.json();

    if (!reference || !/^[a-zA-Z0-9_\-]+$/.test(String(reference)) || !projectId) {
      return new Response(JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Idempotency: if tip already recorded, return success
    const { data: existing } = await supabase
      .from("project_tips")
      .select("id, status")
      .eq("transaction_id", reference)
      .maybeSingle();

    if (existing && existing.status === "completed") {
      return new Response(JSON.stringify({ success: true, alreadyProcessed: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Cross-table check: reject if reference was already consumed by another endpoint
    // (e.g. registration payments, client orders) to prevent double-crediting one
    // Korapay reference as both a payment and a tip.
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("transaction_id", reference)
      .maybeSingle();

    if (existingPayment) {
      return new Response(JSON.stringify({ success: false, error: "reference_already_used" }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: existingOrder } = await supabase
      .from("client_orders")
      .select("id")
      .eq("payment_reference", reference)
      .maybeSingle();

    if (existingOrder) {
      return new Response(JSON.stringify({ success: false, error: "reference_already_used" }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } });
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

    const verifiedAmount = Number(krData.data.amount) || Number(amount) || 0;
    const currency = krData.data.currency || "GHS";
    const amountInGhs = currency === "USD" ? verifiedAmount * 15.5 : verifiedAmount;

    // Look up the accepted designer for the project
    const { data: project } = await supabase
      .from("client_projects")
      .select("id, accepted_designer_id, tip_total")
      .eq("id", projectId)
      .maybeSingle();

    if (!project) {
      return new Response(JSON.stringify({ success: false, error: "project_not_found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Insert tip
    await supabase.from("project_tips").insert({
      project_id: projectId,
      designer_id: project.accepted_designer_id,
      client_email: clientEmail || null,
      client_name: clientName || null,
      amount: amountInGhs,
      currency: "GHS",
      transaction_id: reference,
      status: "completed",
      message: message || null,
    });

    // Update running total
    await supabase
      .from("client_projects")
      .update({ tip_total: Number(project.tip_total || 0) + amountInGhs, updated_at: new Date().toISOString() })
      .eq("id", projectId);

    return new Response(JSON.stringify({ success: true, amount: amountInGhs }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err) {
    console.error("verify-tip error:", err);
    return new Response(JSON.stringify({ success: false, error: "server_error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
