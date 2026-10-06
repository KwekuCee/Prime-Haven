// Shared Korapay Mobile Money disbursement used by request-withdrawal (automatic)
// and approve-withdrawal (admin). Claiming is atomic in the database, so the same
// withdrawal can never be sent twice.
// deno-lint-ignore-file no-explicit-any

const PROVIDER_MAP: Record<string, string> = { mtn: "MTN", vodafone: "VOD", airteltigo: "ATL" };

export type PayoutResult = { ok: boolean; status: string; message: string; reference: string; httpStatus: number };

export const korapayConfigured = () => !!Deno.env.get("KORAPAY_SECRET_KEY");

/** Ask Korapay what happened to a payout reference: success | processing | failed | not_found | unknown */
export async function checkKorapayPayout(reference: string): Promise<string> {
  const key = Deno.env.get("KORAPAY_SECRET_KEY");
  if (!key || !reference) return "unknown";
  try {
    const resp = await fetch(`https://api.korapay.com/merchant/api/v1/transactions/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const j = await resp.json().catch(() => ({}));
    if (resp.status === 404 || /not found/i.test(String(j?.message || ""))) return "not_found";
    const s = String(j?.data?.status || "").toLowerCase();
    if (s === "success" || s === "successful") return "success";
    if (s === "failed" || s === "reversed" || s === "cancelled") return "failed";
    if (s === "processing" || s === "pending") return "processing";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/** Claim the withdrawal, send the Mobile Money payout through Korapay and record the result. */
export async function disburseWithdrawal(admin: any, withdrawalId: string, actorId: string | null): Promise<PayoutResult> {
  const key = Deno.env.get("KORAPAY_SECRET_KEY") || "";
  const { data: w } = await admin
    .from("withdrawals")
    .select("id, user_id, amount, currency, status, korapay_reference, payout_method:user_payout_methods(provider, phone_number, account_name)")
    .eq("id", withdrawalId)
    .maybeSingle();
  if (!w) return { ok: false, status: "not_found", message: "Could not locate withdrawal request.", reference: "", httpStatus: 404 };
  const method = w.payout_method;
  if (!method) return { ok: false, status: w.status, message: "No Mobile Money payout method saved.", reference: "", httpStatus: 400 };
  if (!key) return { ok: false, status: w.status, message: "Korapay is not configured.", reference: "", httpStatus: 400 };

  const fallbackRef = w.korapay_reference || `ph_wd_${Date.now()}_${String(w.user_id).replace(/-/g, "").slice(0, 8)}`;
  const { data: claim, error: claimError } = await admin.rpc("claim_withdrawal_for_payout_service", { p_withdrawal_id: withdrawalId, p_reference: fallbackRef });
  if (claimError) return { ok: false, status: "processing", message: claimError.message, reference: fallbackRef, httpStatus: 409 };
  const reference = (claim as { reference?: string } | null)?.reference || fallbackRef;

  const { data: profile } = await admin.from("profiles").select("email").eq("id", w.user_id).maybeSingle();
  const amount = Number(w.amount);

  // A failed retry may reuse a reference Korapay already paid — never send twice.
  if (w.korapay_reference) {
    const prior = await checkKorapayPayout(reference);
    if (prior === "success" || prior === "processing") {
      await admin.rpc("finalise_withdrawal_payout_service", { p_withdrawal_id: withdrawalId, p_admin_id: actorId, p_status: "success", p_gateway: "Korapay", p_reference: reference });
      return { ok: true, status: "success", message: "Korapay had already sent this payout; it is now recorded as paid.", reference, httpStatus: 200 };
    }
  }

  let ok = false;
  let message = "";
  try {
    const resp = await fetch("https://api.korapay.com/merchant/api/v1/transactions/disburse", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        reference,
        destination: {
          type: "mobile_money",
          amount,
          currency: w.currency || "GHS",
          narration: `Prime Haven withdrawal for ${method.account_name}`,
          mobile_money: { operator: PROVIDER_MAP[method.provider] || String(method.provider).toUpperCase(), mobile_number: method.phone_number },
          customer: { name: method.account_name, email: profile?.email || "designer@primehaven.tech" },
        },
      }),
    });
    const j = await resp.json().catch(() => ({}));
    const ks = String(j?.data?.status || "");
    ok = resp.ok && (j?.status === true || ks === "success" || ks === "processing");
    message = j?.message || `HTTP ${resp.status}`;
    console.log("Korapay disburse response:", JSON.stringify(j));
  } catch (e) {
    message = String((e as Error).message);
    console.error("Korapay error:", e);
  }

  if (!ok) {
    await admin.from("withdrawals").update({ status: "failed", failure_reason: message.slice(0, 500), processed_at: new Date().toISOString() }).eq("id", withdrawalId).eq("status", "processing");
    await admin.from("system_logs").insert({
      admin_id: actorId,
      action_type: "withdrawal_payout_failed",
      description: `Korapay payout failed for withdrawal ${withdrawalId}: ${message}`.slice(0, 400),
      new_value: { withdrawal_id: withdrawalId, amount, reference },
    });
    return { ok: false, status: "failed", message, reference, httpStatus: 502 };
  }

  const { error: finErr } = await admin.rpc("finalise_withdrawal_payout_service", { p_withdrawal_id: withdrawalId, p_admin_id: actorId, p_status: "success", p_gateway: "Korapay", p_reference: reference });
  if (finErr) throw finErr;
  return { ok: true, status: "success", message: `GH₵${amount.toFixed(2)} sent to ${method.phone_number}.`, reference, httpStatus: 200 };
}
