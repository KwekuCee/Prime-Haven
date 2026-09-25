// @ts-nocheck
// Admin action: invite an applicant to the screening portal and email them their link.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, trackHasPractical, escapeHtml, safePublicOrigin, UUID_RE } from "../_shared/applicants.ts";
import { sendEmail, FROM_ADDRESS } from "../_shared/resend.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ success: false, error: "unauthorized" }, 401);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["superadmin", "masteradmin"]);
    if (!roles || roles.length === 0) return json({ success: false, error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const applicantId = String(body.applicantId || "");
    if (!UUID_RE.test(applicantId)) return json({ success: false, error: "invalid_request" }, 400);

    const { data: applicant, error: fetchErr } = await supabase
      .from("applicants")
      .select("id, full_name, email, track, status, access_token")
      .eq("id", applicantId)
      .maybeSingle();

    if (fetchErr || !applicant) return json({ success: false, error: "not_found" }, 404);

    const { error: updateErr } = await supabase
      .from("applicants")
      .update({ status: "invited", invited_at: new Date().toISOString() })
      .eq("id", applicantId);

    if (updateErr) {
      console.error("Invite update failed:", updateErr);
      return json({ success: false, error: "update_failed" }, 500);
    }

    const origin = safePublicOrigin(body.origin || req.headers.get("origin"));
    const link = `${origin}/applicant/${applicant.access_token}`;
    const safeName = escapeHtml(applicant.full_name);
    const safeTrack = escapeHtml(applicant.track);
    const safeLink = escapeHtml(link);

    let emailSent = false;
    try {

      const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#0b0b0d;padding:24px 32px;color:#ffffff;font-size:18px;font-weight:bold;">Prime Haven</td></tr>
      <tr><td style="padding:32px;color:#1a1a1a;font-size:15px;line-height:1.6;">
        <p style="margin:0 0 16px;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;">Good news — your application for <strong>${safeTrack}</strong> has moved forward. Your private screening portal is ready.</p>
        <p style="margin:0 0 16px;">Inside you'll watch a short intro video about Prime Haven and the registration fee, then take a short assessment for your track.</p>
        ${trackHasPractical(applicant.track) ? `<p style="margin:0 0 16px;"><strong>Heads-up:</strong> your assessment also includes a short practical exercise for ${safeTrack} — a small hands-on task you submit as a file or a link. Set aside a little time and have your usual tools ready.</p>` : ``}
        <p style="margin:24px 0;"><a href="${safeLink}" style="background:#fe4c18;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold;display:inline-block;">Open my screening portal</a></p>
        <p style="margin:0 0 8px;font-size:13px;color:#666;">This link is personal to you — please don't share it.</p>
        <p style="margin:0;font-size:13px;color:#666;">${safeLink}</p>
      </td></tr>
      <tr><td style="padding:20px 32px;background:#f6f6f7;color:#888;font-size:12px;">Prime Haven · primehaven.tech</td></tr>
    </table>
  </td></tr>
</table>`;

      await sendEmail({
        from: FROM_ADDRESS,
        to: applicant.email,
        subject: "You're invited to the Prime Haven screening",
        html,
      });
      emailSent = true;
    } catch (mailErr) {
      console.error("Invite email failed:", mailErr);
    }

    return json({ success: true, link, emailSent });
  } catch (err) {
    console.error("invite-applicant error:", err);
    return json({ success: false, error: "unexpected_error" }, 500);
  }
});
