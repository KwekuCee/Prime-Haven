import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withCors } from "../_shared/cors.ts";
import { checkKorapayPayout, disburseWithdrawal, korapayConfigured } from "../_shared/korapayPayout.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(withCors(async (req) => {
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
      .in("role", ["superadmin", "masteradmin"])
      .limit(1);
    if (!roleData?.length) {
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

    const reference = withdrawal.korapay_reference || `ph_wd_${Date.now()}_${withdrawal.user_id.replace(/-/g, "").slice(0, 8)}`;

    // --- Manual (paid outside Korapay) ---
    if (mode === "manual") {
      let claimedReference = reference;
      if (withdrawal.status === "processing" || (withdrawal.status === "failed" && withdrawal.korapay_reference)) {
        // Before paying by hand, make sure Korapay did not already send this money.
        const k = await checkKorapayPayout(reference);
        if (k === "success") {
          const { error } = await admin.rpc("finalise_withdrawal_payout_service", { p_withdrawal_id: withdrawalId, p_admin_id: adminUserId, p_status: "success", p_gateway: "Korapay", p_reference: reference });
          if (error && withdrawal.status === "processing") throw error;
          if (withdrawal.status === "processing") return json({ success: true, status: "success", message: "Korapay already paid this withdrawal, so it is now recorded as paid. No manual payment needed." });
          return json({ error: "already_paid", message: "Korapay already paid this withdrawal. Do not pay it manually." }, 409);
        }
        if (k === "processing" || (k === "unknown" && withdrawal.status === "processing")) {
          return json({ error: "korapay_in_progress", message: "Korapay is still sending this payout (or could not be reached). Wait a few minutes and check again before paying manually." }, 409);
        }
      }
      if (withdrawal.status !== "processing") {
        const { data: claimData, error: claimError } = await admin.rpc("claim_withdrawal_for_payout_service", { p_withdrawal_id: withdrawalId, p_reference: reference });
        if (claimError) return json({ error: "already_processing", message: claimError.message }, 409);
        claimedReference = (claimData as { reference?: string } | null)?.reference || reference;
      }
      const { error: finaliseError } = await admin.rpc("finalise_withdrawal_payout_service", {
        p_withdrawal_id: withdrawalId, p_admin_id: adminUserId, p_status: "approved",
        p_gateway: "Manual Transfer", p_reference: claimedReference,
      });
      if (finaliseError) return json({ error: "already_finalised", message: finaliseError.message }, 409);
      return json({ success: true, withdrawal_id: withdrawalId, reference: claimedReference, status: "approved", message: "Marked as paid manually." });
    }

    // --- Korapay disbursement ---
    if (!korapayConfigured()) {
      return json({ error: "korapay_not_configured", message: "Korapay is not configured. Use 'Pay manually' instead." }, 400);
    }
    const result = await disburseWithdrawal(admin, withdrawalId, adminUserId);
    if (!result.ok) return json({ error: "payout_failed", message: `Korapay could not send the payout: ${result.message}` }, result.httpStatus);
    return json({ success: true, withdrawal_id: withdrawalId, reference: result.reference, status: result.status, message: result.message });
  } catch (e) {
    console.error("approve-withdrawal error:", e);
    return json({ error: "server_error", message: (e as Error).message || "Internal server error" }, 500);
  }
}));
