import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
const DISCORD_CHANNEL_ID = Deno.env.get("DISCORD_CHANNEL_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateInviteRequest {
  userId: string;
  email: string;
  fullName: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, email, fullName }: CreateInviteRequest = await req.json();

    // Validate inputs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!userId || !uuidRegex.test(userId)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_user_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Creating Discord invite for user:", userId);

    // Create single-use Discord invite that expires in 24 hours
    const discordResponse = await fetch(
      `https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/invites`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          max_age: 86400,      // 24 hours in seconds
          max_uses: 1,         // Single use
          unique: true,        // Create a unique invite
          temporary: false,    // Don't kick after disconnect
        }),
      }
    );

    if (!discordResponse.ok) {
      const errorData = await discordResponse.json();
      console.error("Discord API error:", errorData);
      return new Response(
        JSON.stringify({ success: false, error: "discord_api_error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const inviteData = await discordResponse.json();
    const inviteUrl = `https://discord.gg/${inviteData.code}`;
    
    console.log("Discord invite created:", inviteData.code);

    // Get logo URL from storage
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: logoData } = supabase.storage
      .from("email-assets")
      .getPublicUrl("prime-haven-logo.png");
    
    const logoUrl = logoData?.publicUrl || "";

    // Send email with Discord invite
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(254, 76, 24, 0.3); }
      50% { box-shadow: 0 0 40px rgba(254, 76, 24, 0.6); }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #000000 0%, #1a0a05 50%, #000000 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" style="max-width: 600px; background: linear-gradient(145deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.98) 100%); border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(254, 76, 24, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid rgba(254, 76, 24, 0.2);">
              ${logoUrl ? `<img src="${logoUrl}?v=1" alt="Prime Haven" style="height: 60px; margin-bottom: 20px;">` : ''}
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #fe4c18 0%, #ff7b4d 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                Welcome to the Team! 🎉
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #e5e5e5; font-size: 16px; line-height: 1.6;">
                Hey <strong style="color: #fe4c18;">${fullName || 'Designer'}</strong>,
              </p>
              <p style="margin: 0 0 30px; color: #a3a3a3; font-size: 15px; line-height: 1.7;">
                Your payment has been confirmed and you're now officially part of the Prime Haven family! 🚀
              </p>
              <p style="margin: 0 0 20px; color: #e5e5e5; font-size: 15px; line-height: 1.7;">
                Join our exclusive Discord community to connect with fellow designers, get project updates, and access resources:
              </p>
              
              <!-- Discord Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #5865F2 0%, #7289DA 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 8px 20px rgba(88, 101, 242, 0.4);">
                      🎮 Join Discord Server
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Warning Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(254, 76, 24, 0.1); border: 1px solid rgba(254, 76, 24, 0.3); border-radius: 12px; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; color: #fe4c18; font-size: 14px; font-weight: 600;">
                      ⚠️ Important Notice
                    </p>
                    <p style="margin: 10px 0 0; color: #a3a3a3; font-size: 13px; line-height: 1.6;">
                      This invite link is <strong style="color: #e5e5e5;">single-use</strong> and expires in <strong style="color: #e5e5e5;">24 hours</strong>. Please use it promptly and don't share it with others.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #a3a3a3; font-size: 14px; line-height: 1.7;">
                Once you join, an admin will approve your membership shortly. See you on the server! 👋
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background: rgba(0, 0, 0, 0.3); text-align: center; border-top: 1px solid rgba(254, 76, 24, 0.1);">
              <p style="margin: 0 0 15px; color: #737373; font-size: 13px;">
                Follow us on social media
              </p>
              <a href="https://instagram.com/primehaven_co" style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, #E1306C 0%, #F77737 100%); color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 500; border-radius: 6px;">
                📸 Instagram
              </a>
              <p style="margin: 20px 0 0; color: #525252; font-size: 12px;">
                © 2025 Prime Haven. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email via SendGrid
    const sendGridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: "team@primehaven.tech", name: "Prime Haven" },
        subject: "🎮 Your Exclusive Discord Invite - Welcome to Prime Haven!",
        content: [{ type: "text/html", value: emailHtml }],
      }),
    });

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text();
      console.error("SendGrid error:", errorText);
      // Don't fail the whole request, just log the error
    } else {
      console.log("Discord invite email sent to:", email);
    }

    // Update profile to mark discord invite as sent
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ discord_invite_sent: true })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update profile:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Discord invite created and email sent",
        inviteCode: inviteData.code,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error creating Discord invite:", error);
    return new Response(
      JSON.stringify({ success: false, error: "server_error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
