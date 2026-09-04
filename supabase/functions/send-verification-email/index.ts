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

const generateToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const ALLOWED_REDIRECT_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "primehaven.tech",
  "lovable.app",
  "lovableproject.com",
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

function buildEmailHtml(name: string, verificationLink: string): string {
  return [
    '<!DOCTYPE html>',
    '<html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>Verify Your Email - Prime Haven</title>',
    '</head>',
    '<body style="margin:0;padding:0;background-color:#0a0a0a;',
    'font-family:Arial,Helvetica,sans-serif;">',
    '<table role="presentation" width="100%" cellpadding="0"',
    ' cellspacing="0" style="background-color:#0a0a0a;',
    'padding:40px 20px;">',
    '<tr><td align="center">',
    '<table role="presentation" width="600" cellpadding="0"',
    ' cellspacing="0" style="max-width:600px;width:100%;',
    'background-color:#141414;border-radius:16px;',
    'border:1px solid #2a2a2a;overflow:hidden;">',
    '<tr><td style="height:4px;',
    'background:linear-gradient(90deg,#fe4c18,#ff7a45,#fe4c18);">',
    '</td></tr>',
    '<tr><td align="center" style="padding:40px 40px 20px;">',
    '<img src="https://kbxijzsrywcwnyvtbruh.supabase.co',
    '/storage/v1/object/public/email-assets/',
    'prime-haven-logo.png?v=1"',
    ' alt="Prime Haven" width="140"',
    ' style="display:block;max-width:140px;height:auto;" />',
    '</td></tr>',
    '<tr><td align="center" style="padding:0 40px;">',
    '<span style="display:inline-block;',
    'background-color:rgba(254,76,24,0.15);',
    'border:1px solid rgba(254,76,24,0.3);',
    'color:#fe4c18;padding:6px 16px;',
    'border-radius:50px;font-size:12px;',
    'font-weight:700;letter-spacing:2px;',
    'text-transform:uppercase;">NEW MEMBER</span>',
    '</td></tr>',
    '<tr><td align="center" style="padding:16px 40px 4px;">',
    '<h1 style="margin:0;font-size:28px;',
    'font-weight:800;color:#ffffff;">',
    'Welcome, <span style="color:#fe4c18;">',
    name,
    '</span>!</h1>',
    '</td></tr>',
    '<tr><td align="center" style="padding:0 40px 24px;">',
    '<p style="margin:0;font-size:15px;color:#888888;">',
    "You're one step away from joining our creative community",
    '</p></td></tr>',
    '<tr><td style="padding:0 40px;">',
    '<table role="presentation" width="100%" cellpadding="0"',
    ' cellspacing="0" style="background-color:rgba(254,76,24,0.08);',
    'border:1px solid rgba(254,76,24,0.2);',
    'border-radius:12px;">',
    '<tr><td align="center" style="padding:28px 24px;">',
    '<p style="margin:0 0 20px;font-size:15px;',
    'color:#cccccc;">Click below to verify your email',
    ' and unlock your dashboard:</p>',
    '<a href="', verificationLink, '"',
    ' target="_blank"',
    ' style="display:inline-block;',
    'background-color:#fe4c18;color:#000000;',
    'text-decoration:none;padding:16px 40px;',
    'border-radius:10px;font-weight:700;',
    'font-size:16px;letter-spacing:0.5px;">',
    'Verify My Email</a>',
    '<p style="margin:16px 0 0;font-size:13px;',
    'color:#888888;background-color:rgba(255,255,255,0.05);',
    'padding:8px 14px;border-radius:6px;',
    'display:inline-block;">',
    'This link expires in <span style="color:#fe4c18;',
    'font-weight:700;">24 hours</span></p>',
    '</td></tr></table>',
    '</td></tr>',
    '<tr><td style="padding:28px 40px 0;">',
    '<table role="presentation" width="100%"',
    ' cellpadding="0" cellspacing="0">',
    '<tr>',
    '<td align="center" width="33%" style="padding:12px 4px;',
    'background-color:rgba(255,255,255,0.03);',
    'border:1px solid rgba(255,255,255,0.05);',
    'border-radius:10px;">',
    '<p style="margin:0;font-size:24px;">&#127912;</p>',
    '<p style="margin:6px 0 0;font-size:12px;',
    'color:#888888;">Creative Projects</p>',
    '</td>',
    '<td width="8"></td>',
    '<td align="center" width="33%" style="padding:12px 4px;',
    'background-color:rgba(255,255,255,0.03);',
    'border:1px solid rgba(255,255,255,0.05);',
    'border-radius:10px;">',
    '<p style="margin:0;font-size:24px;">&#128176;</p>',
    '<p style="margin:6px 0 0;font-size:12px;',
    'color:#888888;">Earn Points</p>',
    '</td>',
    '<td width="8"></td>',
    '<td align="center" width="33%" style="padding:12px 4px;',
    'background-color:rgba(255,255,255,0.03);',
    'border:1px solid rgba(255,255,255,0.05);',
    'border-radius:10px;">',
    '<p style="margin:0;font-size:24px;">&#128640;</p>',
    '<p style="margin:6px 0 0;font-size:12px;',
    'color:#888888;">Grow Skills</p>',
    '</td>',
    '</tr></table>',
    '</td></tr>',
    '<tr><td style="padding:28px 40px;">',
    '<hr style="border:none;height:1px;',
    'background-color:#2a2a2a;margin:0;" />',
    '</td></tr>',
    '<tr><td align="center" style="padding:0 40px;">',
    '<p style="margin:0 0 16px;font-size:12px;',
    'color:#666666;font-weight:600;',
    'letter-spacing:3px;text-transform:uppercase;">',
    'JOIN OUR COMMUNITY</p>',
    '<table role="presentation" cellpadding="0"',
    ' cellspacing="0"><tr>',
    '<td style="padding:0 6px;">',
    '<a href="https://discord.gg/meXTeEdF"',
    ' target="_blank"',
    ' style="display:inline-block;',
    'background-color:#5865F2;color:#ffffff;',
    'text-decoration:none;padding:12px 24px;',
    'border-radius:10px;font-weight:600;',
    'font-size:14px;">Discord Server</a>',
    '</td>',
    '<td style="padding:0 6px;">',
    '<a href="https://instagram.com/primehaven_co"',
    ' target="_blank"',
    ' style="display:inline-block;',
    'background-color:#E1306C;color:#ffffff;',
    'text-decoration:none;padding:12px 24px;',
    'border-radius:10px;font-weight:600;',
    'font-size:14px;">Instagram</a>',
    '</td>',
    '</tr></table>',
    '</td></tr>',
    '<tr><td align="center" style="padding:32px 40px 40px;">',
    '<p style="margin:0 0 8px;font-size:12px;',
    'color:#555555;">If you didn\'t create an account,',
    ' you can safely ignore this email.</p>',
    '<p style="margin:0 0 8px;font-size:12px;',
    'color:#555555;">Questions? Contact us at ',
    '<a href="mailto:primehaven26@gmail.com"',
    ' style="color:#fe4c18;text-decoration:none;">',
    'primehaven26@gmail.com</a></p>',
    '<p style="margin:12px 0 0;font-size:11px;',
    'color:#fe4c18;font-weight:600;',
    'letter-spacing:2px;text-transform:uppercase;">',
    'Making IT Dreams a Reality</p>',
    '<p style="margin:8px 0 0;font-size:12px;',
    'color:#555555;">',
    '&copy; 2026 Prime Haven. Youth-driven design',
    ' &amp; IT solutions.</p>',
    '</td></tr>',
    '</table></td></tr></table>',
    '</body></html>',
  ].join('');
}

