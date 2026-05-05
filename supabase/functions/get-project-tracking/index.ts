import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing tracking token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch project by token
    const { data: project, error: projectError } = await supabase
      .from("client_projects")
      .select("id, title, client_name, description, category, status, progress_percentage, deadline, created_at, updated_at, accepted_designer_id, tracking_token")
      .eq("tracking_token", token)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve accepted designer profile (if any)
    let acceptedDesigner: any = null;
    if (project.accepted_designer_id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", project.accepted_designer_id)
        .maybeSingle();
      const { data: dd } = await supabase
        .from("designer_details")
        .select("professional_title, profile_photo_url")
        .eq("user_id", project.accepted_designer_id)
        .maybeSingle();
      if (prof) acceptedDesigner = { ...prof, ...(dd || {}) };
    }

    // Fetch milestones and deliverables
    const [{ data: milestones }, { data: deliverables }] = await Promise.all([
      supabase
        .from("project_milestones")
        .select("id, title, description, status, sort_order, completed_at")
        .eq("project_id", project.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("project_deliverables")
        .select("id, title, file_url, description, uploaded_at")
        .eq("project_id", project.id)
        .order("uploaded_at", { ascending: false }),
    ]);

    return new Response(
      JSON.stringify({ project, milestones: milestones || [], deliverables: deliverables || [], acceptedDesigner }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
