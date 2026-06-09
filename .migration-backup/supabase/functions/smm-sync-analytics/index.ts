import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PlatformMetrics {
  followers_gained: number;
  total_reach: number;
  total_impressions: number;
  total_engagement: number;
  total_posts: number;
  top_post_url?: string | null;
}

// TODO: Replace this stub with real API calls per platform (Instagram Graph API,
// TikTok Display API, Meta Graph API, X v2 API, LinkedIn Marketing API, YouTube Data API).
async function fetchPlatformMetrics(platform: string, _token: string): Promise<PlatformMetrics> {
  // Stub returns deterministic-ish mock numbers for now
  const seed = platform.length * 37;
  return {
    followers_gained: 25 + (seed % 50),
    total_reach: 1500 + (seed * 13) % 5000,
    total_impressions: 2200 + (seed * 17) % 8000,
    total_engagement: 120 + (seed * 7) % 400,
    total_posts: 3 + (seed % 5),
    top_post_url: null,
  };
}

function isoWeekStart(d = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Auth: require logged-in user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { user_id, platform } = body as { user_id?: string; platform?: string };

    if (!user_id || !platform) {
      return new Response(JSON.stringify({ success: false, error: "missing_params" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Caller must be the same user OR an admin
    const { data: callerRoles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (callerRoles || []).some((r: any) => r.role === "masteradmin" || r.role === "superadmin");
    if (user.id !== user_id && !isAdmin) {
      return new Response(JSON.stringify({ success: false, error: "forbidden" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch the connection
    const { data: conn, error: connErr } = await supabase
      .from("smm_platform_connections")
      .select("access_token")
      .eq("user_id", user_id)
      .eq("platform", platform)
      .maybeSingle();
    if (connErr) {
      return new Response(JSON.stringify({ success: false, error: "connection_lookup_failed" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const token = conn?.access_token || "";

    // Pull metrics
    const metrics = await fetchPlatformMetrics(platform, token);
    const week_start = isoWeekStart();

    // Upsert weekly analytics for every active campaign this user owns that targets this platform
    const { data: campaigns } = await supabase
      .from("smm_campaigns")
      .select("id, platforms")
      .eq("smm_user_id", user_id);

    const targets = (campaigns || []).filter((c: any) => (c.platforms || []).includes(platform));
    if (targets.length === 0) {
      // Mark connection as synced even if there are no campaigns yet
      await supabase.from("smm_platform_connections")
        .update({ last_synced_at: new Date().toISOString(), followers_count: metrics.followers_gained })
        .eq("user_id", user_id).eq("platform", platform);
      return new Response(JSON.stringify({ success: true, message: "No active campaigns for this platform", synced: 0 }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const rows = targets.map((c: any) => ({
      campaign_id: c.id,
      platform,
      week_start,
      followers_gained: metrics.followers_gained,
      total_reach: metrics.total_reach,
      total_impressions: metrics.total_impressions,
      total_engagement: metrics.total_engagement,
      total_posts: metrics.total_posts,
      top_post_url: metrics.top_post_url,
    }));

    const { error: upErr } = await supabase
      .from("smm_analytics")
      .upsert(rows, { onConflict: "campaign_id,platform,week_start" });
    if (upErr) {
      return new Response(JSON.stringify({ success: false, error: "upsert_failed", details: upErr.message }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    await supabase.from("smm_platform_connections")
      .update({ last_synced_at: new Date().toISOString(), followers_count: metrics.followers_gained })
      .eq("user_id", user_id).eq("platform", platform);

    return new Response(JSON.stringify({ success: true, message: "Sync complete", synced: rows.length }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("smm-sync-analytics error:", err);
    return new Response(JSON.stringify({ success: false, error: "server_error", details: err?.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
