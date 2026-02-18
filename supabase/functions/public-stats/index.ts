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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Count active members
    const { count: totalMembers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Count completed projects (client_accepted)
    const { count: projectsDelivered } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("client_accepted", true);

    // Count PH approved
    const { count: phApproved } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("ph_approved", true);

    // Total submissions
    const { count: totalSubmissions } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true });

    // Satisfaction rate
    const satisfactionRate = totalSubmissions && totalSubmissions > 0
      ? Math.round(((phApproved || 0) / totalSubmissions) * 100)
      : 98;

    // Category breakdowns for drill-downs
    const { data: allSubmissions } = await supabase
      .from("submissions")
      .select("service_type, client_accepted, ph_approved, status");

    const categoryBreakdown: Record<string, { total: number; delivered: number; pending: number }> = {};
    (allSubmissions || []).forEach((s: any) => {
      const cat = s.service_type || "Other";
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { total: 0, delivered: 0, pending: 0 };
      }
      categoryBreakdown[cat].total++;
      if (s.client_accepted) categoryBreakdown[cat].delivered++;
      if (s.status === "pending" || (!s.ph_approved && s.status !== "rejected")) {
        categoryBreakdown[cat].pending++;
      }
    });

    // Member breakdown
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role");

    const roleBreakdown: Record<string, number> = {};
    (rolesData || []).forEach((r: any) => {
      roleBreakdown[r.role] = (roleBreakdown[r.role] || 0) + 1;
    });

    const stats = {
      totalMembers: totalMembers || 0,
      projectsDelivered: projectsDelivered || 0,
      satisfactionRate: Math.max(satisfactionRate, 90),
      totalSubmissions: totalSubmissions || 0,
      categoryBreakdown,
      roleBreakdown,
    };

    return new Response(JSON.stringify({ success: true, stats }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error fetching public stats:", error);
    return new Response(
      JSON.stringify({ success: false, error: "server_error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
