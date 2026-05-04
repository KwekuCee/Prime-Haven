import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const SMTP_HOST = Deno.env.get("SMTP_HOST");
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function encodeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Require authenticated caller (the sender)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userRes, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !userRes?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const senderId = userRes.user.id;

    const body = await req.json();
    const receiverId: string = body?.receiverId;
    const rawContent: string = String(body?.content ?? "");
    if (!receiverId || typeof receiverId !== "string") {
      return new Response(JSON.stringify({ error: "Missing receiverId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Length limits
    const content = rawContent.slice(0, 2000);

    // Look up sender's display name server-side (do not trust client-provided senderName)
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", senderId)
      .single();
    const senderName = senderProfile?.full_name || senderProfile?.username || "A Prime Haven member";

    // Get receiver's email and name
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", receiverId)
      .single();

    if (profileError || !profile?.email) {
      console.error("Recipient profile not found:", profileError);
      return new Response(JSON.stringify({ error: "Recipient not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const safeSender = encodeHtml(senderName);
    const safeContent = encodeHtml(content);
    const safeFirstName = encodeHtml((profile.full_name || "there").split(" ")[0]);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Message on Prime Haven</title>
      </head>
      <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,Helvetica,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#141414;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">
                <tr><td style="height:4px;background:linear-gradient(90deg,#fe4c18,#ff7a45,#fe4c18);"></td></tr>
                <tr>
                  <td align="center" style="padding:40px 40px 20px;">
                    <img src="https://kbxijzsrywcwnyvtbruh.supabase.co/storage/v1/object/public/email-assets/prime-haven-logo.png?v=1" alt="Prime Haven" width="140" style="display:block;max-width:140px;height:auto;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 40px;">
                    <span style="display:inline-block;background-color:rgba(254,76,24,0.15);border:1px solid rgba(254,76,24,0.3);color:#fe4c18;padding:6px 16px;border-radius:50px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">NEW MESSAGE</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 40px 20px;">
                    <h2 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#ffffff;text-align:center;">
                      Hi ${safeFirstName}, you have a new message!
                    </h2>
                    <p style="margin:0 0 24px;font-size:16px;color:#cccccc;text-align:center;line-height:1.6;">
                      <strong>${safeSender}</strong> just sent you a message on Prime Haven.
                    </p>
                    <div style="background-color:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;margin-bottom:32px;">
                      <p style="margin:0;font-size:14px;color:#888888;font-style:italic;line-height:1.6;">
                        "${safeContent}"
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 40px 40px;">
                    <a href="https://primehaven.tech/messages" target="_blank" style="display:inline-block;background-color:#fe4c18;color:#000000;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:700;font-size:16px;letter-spacing:0.5px;">Reply Now</a>
                  </td>
                </tr>
                <tr><td style="padding:0 40px;"><hr style="border:none;height:1px;background-color:#2a2a2a;margin:0;" /></td></tr>
                <tr>
                  <td align="center" style="padding:28px 40px 40px;">
                    <p style="margin:0 0 8px;font-size:12px;color:#555555;">You're receiving this because notifications are enabled for your account.</p>
                    <p style="margin:12px 0 0;font-size:11px;color:#fe4c18;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Making IT Dreams a Reality</p>
                    <p style="margin:8px 0 0;font-size:12px;color:#555555;">&copy; 2026 Prime Haven. Youth-driven design & IT solutions.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Prime Haven" <${SMTP_USER}>`,
      to: profile.email,
      subject: `New Message from ${senderName}`,
      html: html,
      text: `Hi ${profile.full_name || "there"}, you have a new message from ${senderName}: "${content}". Reply at https://primehaven.tech/messages`,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in notify-new-message:", error);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
