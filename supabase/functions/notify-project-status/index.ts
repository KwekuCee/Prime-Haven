import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6";
import { createClient } from "npm:@supabase/supabase-js@2";

const SMTP_HOST = Deno.env.get("SMTP_HOST");
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  review: "Under Review",
  completed: "Completed",
  on_hold: "On Hold",
};

function buildStatusEmailHtml(
  clientName: string,
  projectTitle: string,
  status: string,
  progress: number,
  trackingLink: string,
): string {
  const statusLabel = statusLabels[status] || status;
  const statusColor = status === "completed" ? "#22c55e" : status === "on_hold" ? "#f97316" : "#fe4c18";

  return [
    '<!DOCTYPE html>',
    '<html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>Project Update - Prime Haven</title>',
    '</head>',
    '<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,Helvetica,sans-serif;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">',
    '<tr><td align="center">',
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#141414;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">',
    '<tr><td style="height:4px;background:linear-gradient(90deg,#fe4c18,#ff7a45,#fe4c18);"></td></tr>',
    '<tr><td align="center" style="padding:40px 40px 20px;">',
    '<img src="https://kbxijzsrywcwnyvtbruh.supabase.co/storage/v1/object/public/email-assets/prime-haven-logo.png?v=1" alt="Prime Haven" width="140" style="display:block;max-width:140px;height:auto;" />',
    '</td></tr>',
    '<tr><td align="center" style="padding:0 40px;">',
    '<span style="display:inline-block;background-color:rgba(254,76,24,0.15);border:1px solid rgba(254,76,24,0.3);color:#fe4c18;padding:6px 16px;border-radius:50px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">PROJECT UPDATE</span>',
    '</td></tr>',
    '<tr><td align="center" style="padding:16px 40px 4px;">',
    '<h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;">',
    'Hello, <span style="color:#fe4c18;">', clientName, '</span>!</h1>',
    '</td></tr>',
    '<tr><td align="center" style="padding:0 40px 24px;">',
    '<p style="margin:0;font-size:15px;color:#888888;">Your project has been updated</p>',
    '</td></tr>',
    '<tr><td style="padding:0 40px;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(254,76,24,0.08);border:1px solid rgba(254,76,24,0.2);border-radius:12px;">',
    '<tr><td style="padding:28px 24px;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">',
    '<tr><td style="padding:8px 0;"><span style="color:#888;font-size:13px;">Project:</span></td>',
    '<td style="padding:8px 0;text-align:right;"><span style="color:#fff;font-size:14px;font-weight:700;">', projectTitle, '</span></td></tr>',
    '<tr><td style="padding:8px 0;"><span style="color:#888;font-size:13px;">Status:</span></td>',
    '<td style="padding:8px 0;text-align:right;"><span style="color:', statusColor, ';font-size:14px;font-weight:700;">', statusLabel, '</span></td></tr>',
    '<tr><td style="padding:8px 0;"><span style="color:#888;font-size:13px;">Progress:</span></td>',
    '<td style="padding:8px 0;text-align:right;"><span style="color:#fff;font-size:14px;font-weight:700;">', String(progress), '%</span></td></tr>',
    '</table>',
    '<div style="margin-top:16px;background-color:#2a2a2a;border-radius:8px;height:8px;overflow:hidden;">',
    '<div style="background-color:#fe4c18;height:100%;width:', String(progress), '%;border-radius:8px;"></div>',
    '</div>',
    '</td></tr></table>',
    '</td></tr>',
    '<tr><td align="center" style="padding:28px 40px;">',
    '<a href="', trackingLink, '" target="_blank" style="display:inline-block;background-color:#fe4c18;color:#000000;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:700;font-size:16px;letter-spacing:0.5px;">Track Your Project</a>',
    '</td></tr>',
    '<tr><td style="padding:0 40px 28px;">',
    '<hr style="border:none;height:1px;background-color:#2a2a2a;margin:0;" />',
    '</td></tr>',
    '<tr><td align="center" style="padding:0 40px 40px;">',
     '<p style="margin:0 0 8px;font-size:12px;color:#555555;">Questions? Contact us at ',
    '<a href="mailto:primehaven26@gmail.com" style="color:#fe4c18;text-decoration:none;">primehaven26@gmail.com</a></p>',
    '<p style="margin:12px 0 0;font-size:11px;color:#fe4c18;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Making IT Dreams a Reality</p>',
    '<p style="margin:8px 0 0;font-size:12px;color:#555555;">&copy; 2026 Prime Haven.</p>',
    '</td></tr>',
    '</table></td></tr></table>',
    '</body></html>',
  ].join('');
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return new Response(
        JSON.stringify({ success: false, error: "project_id_required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("client_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ success: false, error: "project_not_found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!project.client_email) {
      return new Response(
        JSON.stringify({ success: false, error: "no_client_email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const trackingLink = `https://primehaven.lovable.app/track/${project.tracking_token}`;

    const html = buildStatusEmailHtml(
      project.client_name,
      project.title,
      project.status,
      project.progress_percentage,
      trackingLink,
    );

    const plainText = [
      `Hello ${project.client_name},`,
      '',
      `Your project "${project.title}" has been updated.`,
      `Status: ${statusLabels[project.status] || project.status}`,
      `Progress: ${project.progress_percentage}%`,
      '',
      `Track your project here: ${trackingLink}`,
      '',
      'Questions? team@primehaven.tech',
      '© 2026 Prime Haven',
    ].join('\n');

    const fromAddress = (SMTP_USER || "").trim();
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: fromAddress, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: `Prime Haven <${fromAddress}>`,
      to: project.client_email,
      subject: `Project Update: ${project.title} - ${statusLabels[project.status] || project.status}`,
      html,
      text: plainText,
    });

    console.log("Project status email sent to:", project.client_email);

    return new Response(
      JSON.stringify({ success: true, message: "Status email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-project-status:", error);
    return new Response(
      JSON.stringify({ success: false, error: "email_send_failed" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
