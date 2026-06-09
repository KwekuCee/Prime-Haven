import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      if (!token) return new Response(JSON.stringify({ error: "missing_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: project } = await supabase
        .from("client_projects")
        .select("id")
        .eq("tracking_token", token)
        .maybeSingle();
      if (!project) return new Response(JSON.stringify({ error: "not_found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: messages } = await supabase
        .from("project_chat_messages")
        .select("id, sender_role, sender_name, content, created_at")
        .eq("project_id", project.id)
        .order("created_at", { ascending: true })
        .limit(200);

      return new Response(JSON.stringify({ messages: messages || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "POST") {
      const { token, content, senderName } = await req.json();
      if (!token || !content || typeof content !== "string" || content.length > 4000) {
        return new Response(JSON.stringify({ error: "invalid_request" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: project } = await supabase
        .from("client_projects")
        .select("id, accepted_designer_id, client_name")
        .eq("tracking_token", token)
        .maybeSingle();
      if (!project) return new Response(JSON.stringify({ error: "not_found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      await supabase.from("project_chat_messages").insert({
        project_id: project.id,
        sender_role: "client",
        sender_name: (senderName || project.client_name || "Client").slice(0, 120),
        content: content.trim().slice(0, 4000),
      });

      return new Response(JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (err) {
    console.error("project-chat error:", err);
    return new Response(JSON.stringify({ error: "server_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
