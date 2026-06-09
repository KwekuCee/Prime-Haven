// Project chat notifier — Arkesel-ready stub.
// When ARKESEL_API_KEY is set, this will send an email via Arkesel's Email API.
// Until then, it returns success but logs the intent so the chat flow is not blocked.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ARKESEL_API_KEY = Deno.env.get("ARKESEL_API_KEY");
const ARKESEL_FROM = Deno.env.get("ARKESEL_FROM_EMAIL") || "no-reply@primehaven.tech";
const ARKESEL_SENDER_NAME = Deno.env.get("ARKESEL_SENDER_NAME") || "Prime Haven";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userRes, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !userRes?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const senderId = userRes.user.id;

    const body = await req.json();
    const projectId: string = body?.projectId;
    const content: string = String(body?.content ?? "").slice(0, 2000);
    const senderRole: string = body?.senderRole === "client" ? "client" : "designer";

    if (!projectId || !content) {
      return new Response(JSON.stringify({ error: "invalid_request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up project + designer + client emails
    const { data: project } = await supabase
      .from("client_projects")
      .select("id, title, client_email, created_by, accepted_designer_id")
      .eq("id", projectId)
      .maybeSingle();

    if (!project) {
      return new Response(JSON.stringify({ error: "project_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine recipient email (the other party)
    let recipientEmail: string | null = null;
    let recipientName = "there";
    let senderName = "Prime Haven member";

    // Sender lookup
    const { data: senderProfile } = await supabase
      .from("profiles").select("full_name, email").eq("id", senderId).maybeSingle();
    if (senderProfile?.full_name) senderName = senderProfile.full_name;

    if (senderRole === "client") {
      // Send to accepted designer
      if (project.accepted_designer_id) {
        const { data: designer } = await supabase
          .from("profiles").select("email, full_name")
          .eq("id", project.accepted_designer_id).maybeSingle();
        recipientEmail = designer?.email || null;
        recipientName = designer?.full_name?.split(" ")[0] || "Designer";
      }
    } else {
      // Designer → client (project owner)
      recipientEmail = project.client_email || null;
      if (project.created_by) {
        const { data: clientProfile } = await supabase
          .from("profiles").select("email, full_name")
          .eq("id", project.created_by).maybeSingle();
        recipientEmail = clientProfile?.email || recipientEmail;
        recipientName = clientProfile?.full_name?.split(" ")[0] || "there";
      }
    }

    if (!recipientEmail) {
      console.log("notify-project-message: no recipient email resolved", { projectId, senderRole });
      return new Response(JSON.stringify({ success: true, skipped: "no_recipient" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = `New message about "${project.title || 'your project'}"`;
    const html = `
      <div style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:32px;">
        <div style="max-width:560px;margin:0 auto;background:#141414;border:1px solid #2a2a2a;border-radius:14px;overflow:hidden;">
          <div style="height:4px;background:linear-gradient(90deg,#fe4c18,#ff7a45);"></div>
          <div style="padding:28px;">
            <h2 style="margin:0 0 12px;color:#fff;">Hi ${escapeHtml(recipientName)},</h2>
            <p style="color:#bbb;font-size:14px;line-height:1.6;margin:0 0 16px;">
              <strong style="color:#fe4c18;">${escapeHtml(senderName)}</strong> sent you a new message on
              <strong>${escapeHtml(project.title || 'your project')}</strong>.
            </p>
            <div style="background:rgba(255,255,255,0.04);border:1px solid #2a2a2a;border-radius:10px;padding:16px;font-size:14px;color:#ddd;font-style:italic;">
              "${escapeHtml(content)}"
            </div>
            <p style="margin:24px 0 0;font-size:13px;color:#888;">
              Reply on platform — for your protection, do not move this conversation off Prime Haven.
            </p>
            <a href="https://primehaven.tech/project-chat/${projectId}" style="display:inline-block;margin-top:18px;background:#fe4c18;color:#000;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;">Open Chat</a>
          </div>
        </div>
      </div>
    `;

    if (!ARKESEL_API_KEY) {
      console.log(
        "notify-project-message: ARKESEL_API_KEY not configured, skipping send.",
        { to: recipientEmail, subject },
      );
      return new Response(JSON.stringify({ success: true, skipped: "no_api_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Arkesel Email API (https://developers.arkesel.com/)
    const arkRes = await fetch("https://sms.arkesel.com/api/v2/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": ARKESEL_API_KEY,
      },
      body: JSON.stringify({
        from: ARKESEL_FROM,
        sender_name: ARKESEL_SENDER_NAME,
        to: recipientEmail,
        subject,
        body: html,
      }),
    });

    if (!arkRes.ok) {
      const errText = await arkRes.text();
      console.error("Arkesel send failed:", arkRes.status, errText);
      return new Response(JSON.stringify({ error: "send_failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-project-message error:", err);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
