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

function isWithdrawalDay(): boolean {
  // Ghana is UTC+0, so UTC date == local date
  return new Date().getUTCDate() === 30;
}

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
    const userId = claimsData.claims.sub as string;

    if (!isWithdrawalDay()) {
      return new Response(JSON.stringify({ error: "withdrawals_closed", message: "Withdrawals are only available on the 30th of each month." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);
    const payoutMethodId = String(body?.payout_method_id || "");
    if (!Number.isFinite(amount) || amount < 100) {
      return new Response(JSON.stringify({ error: "invalid_amount", message: "Minimum withdrawal is GH₵100." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!payoutMethodId) {
      return new Response(JSON.stringify({ error: "missing_payout_method" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Payout method
    const { data: method, error: methodErr } = await admin
      .from("user_payout_methods")
      .select("id, user_id, provider, phone_number, account_name")
      .eq("id", payoutMethodId)
      .eq("user_id", userId)
      .maybeSingle();
    if (methodErr || !method) {
      return new Response(JSON.stringify({ error: "payout_method_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Compute available balance: salary_estimated - sum(pending|processing|success withdrawals)
    const { data: dd } = await admin
      .from("designer_details")
      .select("salary_estimated")
      .eq("user_id", userId)
      .maybeSingle();
    const earned = Number(dd?.salary_estimated || 0);

    const { data: wdRows } = await admin
      .from("withdrawals")
      .select("amount, status")
      .eq("user_id", userId);
    const lockedOrPaid = (wdRows || []).filter(w => w.status !== "failed").reduce((s, w) => s + Number(w.amount || 0), 0);
    const available = earned - lockedOrPaid;
    if (amount > available) {
      return new Response(JSON.stringify({ error: "insufficient_balance", available }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const reference = `ph_wd_${Date.now()}_${userId.slice(0, 8)}`;

    // Insert pending withdrawal row first
    const { data: wd, error: wdErr } = await admin
      .from("withdrawals")
      .insert({
        user_id: userId,
        payout_method_id: payoutMethodId,
        amount,
        currency: "GHS",
        status: "processing",
        korapay_reference: reference,
      })
      .select("id")
      .single();
    if (wdErr) {
      return new Response(JSON.stringify({ error: "db_insert_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Call Korapay disbursement (Mobile Money)
    const payload = {
      reference,
      destination: {
        type: "mobile_money",
        amount,
        currency: "GHS",
        narration: `Prime Haven withdrawal for ${method.account_name}`,
        mobile_money: {
          operator: PROVIDER_MAP[method.provider],
          mobile_number: method.phone_number,
        },
        customer: {
          name: method.account_name,
          email: (claimsData.claims.email as string) || "designer@primehaven.tech",
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
      const j = await resp.json().catch(() => ({}));
      korapayOk = resp.ok && (j?.status === true || j?.data?.status === "success" || j?.data?.status === "processing");
      korapayMessage = j?.message || `HTTP ${resp.status}`;
      console.log("Korapay disburse response:", JSON.stringify(j));
    } catch (e) {
      korapayMessage = String((e as Error).message);
      console.error("Korapay error:", e);
    }

    if (!korapayOk) {
      await admin.from("withdrawals").update({
        status: "failed",
        failure_reason: korapayMessage.slice(0, 500),
        processed_at: new Date().toISOString(),
      }).eq("id", wd.id);
      return new Response(JSON.stringify({ error: "payout_failed", message: korapayMessage }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, withdrawal_id: wd.id, reference }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("request-withdrawal error:", e);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
