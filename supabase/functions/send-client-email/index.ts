import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatBodyHtml(text: string): string {
  return text
    .split('\n')
    .map(line => {
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return escaped.replace(
        /(https?:\/\/[^\s&]+)/g,
        '<a href="$1" style="color: #d4af37; text-decoration: underline; word-break: break-all;" target="_blank">View / Download</a>'
      );
    })
    .join('<br>');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    if (!roleData || !["superadmin", "masteradmin"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { to, subject, body, clientName } = await req.json();

    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const smtpHost = Deno.env.get("SMTP_HOST")!;
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER")!;
    const smtpPass = Deno.env.get("SMTP_PASS")!;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const formattedBody = formatBodyHtml(body);

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 0; background: #f5f5f5; color: #333;">
  <div style="background: #0a0a0a; padding: 30px 20px; text-align: center;">
    <h2 style="color: #d4af37; margin: 0; font-size: 24px; letter-spacing: 1px;">Prime Haven</h2>
    <p style="color: #888; font-size: 12px; margin: 8px 0 0;">Creative Studio</p>
  </div>
  <div style="background: #ffffff; padding: 32px 28px;">
    <p style="margin: 0 0 16px; font-size: 15px; color: #333;">Dear <strong>${clientName || 'Client'}</strong>,</p>
    <div style="line-height: 1.8; font-size: 14px; color: #444;">${formattedBody}</div>
  </div>
  <div style="background: #0a0a0a; text-align: center; padding: 24px 20px; font-size: 12px; color: #888;">
    <p style="margin: 0 0 6px;">Prime Haven Creative Studio</p>
    <p style="margin: 0;"><a href="mailto:primehaven26@gmail.com" style="color: #d4af37; text-decoration: none;">primehaven26@gmail.com</a></p>
    <p style="margin: 10px 0 0; color: #555;">© ${new Date().getFullYear()} Prime Haven. All rights reserved.</p>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `Prime Haven <${smtpUser}>`,
      to,
      subject,
      html: htmlBody,
      text: body,
    });

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    await adminClient.from("system_logs").insert({
      action_type: "client_email_sent",
      admin_id: user.id,
      description: `Email sent to ${clientName || to}: "${subject}"`,
      timestamp: new Date().toISOString(),
    });

    console.log(`✅ Email sent successfully to ${to}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Send client email error:", error);
    return new Response(JSON.stringify({ error: "email_send_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
