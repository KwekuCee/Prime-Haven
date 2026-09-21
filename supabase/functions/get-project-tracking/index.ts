import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOKEN_RE = /^[a-f0-9]{32,128}$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const cleanToken = (value: unknown) => String(value ?? "").trim().toLowerCase().slice(0, 128);

const limited = async (supabase: any, identifier: string) => {
  try {
    const { data } = await supabase.rpc("check_rate_limit", { p_action: "project_tracking", p_identifier: identifier });
    return data && data.allowed === false ? data : null;
  } catch {
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  try {
    const url = new URL(req.url);
    const token = cleanToken(url.searchParams.get("token"));
    if (!TOKEN_RE.test(token)) return json({ error: "Invalid tracking token" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = await limited(supabase, `${token}:${ip}`);
    if (rateLimit) return json({ error: "rate_limited", retry_after_seconds: rateLimit.retry_after_seconds }, 429);

    const { data: project, error: projectError } = await supabase
      .from("client_projects")
      .select("id, title, client_name, description, category, status, progress_percentage, deadline, created_at, updated_at, accepted_designer_id, tracking_token, tip_total")
      .eq("tracking_token", token)
      .maybeSingle();

    if (projectError || !project) return json({ error: "Project not found" }, 404);

    let acceptedDesigner: any = null;
    if (project.accepted_designer_id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", project.accepted_designer_id)
        .maybeSingle();
      const { data: dd } = await supabase
        .from("designer_details")
        .select("professional_title, profile_photo_url")
        .eq("user_id", project.accepted_designer_id)
        .maybeSingle();
      if (prof) acceptedDesigner = { ...prof, ...(dd || {}) };
    }

    const [{ data: milestones }, { data: deliverables }] = await Promise.all([
      supabase
        .from("project_milestones")
        .select("id, title, description, status, sort_order, completed_at")
        .eq("project_id", project.id)
        .order("sort_order", { ascending: true })
        .limit(50),
      supabase
        .from("project_deliverables")
        .select("id, title, file_url, description, uploaded_at")
        .eq("project_id", project.id)
        .order("uploaded_at", { ascending: false })
        .limit(50),
    ]);

    return json({ project, milestones: milestones || [], deliverables: deliverables || [], acceptedDesigner });
  } catch (err) {
    console.error("get-project-tracking error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
