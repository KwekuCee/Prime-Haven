import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6";
import { createClient } from "npm:@supabase/supabase-js@2";

const SMTP_HOST = Deno.env.get("SMTP_HOST");
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Discord channel IDs per category
const DISCORD_CHANNELS: Record<string, string> = {
  "graphic-design": "1470244531680186478",
  "app-design": "1470244675951529984",
  "web-dev": "1470244738073497704",
};

// Map service types to categories for email lookup
const CATEGORY_SKILLS: Record<string, string[]> = {
  "graphic-design": ["logo", "branding", "print", "flyer", "Logo Design", "Brand Identity", "Print Design", "Flyer Design", "Graphic Design"],
  "app-design": ["uiux", "App Design", "UI/UX", "UI/UX Design", "Mobile Design"],
  "web-dev": ["web", "Web Design", "Web Development", "Frontend", "Full Stack"],
};

function encodeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
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

async function postToDiscord(channelId: string, embed: any): Promise<string | null> {
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      console.error("Discord API error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.id || null;
  } catch (e) {
    console.error("Discord post error:", e);
    return null;
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { title, description, category, deadline, budget, requirements, clientName, specialInstructions, contractId } = body;

    if (!title || !description || !category) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Post to Discord
    const channelId = DISCORD_CHANNELS[category];
    let discordMessageId: string | null = null;

    if (channelId && DISCORD_BOT_TOKEN) {
      const safeTitle = (title || "").slice(0, 256);
      const safeDesc = (description || "").slice(0, 2048);

      const fields: any[] = [];
      if (budget) fields.push({ name: "💰 Budget", value: budget.slice(0, 1024), inline: true });
      if (deadline) fields.push({ name: "📅 Deadline", value: new Date(deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), inline: true });
      if (clientName) fields.push({ name: "🏢 Client", value: clientName.slice(0, 1024), inline: true });
      if (requirements) fields.push({ name: "📋 Requirements", value: requirements.slice(0, 1024) });
      if (specialInstructions) fields.push({ name: "⚠️ Special Instructions", value: specialInstructions.slice(0, 1024) });

      const embed = {
        title: `🎨 New Job: ${safeTitle}`,
        description: safeDesc,
        color: 0xfe4c18,
        fields,
        footer: { text: "Prime Haven • Job Contracts" },
        timestamp: new Date().toISOString(),
      };

      discordMessageId = await postToDiscord(channelId, embed);
    }

    // 2. Update contract with discord_message_id if provided
    if (contractId && discordMessageId) {
      await supabase
        .from("job_contracts")
        .update({ discord_message_id: discordMessageId, discord_channel_id: channelId })
        .eq("id", contractId);
    }

    // 3. Send emails to relevant designers
    const skills = CATEGORY_SKILLS[category] || [];
    
    // Get all active designers
    const { data: allDesigners } = await supabase
      .from("profiles")
      .select("id, email, full_name, is_active")
      .eq("is_active", true);

    // Get designer details to check skills
    const { data: allDetails } = await supabase
      .from("designer_details")
      .select("user_id, skills, professional_title");

    const detailsMap = new Map((allDetails || []).map((d: any) => [d.user_id, d]));

    // Filter designers whose skills match this category
    const targetDesigners = (allDesigners || []).filter((d: any) => {
      const detail = detailsMap.get(d.id);
      if (!detail) return false;
      const designerSkills = (detail.skills || []).map((s: string) => s.toLowerCase());
      const designerTitle = (detail.professional_title || "").toLowerCase();
      return skills.some(skill => 
        designerSkills.some((ds: string) => ds.includes(skill.toLowerCase())) ||
        designerTitle.includes(skill.toLowerCase())
      );
    });

    console.log(`Found ${targetDesigners.length} designers for category ${category}`);

    // Send emails (batch, max 20 to avoid timeout)
    const emailTargets = targetDesigners.slice(0, 20);
    const safeTitle = encodeHtml((title || "").slice(0, 200));
    const safeDesc = encodeHtml((description || "").slice(0, 500));

    const emailSubject = `🎨 New Job Opportunity: ${(title || "").slice(0, 100)}`;
    
    for (const designer of emailTargets) {
      const safeName = encodeHtml((designer.full_name || "Designer").slice(0, 100));
      const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg, #000 0%, #0a0a0a 50%, #111 100%); color: #fff; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, rgba(20,20,20,0.95), rgba(10,10,10,0.98)); border-radius: 24px; padding: 48px 40px; border: 1px solid rgba(254,76,24,0.2); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); position: relative; overflow: hidden; }
    .container::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #fe4c18, #ff7a45, #fe4c18); }
    .badge { display: inline-block; background: rgba(254,76,24,0.2); border: 1px solid rgba(254,76,24,0.3); color: #fe4c18; padding: 8px 20px; border-radius: 50px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
    h1 { color: #fff; font-size: 24px; font-weight: 800; margin: 0 0 8px; }
    .name { color: #fe4c18; }
    p { color: #b0b0b0; line-height: 1.7; font-size: 15px; }
    .detail-box { background: rgba(254,76,24,0.1); border: 1px solid rgba(254,76,24,0.2); border-radius: 16px; padding: 24px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .detail-label { color: #888; font-size: 13px; }
    .detail-value { color: #fff; font-size: 13px; font-weight: 600; }
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
      <span class="badge">🎨 NEW JOB</span>
      <h1>Hey <span class="name">${safeName}</span>!</h1>
      <h1>${safeTitle}</h1>
    </div>
    <p style="text-align:center;">${safeDesc}</p>
    <div class="detail-box">
      ${budget ? `<div class="detail-row"><span class="detail-label">Budget</span><span class="detail-value">${encodeHtml(budget)}</span></div>` : ""}
      ${deadline ? `<div class="detail-row"><span class="detail-label">Deadline</span><span class="detail-value">${new Date(deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></div>` : ""}
      ${clientName ? `<div class="detail-row"><span class="detail-label">Client</span><span class="detail-value">${encodeHtml(clientName)}</span></div>` : ""}
      ${requirements ? `<div class="detail-row"><span class="detail-label">Requirements</span><span class="detail-value">${encodeHtml(requirements.slice(0, 200))}</span></div>` : ""}
    </div>
    <div style="text-align:center;">
      <a href="https://primehaven.lovable.app/dashboard" class="cta">View Dashboard</a>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Prime Haven. All rights reserved.</p>
      <p><a href="https://primehaven.lovable.app">primehaven.lovable.app</a></p>
    </div>
  </div>
</body>
</html>`;

      try {
        await sendEmail(designer.email, emailSubject, emailHtml);
        console.log(`Job email sent to ${designer.email}`);
      } catch (emailErr) {
        console.error(`Failed to send to ${designer.email}:`, emailErr);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      discordMessageId,
      emailsSent: emailTargets.length 
    }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in post-job-contract:", error);
    return new Response(JSON.stringify({ success: false, error: "server_error" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
