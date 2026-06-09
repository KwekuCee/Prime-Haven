import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const KORAPAY_SECRET_KEY = Deno.env.get("KORAPAY_SECRET_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROVIDER_MAP: Record<string, string> = {
  mtn: "MTN",
  vodafone: "VOD",
  airteltigo: "ATL",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminUserId = claimsData.claims.sub as string;
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .maybeSingle();

    if (roleError || !roleData || !["superadmin", "masteradmin"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "forbidden", message: "Only superadmins can approve withdrawals." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const withdrawalId = String(body?.withdrawal_id || "");
    if (!withdrawalId) {
      return new Response(JSON.stringify({ error: "missing_withdrawal_id", message: "Withdrawal record is required." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: withdrawal, error: withdrawalError } = await adminClient
      .from("withdrawals")
      .select(`id, user_id, amount, currency, status, payout_method_id, korapay_reference, payout_method:user_payout_methods(provider, phone_number, account_name)`)
      .eq("id", withdrawalId)
      .maybeSingle();

    if (withdrawalError || !withdrawal) {
      return new Response(JSON.stringify({ error: "withdrawal_not_found", message: "Could not locate withdrawal request." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: userProfileData } = await adminClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", withdrawal.user_id)
      .maybeSingle();

    if (withdrawal.status !== "pending") {
      return new Response(JSON.stringify({ error: "invalid_status", message: "Only pending withdrawals may be approved." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payoutMethod = withdrawal.payout_method;
    if (!payoutMethod) {
      return new Response(JSON.stringify({ error: "missing_payout_method", message: "Withdrawal payout method is missing." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userProfile = userProfileData || { full_name: "Designer", email: "designer@example.com" };
    const reference = withdrawal.korapay_reference || `ph_wd_${Date.now()}_${withdrawal.user_id.slice(0, 8)}`;

    await adminClient.from("withdrawals").update({ status: "processing", korapay_reference: reference, processed_at: new Date().toISOString() }).eq("id", withdrawalId);

    const payload = {
      reference,
      destination: {
        type: "mobile_money",
        amount: Number(withdrawal.amount),
        currency: withdrawal.currency || "GHS",
        narration: `Prime Haven withdrawal for ${payoutMethod.account_name}`,
        mobile_money: {
          operator: PROVIDER_MAP[payoutMethod.provider] || payoutMethod.provider.toUpperCase(),
          mobile_number: payoutMethod.phone_number,
        },
        customer: {
          name: payoutMethod.account_name,
          email: userProfile.email || "designer@primehaven.tech",
        },
      },
    };

    let korapayOk = false;
    let korapayMessage = "";
    try {
      const resp = await fetch("https://api.korapay.com/merchant/api/v1/transactions/disburse", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KORAPAY_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = await resp.json().catch(() => ({}));
      korapayOk = resp.ok && (json?.status === true || json?.data?.status === "success" || json?.data?.status === "processing");
      korapayMessage = json?.message || `HTTP ${resp.status}`;
      console.log("Korapay disburse response:", JSON.stringify(json));
      if (korapayOk && json?.data?.status === "success") {
        await adminClient.from("withdrawals").update({ status: "success", processed_at: new Date().toISOString() }).eq("id", withdrawalId);
      } else if (korapayOk) {
        await adminClient.from("withdrawals").update({ status: "processing", processed_at: new Date().toISOString() }).eq("id", withdrawalId);
      }
    } catch (e) {
      korapayMessage = String((e as Error).message);
      console.error("Korapay error:", e);
    }

    if (!korapayOk) {
      await adminClient.from("withdrawals").update({ status: "failed", failure_reason: korapayMessage.slice(0, 500), processed_at: new Date().toISOString() }).eq("id", withdrawalId);
      return new Response(JSON.stringify({ error: "payout_failed", message: korapayMessage }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, withdrawal_id: withdrawalId, reference }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("approve-withdrawal error:", e);
    return new Response(JSON.stringify({ error: "server_error", message: (e as Error).message || 'Internal server error' }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
