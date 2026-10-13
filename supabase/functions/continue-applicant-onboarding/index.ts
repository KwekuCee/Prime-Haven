// Emails an existing applicant their private onboarding portal link.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { json, EMAIL_RE, escapeHtml, safePublicOrigin, limited } from "../_shared/applicants.ts";
import { APPLICATIONS_ADDRESS, sendEmail } from "../_shared/resend.ts";
import { withCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const GENERIC_RESPONSE = {
  success: true,
  message: "If an application can continue with this address, we sent a secure onboarding link.",
};

serve(withCors(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const fullName = String(body.fullName || "").trim().replace(/\s+/g, " ").slice(0, 200);
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim().slice(0, 40);
    const phoneDigits = phone.replace(/\D/g, "");
    if (fullName.length < 2 || !EMAIL_RE.test(email) || email.length > 255 || phoneDigits.length < 7) {
      return json({ success: false, error: "invalid_details", message: "Enter your full name, a valid email, and a valid contact number." }, 400);
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const emailLimited = await limited(supabase, "applicant_continue_email", email);
    const ipLimited = await limited(supabase, "applicant_continue_ip", ip);
    if (emailLimited || ipLimited) {
      return json({ success: false, error: "rate_limited", message: "Please wait before requesting another link." }, 429);
    }

    const { data: applicant, error } = await supabase
      .from("applicants")
      .select("full_name, email, phone, status, access_token")
      .eq("email", email)
      .maybeSingle();
    if (error) {
      console.error("Applicant continuation lookup failed:", error);
      return json({ success: false, error: "lookup_failed", message: "We could not send your link. Please try again." }, 500);
    }

    const nameMatches = applicant?.full_name.trim().replace(/\s+/g, " ").toLowerCase() === fullName.toLowerCase();
    const savedPhoneDigits = String(applicant?.phone || "").replace(/\D/g, "");
    const phoneMatches = !savedPhoneDigits || savedPhoneDigits === phoneDigits;
    if (
      !applicant ||
      !nameMatches ||
      !phoneMatches ||
      !["invited", "in_review", "passed", "paid", "active"].includes(applicant.status)
    ) {
      return json(GENERIC_RESPONSE);
    }

    const origin = safePublicOrigin(req.headers.get("origin"));
    const link = `${origin}/applicant/${applicant.access_token}`;
    const safeName = escapeHtml(applicant.full_name);
    const safeLink = escapeHtml(link);

    try {
      await sendEmail({
        from: APPLICATIONS_ADDRESS,
        to: applicant.email,
        subject: "Continue your Prime Haven onboarding",
        html: `
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
            <tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
              <tr><td style="background:#0b0b0d;padding:24px 32px;color:#ffffff;font-size:18px;font-weight:bold;">Prime Haven</td></tr>
              <tr><td style="padding:32px;color:#1a1a1a;font-size:15px;line-height:1.6;">
                <p>Hi ${safeName},</p>
                <p>Use your private link to continue your Prime Haven talent onboarding.</p>
                <p style="margin:24px 0;"><a href="${safeLink}" style="background:#fe4c18;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold;display:inline-block;">Continue onboarding</a></p>
                <p style="font-size:13px;color:#666;">This link is personal to you — please don't share it.</p>
              </td></tr>
              <tr><td style="padding:20px 32px;background:#f6f6f7;color:#888;font-size:12px;">Prime Haven · primehaven.tech</td></tr>
            </table></td></tr>
          </table>`,
      });
    } catch (mailError) {
      console.error("Applicant continuation email failed:", mailError);
      return json({ success: false, error: "email_failed", message: "We could not send your link. Please try again." }, 502);
    }

    return json(GENERIC_RESPONSE);
  } catch (err) {
    console.error("continue-applicant-onboarding error:", err);
    return json({ success: false, error: "unexpected_error" }, 500);
  }
}));
