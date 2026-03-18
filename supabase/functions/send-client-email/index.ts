import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Verify admin
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

    // Send email via SMTP
    const smtpHost = Deno.env.get("SMTP_HOST")!;
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER")!;
    const smtpPass = Deno.env.get("SMTP_PASS")!;

    const { SMTPClient } = await import("npm:emailjs@4.0.3");
    const client = new SMTPClient({
      user: smtpUser,
      password: smtpPass,
      host: smtpHost,
      port: smtpPort,
      ssl: true,
    });

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a0a; color: #e5e5e5;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #333;">
    <h2 style="color: #d4af37; margin: 0;">Prime Haven</h2>
  </div>
  <div style="padding: 30px 0;">
    <p style="margin-bottom: 10px;">Dear ${clientName || 'Client'},</p>
    <div style="line-height: 1.6; white-space: pre-wrap;">${body}</div>
  </div>
  <div style="text-align: center; padding: 20px 0; border-top: 1px solid #333; font-size: 12px; color: #888;">
    <p>Prime Haven Creative Studio</p>
    <p>team@primehaven.tech</p>
  </div>
</body>
</html>`;

    await client.sendAsync({
      from: `Prime Haven <${smtpUser}>`,
      to,
      subject,
      attachment: [{ data: htmlBody, alternative: true }],
    });

    // Log the action
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    await adminClient.from("system_logs").insert({
      action_type: "client_email_sent",
      admin_id: user.id,
      description: `Email sent to ${clientName || to}: "${subject}"`,
      timestamp: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Send client email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
