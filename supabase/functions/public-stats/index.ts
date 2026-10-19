import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request): Promise<Response> => {
  // 1. Handle HTTP OPTIONS preflight immediately
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Validate environment configuration with CORS headers on failure
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in public-stats");
      return new Response(
        JSON.stringify({ success: false, error: "server_misconfigured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Count active members
    const { count: totalMembers, error: membersError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (membersError) throw membersError;

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

    // Designer member count only (never expose admin headcount publicly)
    const { count: designerCount } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "designer");

    const stats = {
      totalMembers: totalMembers || 0,
      projectsDelivered: projectsDelivered || 0,
      satisfactionRate: Math.max(satisfactionRate, 90),
      totalSubmissions: totalSubmissions || 0,
      categoryBreakdown,
      designerCount: designerCount || 0,
    };

    return new Response(JSON.stringify({ success: true, stats }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error fetching public stats:", error);
    return new Response(
      JSON.stringify({ success: false, error: "server_error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

