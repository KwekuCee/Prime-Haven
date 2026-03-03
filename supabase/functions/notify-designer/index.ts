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

interface NotifyRequest {
  designerId: string;
  projectName: string;
  notificationType: "ph_approved" | "client_accepted" | "gift_points" | "new_submission" | "salary_paid" | "start_working";
  pointsAwarded?: number;
  giftReason?: string;
  salaryAmount?: number;
  paymentMethod?: string;
  paymentAccount?: string;
}

function encodeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

async function sendEmail(to: string, subject: string, html: string) {
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
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: NotifyRequest = await req.json();
    const { designerId, projectName, notificationType, pointsAwarded, giftReason, salaryAmount, paymentMethod, paymentAccount } = body;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!designerId || !uuidRegex.test(designerId)) {
      return new Response(JSON.stringify({ success: false, error: "invalid_request" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // For admin-targeted notifications
    if (notificationType === "new_submission" || notificationType === "start_working") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", designerId)
        .single();

      const designerName = encodeHtml((profile?.full_name || "A designer").slice(0, 100).trim());
      const sanitizedProject = encodeHtml((projectName || "Untitled").slice(0, 200).trim());

      const isStartWorking = notificationType === "start_working";
      const subject = isStartWorking
        ? `🚀 ${designerName} has started working on "${sanitizedProject}"`
        : `📋 New Submission: "${sanitizedProject}" by ${designerName}`;
      const badgeLabel = isStartWorking ? "🚀 STARTED WORKING" : "📋 NEW SUBMISSION";
      const headingText = isStartWorking ? "Designer Started Working!" : "New Work Submitted!";
      const bodyText = isStartWorking
        ? `<strong>${designerName}</strong> has started working on <strong>"${sanitizedProject}"</strong>.`
        : `<strong>${designerName}</strong> has submitted <strong>"${sanitizedProject}"</strong> for your review.`;
      const ctaText = isStartWorking ? "View Dashboard" : "Review Now";

      const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg, #000 0%, #0a0a0a 50%, #111 100%); color: #fff; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, rgba(20,20,20,0.95), rgba(10,10,10,0.98)); border-radius: 24px; padding: 48px 40px; border: 1px solid rgba(254,76,24,0.2); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); position: relative; overflow: hidden; }
    .container::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #fe4c18, #ff7a45, #fe4c18); }
    .badge { display: inline-block; background: rgba(254,76,24,0.2); border: 1px solid rgba(254,76,24,0.3); color: #fe4c18; padding: 8px 20px; border-radius: 50px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
    h1 { color: #fff; font-size: 28px; font-weight: 800; margin: 0 0 8px; }
    .name { color: #fe4c18; }
    p { color: #b0b0b0; line-height: 1.7; font-size: 15px; }
    .highlight-box { background: rgba(254,76,24,0.1); border: 1px solid rgba(254,76,24,0.2); border-radius: 16px; padding: 24px; margin: 30px 0; text-align: center; }
    .cta { display: inline-block; background: linear-gradient(135deg, #fe4c18, #ff6b35); color: #000 !important; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 15px; margin-top: 16px; }
    .footer { margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center; }
    .footer p { color: #555; font-size: 12px; }
    .footer a { color: #fe4c18; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div style="text-align:center; margin-bottom:30px;">
      <img src="https://kbxijzsrywcwnyvtbruh.supabase.co/storage/v1/object/public/email-assets/prime-haven-logo.png?v=1" alt="Prime Haven" style="max-width:140px;height:auto;" />
    </div>
    <div style="text-align:center;">
      <span class="badge">${badgeLabel}</span>
      <h1>${headingText}</h1>
    </div>
    <div class="highlight-box">
      <p style="margin:0 0 10px;color:#ccc;">${bodyText}</p>
      <a href="https://primehaven.lovable.app/superadmin" class="cta">${ctaText}</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Prime Haven. All rights reserved.</p>
      <p><a href="https://primehaven.lovable.app">primehaven.lovable.app</a></p>
    </div>
  </div>
</body>
</html>`;

      await sendEmail("team@primehaven.tech", subject, emailHtml);

      console.log(`Admin notification sent for ${notificationType}: ${sanitizedProject}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Designer notifications (ph_approved, client_accepted, gift_points)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", designerId)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return new Response(JSON.stringify({ success: false, error: "designer_not_found" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const sanitizedName = encodeHtml((profile.full_name || "Designer").slice(0, 100).trim());
    const sanitizedProject = encodeHtml((projectName || "Your Project").slice(0, 200).trim());

    let subject = "";
    let heading = "";
    let message = "";
    let badgeText = "";
    let emoji = "";

    switch (notificationType) {
      case "ph_approved":
        subject = `🎨 Your design "${sanitizedProject}" has been PH Approved!`;
        heading = "Design Approved by Prime Haven!";
        message = `Great news! Your submission <strong>"${sanitizedProject}"</strong> has passed the Prime Haven quality check and earned you <strong>+${pointsAwarded || 15} points</strong>. Your work is now awaiting client review.`;
        badgeText = "PH APPROVED";
        emoji = "🎨";
        break;
      case "client_accepted":
        subject = `🏆 Client Accepted your design "${sanitizedProject}"!`;
        heading = "Client Accepted Your Design!";
        message = `Amazing work! The client has accepted your submission <strong>"${sanitizedProject}"</strong>! You've earned an additional <strong>+${pointsAwarded || 40} points</strong>. Keep up the incredible work!`;
        badgeText = "CLIENT ACCEPTED";
        emoji = "🏆";
        break;
      case "gift_points":
        subject = `🎁 You received ${pointsAwarded} bonus points!`;
        heading = "You Received Bonus Points!";
        message = `You've been awarded <strong>+${pointsAwarded} bonus points</strong>${giftReason ? ` for: <strong>${encodeHtml(giftReason.slice(0, 200).trim())}</strong>` : ""}. Keep doing great work!`;
        badgeText = "BONUS POINTS";
        emoji = "🎁";
        break;
      case "salary_paid":
        subject = `💰 Your salary of GH₵${(salaryAmount || 0).toFixed(2)} has been sent!`;
        heading = "You've Been Paid!";
        message = `Great news! Your salary of <strong>GH₵${(salaryAmount || 0).toFixed(2)}</strong> has been sent to your <strong>${encodeHtml((paymentMethod || "account").slice(0, 50))}</strong>${paymentAccount ? ` ending in <strong>...${encodeHtml(paymentAccount.slice(-4))}</strong>` : ""}. Please allow some time for the funds to reflect in your account.`;
        badgeText = "SALARY PAID";
        emoji = "💰";
        break;
    }

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg, #000 0%, #0a0a0a 50%, #111 100%); color: #fff; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, rgba(20,20,20,0.95), rgba(10,10,10,0.98)); border-radius: 24px; padding: 48px 40px; border: 1px solid rgba(254,76,24,0.2); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); position: relative; overflow: hidden; }
    .container::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #fe4c18, #ff7a45, #fe4c18); }
    .badge { display: inline-block; background: rgba(254,76,24,0.2); border: 1px solid rgba(254,76,24,0.3); color: #fe4c18; padding: 8px 20px; border-radius: 50px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
    h1 { color: #fff; font-size: 28px; font-weight: 800; margin: 0 0 8px; }
    .name { color: #fe4c18; }
    p { color: #b0b0b0; line-height: 1.7; font-size: 15px; }
    .highlight-box { background: rgba(254,76,24,0.1); border: 1px solid rgba(254,76,24,0.2); border-radius: 16px; padding: 24px; margin: 30px 0; text-align: center; }
    .points { font-size: 36px; font-weight: 800; color: #fe4c18; margin: 10px 0; }
    .cta { display: inline-block; background: linear-gradient(135deg, #fe4c18, #ff6b35); color: #000 !important; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 15px; margin-top: 16px; }
    .footer { margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center; }
    .footer p { color: #555; font-size: 12px; }
    .footer a { color: #fe4c18; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div style="text-align:center; margin-bottom:30px;">
      <img src="https://kbxijzsrywcwnyvtbruh.supabase.co/storage/v1/object/public/email-assets/prime-haven-logo.png?v=1" alt="Prime Haven" style="max-width:140px;height:auto;" />
    </div>
    <div style="text-align:center;">
      <span class="badge">${emoji} ${badgeText}</span>
      <h1>Hey <span class="name">${sanitizedName}</span>!</h1>
      <h1>${heading}</h1>
    </div>
    <div class="highlight-box">
      <p style="margin:0 0 10px;color:#ccc;">${message}</p>
      ${pointsAwarded ? `<div class="points">+${pointsAwarded} pts</div>` : ""}
      <a href="https://primehaven.lovable.app/dashboard" class="cta">View Dashboard</a>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Prime Haven. All rights reserved.</p>
      <p><a href="https://primehaven.lovable.app">primehaven.lovable.app</a></p>
    </div>
  </div>
</body>
</html>`;

    await sendEmail(profile.email, subject, emailHtml);

    console.log(`Notification email sent to ${profile.email} for ${notificationType}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in notify-designer:", error);
    return new Response(JSON.stringify({ success: false, error: "server_error" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
