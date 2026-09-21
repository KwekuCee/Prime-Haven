import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOKEN_RE = /^[a-f0-9]{32,128}$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const cleanText = (value: unknown, max: number) =>
  String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);

const limited = async (supabase: any, identifier: string) => {
  try {
    const { data } = await supabase.rpc("check_rate_limit", { p_action: "project_message", p_identifier: identifier });
    return data && data.allowed === false ? data : null;
  } catch {
    return null;
  }
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = cleanText(url.searchParams.get("token"), 128).toLowerCase();
      if (!TOKEN_RE.test(token)) return json({ error: "invalid_token" }, 400);

      const { data: project } = await supabase
        .from("client_projects")
        .select("id")
        .eq("tracking_token", token)
        .maybeSingle();
      if (!project) return json({ error: "not_found" }, 404);

      const { data: messages } = await supabase
        .from("project_chat_messages")
        .select("id, sender_role, sender_name, content, created_at")
        .eq("project_id", project.id)
        .order("created_at", { ascending: true })
        .limit(100);

      return json({ messages: messages || [] });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const token = cleanText(body.token, 128).toLowerCase();
      const content = cleanText(body.content, 2000);
      const senderName = cleanText(body.senderName, 120);
      if (!TOKEN_RE.test(token) || content.length < 1) return json({ error: "invalid_request" }, 400);

      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const limit = await limited(supabase, `${token}:${ip}`);
      if (limit) return json({ error: "rate_limited", retry_after_seconds: limit.retry_after_seconds }, 429);

      const { data: project } = await supabase
        .from("client_projects")
        .select("id, accepted_designer_id, client_name")
        .eq("tracking_token", token)
        .maybeSingle();
      if (!project) return json({ error: "not_found" }, 404);
      if (!project.accepted_designer_id) return json({ error: "chat_not_ready" }, 403);

      const { error } = await supabase.from("project_chat_messages").insert({
        project_id: project.id,
        sender_role: "client",
        sender_name: senderName || cleanText(project.client_name, 120) || "Client",
        content,
      });
      if (error) {
        console.error("project message insert failed:", error);
        return json({ error: "message_failed" }, 500);
      }

      return json({ success: true });
    }

    return json({ error: "method_not_allowed" }, 405);
  } catch (err) {
    console.error("project-chat error:", err);
    return json({ error: "server_error" }, 500);
  }
});
