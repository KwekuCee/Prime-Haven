import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SMTP_HOST = Deno.env.get("SMTP_HOST");
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");

const CEO_EMAIL = "primehaven26@gmail.com";
const MIN_WITHDRAWAL = 100;

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

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

serve(async (req) => {
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

    // Payout method must belong to the caller
    const { data: method } = await admin
      .from("user_payout_methods")
      .select("id, provider, phone_number, account_name")
      .eq("id", payoutMethodId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!method) {
      return json({ error: "payout_method_not_found", message: "That payout method could not be found on your account." }, 404);
    }

    // Earned salary
    const { data: dd } = await admin
      .from("designer_details")
      .select("salary_estimated, professional_title")
      .eq("user_id", userId)
      .maybeSingle();
    const earned = Number(dd?.salary_estimated || 0);

    // Amounts already requested / paid out are locked
    const { data: existing } = await admin
      .from("withdrawals")
      .select("amount, status")
      .eq("user_id", userId);
    const locked = (existing || [])
      .filter((w: any) => !["failed", "rejected", "cancelled"].includes(String(w.status)))
      .reduce((s: number, w: any) => s + Number(w.amount || 0), 0);

    const available = Math.max(0, earned - locked);

    // Rule 1: must have more than GH₵100 of salary available
    if (available < MIN_WITHDRAWAL) {
      return json(
        {
          error: "below_minimum",
          available,
          message: `You have less than GH₵${MIN_WITHDRAWAL} salary available (current balance GH₵${available.toFixed(2)}). Keep earning points — withdrawals unlock at GH₵${MIN_WITHDRAWAL}.`,
        },
        400,
      );
    }

    const amount = Number.isFinite(requestedAmount) && requestedAmount > 0 ? requestedAmount : available;
    if (amount < MIN_WITHDRAWAL) {
      return json({ error: "below_minimum", available, message: `Minimum withdrawal is GH₵${MIN_WITHDRAWAL}.` }, 400);
    }
    if (amount > available) {
      return json({ error: "insufficient_balance", available, message: `You can withdraw up to GH₵${available.toFixed(2)}.` }, 400);
    }

    // No duplicate open requests
    const { data: openReq } = await admin
      .from("withdrawals")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["pending", "processing"])
      .limit(1);
    if (openReq && openReq.length > 0) {
      return json({ error: "request_pending", message: "You already have a withdrawal request awaiting approval." }, 400);
    }

    const reference = `ph_wd_${Date.now()}_${userId.slice(0, 8)}`;

    const { data: wd, error: insertErr } = await admin
      .from("withdrawals")
      .insert({
        user_id: userId,
        payout_method_id: payoutMethodId,
        amount,
        currency: "GHS",
        status: "pending",
        korapay_reference: reference,
      })
      .select("id, amount, created_at")
      .single();

    if (insertErr || !wd) {
      console.error("withdrawal insert failed:", insertErr);
      return json({ error: "db_insert_failed", message: "Could not save your withdrawal request. Please try again." }, 500);
    }

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

    // Alert the CEO
    let emailSent = false;
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
        });

        const html = `
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px;font-family:Arial,Helvetica,sans-serif">
          <tr><td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#000;border-radius:14px;overflow:hidden">
              <tr><td style="padding:22px 26px;border-bottom:1px solid #222">
                <span style="color:#fe4c18;font-size:18px;font-weight:bold">Prime Haven</span>
                <span style="color:#888;font-size:12px"> &nbsp;• &nbsp;Withdrawal Request</span>
              </td></tr>
              <tr><td style="padding:26px;color:#eaeaea;font-size:14px;line-height:1.6">
                <p style="margin:0 0 14px">A talent has requested a withdrawal and is awaiting your approval.</p>
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

        await transporter.sendMail({
          from: `"Prime Haven" <${SMTP_USER}>`,
          to: CEO_EMAIL,
          subject: `Withdrawal request: GH₵${amount.toFixed(2)} — ${profile?.full_name || "Talent"}`,
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
      message: `Withdrawal request for GH₵${amount.toFixed(2)} submitted. The CEO has been notified for approval.`,
    });
  } catch (e) {
    console.error("request-withdrawal error:", e);
    return json({ error: "server_error", message: (e as Error).message || "Internal server error" }, 500);
  }
});
