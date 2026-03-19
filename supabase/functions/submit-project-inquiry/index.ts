import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fullName, email, whatsapp, category, description, budget } = await req.json();

    if (!fullName || !email || !whatsapp || !category || !description) {
      throw new Error("Missing required fields");
    }

    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#111;border-radius:12px;overflow:hidden;">
  <tr><td style="padding:24px 30px;text-align:center;background:linear-gradient(135deg,#e8530e,#f59e0b);">
    <h1 style="color:#fff;margin:0;font-size:22px;">🚀 New Project Inquiry</h1>
  </td></tr>
  <tr><td style="padding:30px;">
    <table width="100%" cellpadding="8" cellspacing="0" style="color:#ccc;font-size:15px;">
      <tr><td style="color:#999;width:140px;vertical-align:top;">Full Name</td><td style="color:#fff;font-weight:bold;">${esc(fullName)}</td></tr>
      <tr><td style="color:#999;vertical-align:top;">Email</td><td><a href="mailto:${esc(email)}" style="color:#e8530e;">${esc(email)}</a></td></tr>
      <tr><td style="color:#999;vertical-align:top;">WhatsApp</td><td style="color:#fff;">${esc(whatsapp)}</td></tr>
      <tr><td style="color:#999;vertical-align:top;">Service</td><td style="color:#fff;">${esc(category)}</td></tr>
      <tr><td style="color:#999;vertical-align:top;">Budget</td><td style="color:#fff;">${budget ? esc(budget) : "Not specified"}</td></tr>
      <tr><td style="color:#999;vertical-align:top;">Description</td><td style="color:#fff;line-height:1.6;">${esc(description)}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:16px 30px;border-top:1px solid #222;text-align:center;">
    <p style="color:#666;font-size:12px;margin:0;">Sent from Prime Haven website project inquiry form</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get("SMTP_HOST")!,
        port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
        tls: true,
        auth: {
          username: Deno.env.get("SMTP_USER")!,
          password: Deno.env.get("SMTP_PASS")!,
        },
      },
    });

    await client.send({
      from: `Prime Haven <${Deno.env.get("SMTP_USER")}>`,
      to: "team@primehaven.tech",
      subject: `🚀 New Project Inquiry from ${fullName}`,
      content: `New project inquiry:\n\nName: ${fullName}\nEmail: ${email}\nWhatsApp: ${whatsapp}\nService: ${category}\nBudget: ${budget || "Not specified"}\nDescription: ${description}`,
      html: emailHtml,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Project inquiry error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to submit inquiry. Please try again or contact us directly." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
