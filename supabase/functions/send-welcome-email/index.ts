import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6";

const SMTP_HOST = Deno.env.get("SMTP_HOST");
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function encodeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function buildWelcomeHtml(name: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to Prime Haven - Getting Started Guide</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#141414;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">

<!-- Top accent bar -->
<tr><td style="height:4px;background:linear-gradient(90deg,#fe4c18,#ff7a45,#fe4c18);"></td></tr>

<!-- Logo -->
<tr><td align="center" style="padding:40px 40px 20px;">
<img src="https://kbxijzsrywcwnyvtbruh.supabase.co/storage/v1/object/public/email-assets/prime-haven-logo.png?v=1" alt="Prime Haven" width="140" style="display:block;max-width:140px;height:auto;" />
</td></tr>

<!-- Badge -->
<tr><td align="center" style="padding:0 40px;">
<span style="display:inline-block;background-color:rgba(254,76,24,0.15);border:1px solid rgba(254,76,24,0.3);color:#fe4c18;padding:6px 16px;border-radius:50px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">GETTING STARTED</span>
</td></tr>

<!-- Welcome heading -->
<tr><td align="center" style="padding:16px 40px 4px;">
<h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;">Welcome aboard, <span style="color:#fe4c18;">${name}</span>! 🎉</h1>
</td></tr>
<tr><td align="center" style="padding:0 40px 24px;">
<p style="margin:0;font-size:15px;color:#888888;">Here's everything you need to know to get started with Prime Haven</p>
</td></tr>

<!-- Step 1 -->
<tr><td style="padding:0 40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(254,76,24,0.08);border:1px solid rgba(254,76,24,0.2);border-radius:12px;">
<tr><td style="padding:20px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="40" valign="top"><span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background-color:#fe4c18;color:#000;border-radius:50%;font-weight:800;font-size:14px;">1</span></td>
<td style="padding-left:12px;">
<p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#ffffff;">Verify Your Email</p>
<p style="margin:0;font-size:14px;color:#999999;">Check your inbox for the verification email and click the link to activate your account. You won't be able to log in until verified.</p>
</td>
</tr></table>
</td></tr></table>
</td></tr>

<!-- Step 2 -->
<tr><td style="padding:0 40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
<tr><td style="padding:20px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="40" valign="top"><span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background-color:rgba(254,76,24,0.3);color:#fe4c18;border-radius:50%;font-weight:800;font-size:14px;">2</span></td>
<td style="padding-left:12px;">
<p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#ffffff;">Log In & Explore Your Dashboard</p>
<p style="margin:0;font-size:14px;color:#999999;">After verification, log in at <a href="https://primehaven.lovable.app/login" style="color:#fe4c18;text-decoration:none;">primehaven.lovable.app/login</a>. Your dashboard shows your points, rank, leaderboard, and quick actions.</p>
</td>
</tr></table>
</td></tr></table>
</td></tr>

<!-- Step 3 -->
<tr><td style="padding:0 40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
<tr><td style="padding:20px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="40" valign="top"><span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background-color:rgba(254,76,24,0.3);color:#fe4c18;border-radius:50%;font-weight:800;font-size:14px;">3</span></td>
<td style="padding-left:12px;">
<p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#ffffff;">Join Our Discord Community</p>
<p style="margin:0;font-size:14px;color:#999999;">You should have received a Discord invite email. Join to connect with fellow designers, get updates on new projects, and receive support from the team.</p>
</td>
</tr></table>
</td></tr></table>
</td></tr>

<!-- Step 4 -->
<tr><td style="padding:0 40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
<tr><td style="padding:20px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="40" valign="top"><span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background-color:rgba(254,76,24,0.3);color:#fe4c18;border-radius:50%;font-weight:800;font-size:14px;">4</span></td>
<td style="padding-left:12px;">
<p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#ffffff;">Start Working on Projects</p>
<p style="margin:0;font-size:14px;color:#999999;">When a job is posted, click <strong>"Start Work"</strong> on your dashboard to notify the admin you're on it. Then submit your completed work via the <strong>"Submit Work"</strong> page.</p>
</td>
</tr></table>
</td></tr></table>
</td></tr>

<!-- Step 5 -->
<tr><td style="padding:0 40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
<tr><td style="padding:20px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="40" valign="top"><span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background-color:rgba(254,76,24,0.3);color:#fe4c18;border-radius:50%;font-weight:800;font-size:14px;">5</span></td>
<td style="padding-left:12px;">
<p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#ffffff;">Earn Points & Get Paid</p>
<p style="margin:0;font-size:14px;color:#999999;">Your work goes through two approval stages: <strong>PH Approval</strong> (internal quality check) and <strong>Client Acceptance</strong>. Each stage earns you points. At month-end, your points determine your share of the revenue pool!</p>
</td>
</tr></table>
</td></tr></table>
</td></tr>

<!-- Points breakdown -->
<tr><td style="padding:0 40px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(254,76,24,0.08);border:1px solid rgba(254,76,24,0.2);border-radius:12px;">
<tr><td align="center" style="padding:24px;">
<p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">Points Breakdown</p>
<table role="presentation" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:4px 16px;"><span style="color:#fe4c18;font-weight:700;">⭐ PH Approval:</span> <span style="color:#ccc;">+15 points</span></td>
</tr>
<tr>
<td style="padding:4px 16px;"><span style="color:#fe4c18;font-weight:700;">🏆 Client Accept:</span> <span style="color:#ccc;">+20-65 points (varies by service)</span></td>
</tr>
<tr>
<td style="padding:4px 16px;"><span style="color:#fe4c18;font-weight:700;">🎁 Bonus Points:</span> <span style="color:#ccc;">Awarded for exceptional work</span></td>
</tr>
</table>
</td></tr></table>
</td></tr>

<!-- CTA -->
<tr><td align="center" style="padding:0 40px 28px;">
<a href="https://primehaven.lovable.app/dashboard" target="_blank" style="display:inline-block;background-color:#fe4c18;color:#000000;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:700;font-size:16px;letter-spacing:0.5px;">Go to Dashboard</a>
</td></tr>

<!-- Divider -->
<tr><td style="padding:0 40px;">
<hr style="border:none;height:1px;background-color:#2a2a2a;margin:0;" />
</td></tr>

<!-- Footer -->
<tr><td align="center" style="padding:28px 40px 40px;">
<p style="margin:0 0 8px;font-size:12px;color:#555555;">Need help? Reach out to us anytime at <a href="mailto:team@primehaven.tech" style="color:#fe4c18;text-decoration:none;">team@primehaven.tech</a></p>
<p style="margin:12px 0 0;font-size:11px;color:#fe4c18;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Making IT Dreams a Reality</p>
<p style="margin:8px 0 0;font-size:12px;color:#555555;">&copy; 2026 Prime Haven. Youth-driven design &amp; IT solutions.</p>
</td></tr>

</table></td></tr></table>
</body></html>`;
}

function buildPlainText(name: string): string {
  return [
    `Welcome aboard, ${name}! 🎉`,
    '',
    "Here's everything you need to know to get started with Prime Haven:",
    '',
    '1. VERIFY YOUR EMAIL',
    '   Check your inbox for the verification email and click the link to activate your account.',
    '',
    '2. LOG IN & EXPLORE YOUR DASHBOARD',
    '   After verification, log in at https://primehaven.lovable.app/login',
    '   Your dashboard shows your points, rank, leaderboard, and quick actions.',
    '',
    '3. JOIN OUR DISCORD COMMUNITY',
    '   Check for your Discord invite email to connect with fellow designers.',
    '',
    '4. START WORKING ON PROJECTS',
    '   Click "Start Work" on your dashboard to notify the admin, then submit via "Submit Work".',
    '',
    '5. EARN POINTS & GET PAID',
    '   PH Approval: +15 points',
    '   Client Acceptance: +20-65 points (varies by service)',
    '   Bonus Points: Awarded for exceptional work',
    '',
    'Need help? team@primehaven.tech',
    '',
    '© 2026 Prime Haven - Making IT Dreams a Reality',
  ].join('\n');
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const email = body?.email;
    const fullName = body?.fullName;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || email.length > 255 || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const sanitizedName = typeof fullName === 'string'
      ? encodeHtml(fullName.slice(0, 100).trim())
      : "Designer";

    const fromAddress = (SMTP_USER || "").trim();
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: fromAddress, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: \`Prime Haven <\${fromAddress}>\`,
      to: email,
      subject: "🚀 Welcome to Prime Haven - Your Getting Started Guide",
      html: buildWelcomeHtml(sanitizedName),
      text: buildPlainText(sanitizedName),
    });

    console.log("Welcome email sent to:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-welcome-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: "email_send_failed" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
