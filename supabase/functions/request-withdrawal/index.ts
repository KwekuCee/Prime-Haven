import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, FROM_ADDRESS } from "../_shared/resend.ts";
import { withCors } from "../_shared/cors.ts";
import { disburseWithdrawal, korapayConfigured } from "../_shared/korapayPayout.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;


const CEO_EMAIL = "primehaven26@gmail.com";
const MIN_WITHDRAWAL = 100;

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "unauthorized", message: "You must be signed in." }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes, error: authErr } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !userRes?.user) {
      return json({ error: "unauthorized", message: "Your session has expired. Please sign in again." }, 401);
    }
    const userId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const requestedAmount = Number(body?.amount);
    const payoutMethodId = String(body?.payout_method_id || "");

    if (!payoutMethodId) {
      return json({ error: "missing_payout_method", message: "Select a Mobile Money payout method first." }, 400);
    }

    const { data: dd } = await admin
      .from("designer_details")
      .select("salary_estimated, professional_title")
      .eq("user_id", userId)
      .maybeSingle();
    const amountInput = Number.isFinite(requestedAmount) && requestedAmount > 0 ? requestedAmount : null;
    const { data: withdrawalResult, error: requestError } = await admin.rpc("request_talent_withdrawal_service", {
      p_user_id: userId, p_payout_method_id: payoutMethodId, p_amount: amountInput,
    });
    if (requestError || !withdrawalResult) {
      const message = requestError?.message || "Could not save your withdrawal request.";
      return json({ error: "withdrawal_not_created", message }, message.includes("security hold") || message.includes("Minimum") || message.includes("already open") || message.includes("Insufficient") ? 400 : 500);
    }
    const result = withdrawalResult as { id: string; amount: number; created_at: string; reference: string; provider: string; phone_number: string; account_name: string };
    const wd = { id: result.id, amount: result.amount, created_at: result.created_at };
    const amount = Number(result.amount);
    const reference = result.reference;
    const method = { provider: result.provider, phone_number: result.phone_number, account_name: result.account_name };

    // Requester profile for the alert email
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    // Audit trail
    await admin.from("system_logs").insert({
      admin_id: userId,
      action_type: "withdrawal_requested",
      description: `${profile?.full_name || "A talent"} requested a withdrawal of GH₵${amount.toFixed(2)}`,
      new_value: { withdrawal_id: wd.id, amount, reference, payout_method: method.provider },
    });

    // Send the money straight to the saved Mobile Money number through Korapay.
    let payout: { ok: boolean; status: string; message: string } = { ok: false, status: "pending", message: "Korapay is not configured" };
    if (korapayConfigured()) {
      try {
        payout = await disburseWithdrawal(admin, wd.id, null);
      } catch (e) {
        console.error("auto payout error:", e);
        payout = { ok: false, status: "processing", message: (e as Error).message };
      }
    }

    // Alert the CEO
    let emailSent = false;
    if (Deno.env.get("RESEND_API_KEY")) {
      try {

        const html = `
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px;font-family:Arial,Helvetica,sans-serif">
          <tr><td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#000;border-radius:14px;overflow:hidden">
              <tr><td style="padding:22px 26px;border-bottom:1px solid #222">
                <span style="color:#fe4c18;font-size:18px;font-weight:bold">Prime Haven</span>
                <span style="color:#888;font-size:12px"> &nbsp;• &nbsp;Withdrawal Request</span>
              </td></tr>
              <tr><td style="padding:26px;color:#eaeaea;font-size:14px;line-height:1.6">
                <p style="margin:0 0 14px">${payout.ok ? "A talent withdrawal was paid automatically through Korapay." : "A talent withdrawal could not be paid automatically and needs your attention (" + esc(payout.message) + ")."}</p>
                <table width="100%" cellpadding="8" cellspacing="0" style="background:#0d0d0d;border-radius:10px;font-size:13px;color:#ddd">
                  <tr><td style="color:#888">Talent</td><td align="right"><strong>${esc(profile?.full_name || "Unknown")}</strong></td></tr>
                  <tr><td style="color:#888">Email</td><td align="right">${esc(profile?.email || "—")}</td></tr>
                  <tr><td style="color:#888">Role</td><td align="right">${esc(dd?.professional_title || "Platform Talent")}</td></tr>
                  <tr><td style="color:#888">Amount</td><td align="right"><strong style="color:#4ade80">GH₵ ${amount.toFixed(2)}</strong></td></tr>
                  <tr><td style="color:#888">Payout</td><td align="right">${esc(method.provider.toUpperCase())} • ${esc(method.phone_number)} (${esc(method.account_name)})</td></tr>
                  <tr><td style="color:#888">Reference</td><td align="right">${esc(reference)}</td></tr>
                </table>
                <p style="margin:20px 0 0">
                  <a href="https://primehaven.tech/superadmin/finance" style="background:#fe4c18;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;display:inline-block">Review in Finance Hub</a>
                </p>
              </td></tr>
              <tr><td style="padding:16px 26px;border-top:1px solid #222;color:#666;font-size:11px">Automated alert from primehaven.tech</td></tr>
            </table>
          </td></tr>
        </table>`;

        await sendEmail({
          from: FROM_ADDRESS,
          to: CEO_EMAIL,
          subject: `${payout.ok ? "Withdrawal paid" : "Withdrawal needs attention"}: GH₵${amount.toFixed(2)} — ${profile?.full_name || "Talent"}`,
          html,
        });
        emailSent = true;
      } catch (e) {
        console.error("CEO alert email failed:", e);
      }
    }

    return json({
      success: true,
      withdrawal_id: wd.id,
      amount,
      reference,
      email_sent: emailSent,
      paid: payout.ok,
      status: payout.status,
      message: payout.ok
        ? `GH₵${amount.toFixed(2)} has been sent to your ${method.provider.toUpperCase()} number ${method.phone_number}.`
        : `Withdrawal of GH₵${amount.toFixed(2)} received. It couldn't be sent automatically, so the team will pay it shortly.`,
    });
  } catch (e) {
    console.error("request-withdrawal error:", e);
    return json({ error: "server_error", message: (e as Error).message || "Internal server error" }, 500);
  }
}));