function buildPlainText(name: string, verificationLink: string): string {
  return [
    `Welcome to Prime Haven, ${name}!`,
    '',
    "You're one step away from joining our creative community.",
    '',
    'Click the link below to verify your email:',
    verificationLink,
    '',
    'This link expires in 24 hours.',
    '',
    'Join our community:',
    'Discord: https://discord.gg/meXTeEdF',
    'Instagram: https://instagram.com/primehaven_co',
    '',
    "If you didn't create an account, ignore this email.",
    'Questions? primehaven26@gmail.com',
    '',
    '© 2026 Prime Haven - Making IT Dreams a Reality',
  ].join('\n');
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
) {
  const fromAddress = (SMTP_USER || "").trim();
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: fromAddress, pass: SMTP_PASS },
  });
  await transporter.sendMail({
    from: `Prime Haven <${fromAddress}>`,
    to,
    subject,
    html,
    text,
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const email = body?.email;
    const fullName = body?.fullName;
    let userId = body?.userId;
    const redirectUrl = body?.redirectUrl;
    const lookupByEmail = body?.lookupByEmail === true;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || email.length > 255 || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!redirectUrl || typeof redirectUrl !== 'string' || !isAllowedRedirectUrl(redirectUrl)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseLookup = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    if (lookupByEmail) {
      const { data: lookup } = await supabaseLookup
        .from("profiles")
        .select("id, full_name")
        .eq("email", email.toLowerCase())
        .maybeSingle();
      if (!lookup) {
        // Generic success to avoid email enumeration
        return new Response(
          JSON.stringify({ success: true, message: "If the account exists, an email has been sent." }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      userId = lookup.id;
      if (!body?.fullName && lookup.full_name) {
        (body as any).fullName = lookup.full_name;
      }
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!userId || typeof userId !== 'string' || !uuidRegex.test(userId)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const sanitizedName = typeof fullName === 'string'
      ? fullName.slice(0, 100).trim()
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
      : "Designer";

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Verify the user has paid the registration fee and is not already verified
    const { data: profile, error: profileLookupError } = await supabase
      .from("profiles")
      .select("id, email_verified, registration_fee_paid")
      .eq("id", userId)
      .maybeSingle();

    if (profileLookupError) {
      console.error("Profile lookup error:", profileLookupError);
      return new Response(
        JSON.stringify({ success: false, error: "lookup_failed" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!profile) {
      // Don't reveal whether the account exists
      return new Response(
        JSON.stringify({ success: true, message: "If the account exists, an email has been sent." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (profile.email_verified) {
      return new Response(
        JSON.stringify({ success: false, error: "already_verified" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!profile.registration_fee_paid) {
      return new Response(
        JSON.stringify({ success: false, error: "payment_required" }),
        { status: 402, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: tokenError } = await supabase
      .from("email_verification_tokens")
      .insert({ user_id: userId, token, expires_at: expiresAt });

    if (tokenError) {
      console.error("Token storage error:", tokenError);
      throw new Error("Failed to create verification token");
    }

    const verificationLink = `${redirectUrl}/auth/confirm?token=${token}`;
    const emailHtml = buildEmailHtml(sanitizedName, verificationLink);
    const emailText = buildPlainText(sanitizedName, verificationLink);

    await sendEmail(
      email,
      "Welcome to Prime Haven - Verify Your Email",
      emailHtml,
      emailText,
    );

    console.log("Verification email sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-verification-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: "email_send_failed" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
