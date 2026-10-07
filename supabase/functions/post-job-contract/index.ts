import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail as resendSend, FROM_ADDRESS } from "../_shared/resend.ts";
import { withCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Discord channel IDs per category.
// General IT Solutions intentionally has no channel — those postings use the general fallback.
// Each entry can also be overridden with a secret named DISCORD_CHANNEL_<KEY>.
const DISCORD_CHANNEL_IDS: Record<string, string> = {
  "graphic-design": "1470244531680186478",
  "app-design": "1470244675951529984",      // UI/UX Design
  "ui-ux-design": "1470244675951529984",
  "web-dev": "1470244738073497704",
  "web-development": "1470244738073497704",
  "mobile-app-development": "1551455668115079218",
  "video-editing": "1551455732300259449",
  "motion-graphics": "1551455787027795998",
  "social-media-management": "1551455867843379210",
  "it-solutions": "",
};

const channelEnvKey = (key: string) => `DISCORD_CHANNEL_${key.toUpperCase().replace(/-/g, "_")}`;

const DISCORD_CHANNELS: Record<string, string> = Object.fromEntries(
  Object.entries(DISCORD_CHANNEL_IDS).map(([key, id]) => [
    key,
    (Deno.env.get(channelEnvKey(key)) || id || "").trim(),
  ]),
);

// Map service types to categories for email lookup
const CATEGORY_SKILLS: Record<string, string[]> = {
  "graphic-design": [
    "logo", "branding", "print", "flyer", "graphic", "illustrator", "photoshop", "indesign",
    "Logo Design", "Brand Identity", "Print Design", "Flyer Design", "Graphic Design", "Graphic Designer"
  ],
  "app-design": [
    "ui", "ux", "uiux", "ui/ux", "ui-ux", "app", "mobile", "figma", "wireframe", "prototype",
    "UI/UX Design", "UI/UX", "UI/UX Designer", "App Design", "Mobile Design", "Product Design"
  ],
  "ui-ux-design": [
    "ui", "ux", "uiux", "ui/ux", "ui-ux", "app", "mobile", "figma", "wireframe", "prototype",
    "UI/UX Design", "UI/UX", "UI/UX Designer", "App Design", "Mobile Design", "Product Design"
  ],
  "web-dev": [
    "web", "website", "frontend", "backend", "full stack", "fullstack", "react", "html", "css", "javascript", "typescript", "wordpress", "nextjs",
    "Web Design", "Web Development", "Web Developer"
  ],
  "web-development": [
    "web", "website", "frontend", "backend", "full stack", "fullstack", "react", "html", "css", "javascript", "typescript", "wordpress", "nextjs",
    "Web Design", "Web Development", "Web Developer"
  ],
  "mobile-app-development": [
    "mobile", "app", "ios", "android", "flutter", "react native", "swift", "kotlin",
    "Mobile App Development", "Mobile App Developer", "App Developer"
  ],
  "video-editing": [
    "video", "editor", "premiere", "davinci", "cut", "reels", "youtube", "footage", "grading",
    "Video Editing", "Video Editor"
  ],
  "motion-graphics": [
    "motion", "animation", "animator", "after effects", "lottie", "kinetic", "2d animation", "3d animation",
    "Motion Graphics", "Motion Graphics Designer"
  ],
  "social-media-management": [
    "social", "smm", "social media", "community", "content creator", "instagram", "marketing",
    "Social Media Management", "Social Media Manager"
  ],
  "it-solutions": [
    "it", "it solutions", "support", "networking", "sysadmin", "cloud", "server", "infrastructure",
    "General IT Solutions", "IT Specialist"
  ],
};

function getCategoryLabel(id: string): string {
  const categories: Record<string, string> = {
    "graphic-design": "Graphic Design",
    "app-design": "UI/UX Design",
    "ui-ux-design": "UI/UX Design",
    "web-dev": "Web Development",
    "web-development": "Web Development",
    "mobile-app-development": "Mobile App Development",
    "video-editing": "Video Editing",
    "motion-graphics": "Motion Graphics",
    "social-media-management": "Social Media Management",
    "it-solutions": "General IT Solutions",
  };
  return categories[id] || id;
}

function encodeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

async function sendEmail(to: string, subject: string, html: string) {
  await resendSend({ from: FROM_ADDRESS, to, subject, html });
}

async function downloadFile(url: string): Promise<{ data: Uint8Array; contentType: string; name: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const urlPath = new URL(url).pathname;
    const name = urlPath.split("/").pop() || "file";
    return { data, contentType, name };
  } catch (e) {
    console.error("Failed to download file:", url, e);
    return null;
  }
}

