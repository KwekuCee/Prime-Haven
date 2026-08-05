import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KORAPAY_SECRET_KEY = Deno.env.get("KORAPAY_SECRET_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROVIDER_MAP: Record<string, string> = {
  mtn: "MTN",
  vodafone: "VOD",
  airteltigo: "ATL",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized", message: "Sign in required." }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes, error: authErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !userRes?.user) return json({ error: "unauthorized", message: "Session expired." }, 401);
    const adminUserId = userRes.user.id;

    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .maybeSingle();
    if (!roleData || !["superadmin", "masteradmin"].includes(String(roleData.role))) {
      return json({ error: "forbidden", message: "Only superadmins can approve withdrawals." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const withdrawalId = String(body?.withdrawal_id || "");
    // "korapay" = disburse automatically, "manual" = the admin already paid by bank/cash
    const mode = body?.mode === "manual" ? "manual" : "korapay";
    if (!withdrawalId) return json({ error: "missing_withdrawal_id", message: "Withdrawal record is required." }, 400);

    const { data: withdrawal } = await admin
      .from("withdrawals")
      .select(
        "id, user_id, amount, currency, status, payout_method_id, korapay_reference, payout_method:user_payout_methods(provider, phone_number, account_name)",
      )
      .eq("id", withdrawalId)
      .maybeSingle();

    if (!withdrawal) return json({ error: "withdrawal_not_found", message: "Could not locate withdrawal request." }, 404);
    if (!["pending", "processing", "failed"].includes(String(withdrawal.status))) {
      return json({ error: "invalid_status", message: `This withdrawal is already ${withdrawal.status}.` }, 400);
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", withdrawal.user_id)
      .maybeSingle();

    const amount = Number(withdrawal.amount);
    const reference = withdrawal.korapay_reference || `ph_wd_${Date.now()}_${withdrawal.user_id.slice(0, 8)}`;

    const finalise = async (status: string, gateway: string) => {
      await admin
        .from("withdrawals")
        .update({ status, korapay_reference: reference, processed_at: new Date().toISOString(), failure_reason: null })
        .eq("id", withdrawalId);

      // Accurate transaction record in the ledger
      await admin.from("payments").insert({
        user_id: withdrawal.user_id,
        amount,
        type: "withdrawal",
        status: "completed",
        transaction_id: reference,
        payment_gateway: gateway,
        processed_by_admin_id: adminUserId,
        payment_details: {
          withdrawal_id: withdrawalId,
          mode,
          provider: (withdrawal as any).payout_method?.provider || null,
          phone_number: (withdrawal as any).payout_method?.phone_number || null,
        },
      });

      // Points + estimated salary reset for the new cycle
      await admin
        .from("designer_details")
        .update({
          salary_estimated: 0,
          monthly_points: 0,
          total_points: 0,
          salary_payment_status: "paid",
          salary_paid_at: new Date().toISOString(),
          salary_paid_by: adminUserId,
        })
        .eq("user_id", withdrawal.user_id);

      await admin.from("notifications").insert({
        user_id: withdrawal.user_id,
        title: "Withdrawal Paid",
        message:
          mode === "manual"
            ? `Your withdrawal of GH₵${amount.toFixed(2)} has been paid manually by Prime Haven. Your accumulated points have been reset for the new cycle.`
            : `Your withdrawal of GH₵${amount.toFixed(2)} has been sent to your Mobile Money account via Korapay. Your accumulated points have been reset for the new cycle.`,
        type: "payment",
        link: "/payments",
      });

      await admin.from("system_logs").insert({
        admin_id: adminUserId,
        action_type: "withdrawal_approved",
        description: `Approved withdrawal of GH₵${amount.toFixed(2)} for ${profile?.full_name || withdrawal.user_id} (${mode})`,
        new_value: { withdrawal_id: withdrawalId, amount, mode, reference, status },
      });
    };

    // --- Manual (paid outside Korapay) ---
    if (mode === "manual") {
      await finalise("approved", "Manual Transfer");
      return json({ success: true, withdrawal_id: withdrawalId, reference, status: "approved", message: "Marked as approved and paid manually." });
    }

    // --- Korapay disbursement ---
    const payoutMethod = (withdrawal as any).payout_method;
    if (!payoutMethod) {
      return json({ error: "missing_payout_method", message: "This talent has no Mobile Money payout method saved." }, 400);
    }
    if (!KORAPAY_SECRET_KEY) {
      return json({ error: "korapay_not_configured", message: "Korapay is not configured. Use 'Mark Paid Manually' instead." }, 400);
    }

    await admin
      .from("withdrawals")
      .update({ status: "processing", korapay_reference: reference })
      .eq("id", withdrawalId);

    const payload = {
      reference,
      destination: {
        type: "mobile_money",
        amount,
        currency: withdrawal.currency || "GHS",
        narration: `Prime Haven withdrawal for ${payoutMethod.account_name}`,
        mobile_money: {
          operator: PROVIDER_MAP[payoutMethod.provider] || String(payoutMethod.provider).toUpperCase(),
          mobile_number: payoutMethod.phone_number,
        },
        customer: {
          name: payoutMethod.account_name,
          email: profile?.email || "designer@primehaven.tech",
        },
      },
    };

    let ok = false;
    let message = "";
    let korapayStatus = "";
    try {
      const resp = await fetch("https://api.korapay.com/merchant/api/v1/transactions/disburse", {
        method: "POST",
        headers: { Authorization: `Bearer ${KORAPAY_SECRET_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await resp.json().catch(() => ({}));
      korapayStatus = j?.data?.status || "";
      ok = resp.ok && (j?.status === true || korapayStatus === "success" || korapayStatus === "processing");
      message = j?.message || `HTTP ${resp.status}`;
      console.log("Korapay disburse response:", JSON.stringify(j));
    } catch (e) {
      message = String((e as Error).message);
      console.error("Korapay error:", e);
    }

    if (!ok) {
      await admin
        .from("withdrawals")
        .update({ status: "failed", failure_reason: message.slice(0, 500), processed_at: new Date().toISOString() })
        .eq("id", withdrawalId);
      await admin.from("system_logs").insert({
        admin_id: adminUserId,
        action_type: "withdrawal_payout_failed",
        description: `Korapay payout failed for withdrawal ${withdrawalId}: ${message}`.slice(0, 400),
        new_value: { withdrawal_id: withdrawalId, amount, reference },
      });
      return json({ error: "payout_failed", message: `Korapay declined the payout: ${message}. You can still mark it paid manually.` }, 502);
    }

    await finalise(korapayStatus === "processing" ? "processing" : "success", "Korapay");

    return json({
      success: true,
      withdrawal_id: withdrawalId,
      reference,
      status: korapayStatus === "processing" ? "processing" : "success",
      message: `Korapay payout of GH₵${amount.toFixed(2)} sent to ${payoutMethod.phone_number}.`,
    });
  } catch (e) {
    console.error("approve-withdrawal error:", e);
    return json({ error: "server_error", message: (e as Error).message || "Internal server error" }, 500);
  }
});
