import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  email: string;
  fullName: string;
  userId: string;
  redirectUrl: string;
}

const generateToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

// Allowed redirect domains for security
const ALLOWED_REDIRECT_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "lovable.app",
  "lovable.dev",
  "youthquake-forge.lovable.app",
];

const isAllowedRedirectUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_REDIRECT_DOMAINS.some(
      (domain) =>
        parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const email = body?.email;
    const fullName = body?.fullName;
    const userId = body?.userId;
    const redirectUrl = body?.redirectUrl;

    // Input validation - email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || email.length > 255 || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate userId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!userId || typeof userId !== 'string' || !uuidRegex.test(userId)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate redirectUrl - must be from allowed domains
    if (!redirectUrl || typeof redirectUrl !== 'string' || !isAllowedRedirectUrl(redirectUrl)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize fullName - limit length and remove potential script tags
    const sanitizedName = typeof fullName === 'string' 
      ? fullName.slice(0, 100).replace(/<[^>]*>/g, '').trim() 
      : "Designer";

    // Generate verification token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Store token in database using service role
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { error: tokenError } = await supabase
      .from("email_verification_tokens")
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt,
      });

    if (tokenError) {
      console.error("Token storage error:", tokenError);
      throw new Error("Failed to create verification token");
    }

    // Create verification link
    const verificationLink = `${redirectUrl}/auth/confirm?token=${token}`;

    // Send email via SendGrid
    const emailResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email }],
            dynamic_template_data: {
              name: sanitizedName,
              verification_link: verificationLink,
            },
          },
        ],
        from: { email: "noreply@primehaven.com", name: "Prime Haven" },
        subject: "Welcome to Prime Haven - Verify Your Email",
        content: [
          {
            type: "text/html",
            value: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: 'Segoe UI', Arial, sans-serif; background: #000; color: #fff; margin: 0; padding: 40px 20px; }
                  .container { max-width: 600px; margin: 0 auto; background: #0a0a0a; border-radius: 16px; padding: 40px; border: 1px solid #1a1a1a; }
                  .logo { text-align: center; margin-bottom: 30px; }
                  .logo h1 { color: #fe4c18; font-size: 28px; margin: 0; }
                  h2 { color: #fff; font-size: 24px; margin-bottom: 20px; }
                  p { color: #a0a0a0; line-height: 1.6; margin-bottom: 20px; }
                  .button { display: inline-block; background: linear-gradient(135deg, #fe4c18 0%, #ff7a45 100%); color: #000 !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #1a1a1a; text-align: center; color: #666; font-size: 12px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="logo">
                    <h1>🚀 Prime Haven</h1>
                  </div>
                  <h2>Welcome to the Team, ${sanitizedName}!</h2>
                  <p>Thank you for joining Prime Haven. We're excited to have you as part of our creative community.</p>
                  <p>Please verify your email address to complete your registration and access your dashboard:</p>
                  <p style="text-align: center;">
                    <a href="${verificationLink}" class="button">Verify Email Address</a>
                  </p>
                  <p>This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
                  <div class="footer">
                    <p>© 2026 Prime Haven. Youth-driven design & IT solutions.</p>
                    <p>Questions? Contact us at primehaven26@gmail.com</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          },
        ],
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("SendGrid error:", errorText);
      throw new Error("Failed to send verification email");
    }

    console.log("Verification email sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    console.error("Error in send-verification-email:", error);
    // Return generic error - don't expose internal details
    return new Response(
      JSON.stringify({ success: false, error: "email_send_failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