async function postToDiscord(channelId: string, embed: any, files?: { name: string; data: Uint8Array; contentType: string }[]): Promise<string | null> {
  try {
    let res: Response;

    if (files && files.length > 0) {
      const formData = new FormData();
      const attachments = files.map((f, i) => ({ id: i, filename: f.name }));
      const imageExts = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
      const firstImage = files.find(f => imageExts.some(ext => f.name.toLowerCase().endsWith(ext)));
      if (firstImage) {
        embed.image = { url: `attachment://${firstImage.name}` };
      }
      const payload = { embeds: [embed], attachments };
      formData.append("payload_json", JSON.stringify(payload));

      for (let i = 0; i < files.length; i++) {
        const blob = new Blob([files[i].data], { type: files[i].contentType });
        formData.append(`files[${i}]`, blob, files[i].name);
      }

      res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        body: formData,
      });
    } else {
      res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ embeds: [embed] }),
      });
    }

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

serve(withCors(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id);
    const isAdmin = (roleRow || []).some((r: any) => r.role === 'masteradmin' || r.role === 'superadmin');
    if (!isAdmin) return new Response(JSON.stringify({ success: false, error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json();

    // Handle status update action
    if (body.action === "update_status") {
      const { discordMessageId, discordChannelId, title, newStatus, contractId } = body;

      if (discordMessageId && discordChannelId && DISCORD_BOT_TOKEN) {
        const statusEmoji: Record<string, string> = {
          active: "🟢",
          in_progress: "🔵",
          completed: "✅",
          cancelled: "❌",
        };
        const emoji = statusEmoji[newStatus] || "🔄";

        const embed = {
          title: `${emoji} Status Update: ${(title || "").slice(0, 200)}`,
          description: `This job has been updated to **${newStatus.replace(/_/g, " ").toUpperCase()}**`,
          color: newStatus === "completed" ? 0x22c55e : newStatus === "cancelled" ? 0xef4444 : newStatus === "in_progress" ? 0x3b82f6 : 0xfe4c18,
          footer: { text: "Prime Haven • Job Contracts" },
          timestamp: new Date().toISOString(),
        };

        await postToDiscord(discordChannelId, embed);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const isResend = body.action === "resend_notifications";

    // Handle resend_notifications action for an existing contract
    if (isResend) {
      const { contractId } = body;
      if (!contractId) {
        return new Response(JSON.stringify({ success: false, error: "Missing contractId" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const { data: contract, error: cErr } = await supabase
        .from("job_contracts")
        .select("*")
        .eq("id", contractId)
        .maybeSingle();

      if (cErr || !contract) {
        return new Response(JSON.stringify({ success: false, error: "Contract not found" }), {
          status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      body.title = contract.title;
      body.description = contract.description;
      body.category = contract.category;
      body.deadline = contract.deadline;
      body.budget = contract.budget;
      body.requirements = contract.requirements;
      body.clientName = contract.client_name;
      body.specialInstructions = contract.special_instructions;
      body.referenceFiles = contract.reference_files;
      body.targetProfessions = contract.target_professions;
    }

    // Original create or resend flow
    const { title, description, category, deadline, budget, requirements, clientName, clientEmail, clientWhatsapp, specialInstructions, contractId, referenceFiles, targetProfessions } = body;

    if (!title || !description || !category) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 1. Post to Discord (only on new contract creation)
    const channelId = DISCORD_CHANNELS[category];
    let discordMessageId: string | null = null;

    if (!isResend && channelId && DISCORD_BOT_TOKEN) {
      const safeTitle = (title || "").slice(0, 256);
      const safeDesc = (description || "").slice(0, 2048);

      const fields: any[] = [];
      if (budget) fields.push({ name: "💰 Budget", value: budget.slice(0, 1024), inline: true });
      if (deadline) fields.push({ name: "📅 Deadline", value: new Date(deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), inline: true });
      if (clientName) fields.push({ name: "🏢 Client", value: clientName.slice(0, 1024), inline: true });
      if (requirements) fields.push({ name: "📋 Requirements", value: requirements.slice(0, 1024) });
      if (specialInstructions) fields.push({ name: "⚠️ Special Instructions", value: specialInstructions.slice(0, 1024) });

      const embed: any = {
        title: `🎨 New Job: ${safeTitle}`,
        description: safeDesc,
        color: 0xfe4c18,
        fields,
        footer: { text: "Prime Haven • Job Contracts" },
        timestamp: new Date().toISOString(),
      };

      const downloadedFiles: { name: string; data: Uint8Array; contentType: string }[] = [];
      if (referenceFiles && referenceFiles.length > 0) {
        fields.push({ name: "📎 Reference Files", value: `${referenceFiles.length} file(s) attached` });
        const downloads = await Promise.all(referenceFiles.slice(0, 10).map((url: string) => downloadFile(url)));
        for (const file of downloads) {
          if (file) downloadedFiles.push(file);
        }
        console.log(`Downloaded ${downloadedFiles.length}/${referenceFiles.length} reference files for Discord`);
      }

      discordMessageId = await postToDiscord(channelId, embed, downloadedFiles.length > 0 ? downloadedFiles : undefined);
    }

    // 2. Update contract with discord_message_id if provided
    if (!isResend && contractId && discordMessageId) {
      await supabase
        .from("job_contracts")
        .update({ discord_message_id: discordMessageId, discord_channel_id: channelId })
        .eq("id", contractId);
    }

    // 3. Look up client details from clients table if clientName is provided
    let resolvedEmail = clientEmail || null;
    let resolvedWhatsapp = clientWhatsapp || null;

    if (clientName && (!resolvedEmail || !resolvedWhatsapp)) {
      const { data: clientRecord } = await supabase
        .from("clients")
        .select("email, whatsapp")
        .eq("name", clientName)
        .maybeSingle();

      if (clientRecord) {
        if (!resolvedEmail && clientRecord.email) resolvedEmail = clientRecord.email;
        if (!resolvedWhatsapp && clientRecord.whatsapp) resolvedWhatsapp = clientRecord.whatsapp;
      }
    }

    // 4. Send emails to relevant designers
    const skills = CATEGORY_SKILLS[category] || [];
    const catLower = (category || "").toLowerCase();

    // Query active designers or any profiles where is_active is true or null
    const { data: allDesigners } = await supabase
      .from("profiles")
      .select("id, email, full_name, is_active")
      .neq("is_active", false);

    const { data: allDetails } = await supabase
      .from("designer_details")
      .select("user_id, skills, professional_title, professions");

    const { data: allApplicants } = await supabase
      .from("applicants")
      .select("user_id, email, track");

    const applicantTrackByUserId = new Map<string, string>();
    const applicantTrackByEmail = new Map<string, string>();
    for (const a of allApplicants || []) {
      if (a.user_id && a.track) applicantTrackByUserId.set(a.user_id, a.track);
      if (a.email && a.track) applicantTrackByEmail.set(a.email.toLowerCase(), a.track);
    }

    const detailsMap = new Map((allDetails || []).map((d: any) => [d.user_id, d]));

    const targetDesigners = (allDesigners || []).filter((d: any) => {
      const detail = detailsMap.get(d.id);
      const designerSkills = (detail?.skills || []).map((s: string) => s.toLowerCase());
      const designerTitle = (detail?.professional_title || "").toLowerCase();
      const designerProfessions = (detail?.professions || []).map((p: string) => p.toLowerCase());
      const applicantTrack = (applicantTrackByUserId.get(d.id) || applicantTrackByEmail.get(d.email?.toLowerCase()) || "").toLowerCase();

      const allTokens = [
        designerTitle,
        applicantTrack,
        ...designerSkills,
        ...designerProfessions,
      ].filter(Boolean);

      // Explicit target professions specified on the contract
      const contractTargetProfs = (targetProfessions || []).map((tp: string) => tp.toLowerCase());
      if (contractTargetProfs.length > 0) {
        const matchesTarget = contractTargetProfs.some((tp: string) =>
          allTokens.some((tok: string) => tok.includes(tp) || tp.includes(tok))
        );
        if (matchesTarget) return true;
      }

      // Check category skills
      if (skills.some(skill => allTokens.some((tok: string) => tok.includes(skill.toLowerCase()) || skill.toLowerCase().includes(tok)))) {
        return true;
      }

      // Category-specific fallback matching
      if (catLower.includes('ui') || catLower.includes('ux') || catLower.includes('app-design')) {
        if (allTokens.some(tok => tok.includes('ui') || tok.includes('ux') || tok.includes('figma') || tok.includes('product design'))) return true;
      }
      if (catLower.includes('web')) {
        if (allTokens.some(tok => tok.includes('web') || tok.includes('dev') || tok.includes('frontend') || tok.includes('fullstack'))) return true;
      }
      if (catLower.includes('mobile')) {
        if (allTokens.some(tok => tok.includes('mobile') || tok.includes('ios') || tok.includes('android') || tok.includes('flutter'))) return true;
      }
      if (catLower.includes('video')) {
        if (allTokens.some(tok => tok.includes('video') || tok.includes('edit') || tok.includes('premiere') || tok.includes('davinci'))) return true;
      }
      if (catLower.includes('motion')) {
        if (allTokens.some(tok => tok.includes('motion') || tok.includes('animat') || tok.includes('after effects'))) return true;
      }
      if (catLower.includes('graphic')) {
        if (allTokens.some(tok => tok.includes('graphic') || tok.includes('logo') || tok.includes('brand') || tok.includes('print'))) return true;
      }
      if (catLower.includes('social') || catLower.includes('smm')) {
        if (allTokens.some(tok => tok.includes('social') || tok.includes('smm') || tok.includes('community'))) return true;
      }
      if (catLower.includes('it')) {
        if (allTokens.some(tok => tok.includes('it') || tok.includes('network') || tok.includes('support') || tok.includes('sysadmin'))) return true;
      }

      return false;
    });

    console.log(`Found ${targetDesigners.length} designers for category ${category}`);

    // Create in-app notifications
    const notifications = targetDesigners.map(d => ({
      user_id: d.id,
      title: '💼 New Job Available',
      message: `A new ${getCategoryLabel(category)} job was just posted: "${title}"`,
      type: 'info',
      link: '/dashboard',
    }));

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    const emailTargets = targetDesigners; // Notify all relevant designers
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
    ${referenceFiles && referenceFiles.length > 0 ? `<div style="text-align:center;margin:20px 0;"><img src="${referenceFiles[0]}" alt="Reference" style="max-width:100%;border-radius:12px;border:1px solid rgba(254,76,24,0.2);" /></div>` : ""}
    <div style="text-align:center;">
      <a href="https://primehaven.tech/dashboard" class="cta">View Dashboard</a>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Prime Haven. All rights reserved.</p>
      <p><a href="https://primehaven.tech">primehaven.tech</a></p>
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
}));
