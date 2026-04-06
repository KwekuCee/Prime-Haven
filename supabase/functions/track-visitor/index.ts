import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "primehaven-salt-2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { page_path, user_id } = body;

    // Get visitor IP from headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("cf-connecting-ip") || 
               "unknown";

    const ipHash = await hashIP(ip);

    // Rate limit: max 1 record per IP per 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("visitor_analytics")
      .select("id")
      .eq("ip_hash", ipHash)
      .gte("created_at", fiveMinAgo)
      .limit(1);

    if (recent && recent.length > 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Geo-locate IP using free API
    let geo: any = {};
    try {
      if (ip !== "unknown" && ip !== "127.0.0.1") {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,lat,lon`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.status === "success") {
            geo = {
              country: geoData.country,
              country_code: geoData.countryCode,
              region: geoData.regionName,
              city: geoData.city,
              latitude: geoData.lat,
              longitude: geoData.lon,
            };
          }
        }
      }
    } catch (e) {
      console.error("Geo lookup failed:", e);
    }

    const userAgent = req.headers.get("user-agent") || null;

    await supabase.from("visitor_analytics").insert({
      ip_hash: ipHash,
      country: geo.country || null,
      country_code: geo.country_code || null,
      city: geo.city || null,
      region: geo.region || null,
      latitude: geo.latitude || null,
      longitude: geo.longitude || null,
      page_path: page_path || "/",
      user_agent: userAgent,
      is_registered_user: !!user_id,
      user_id: user_id || null,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("track-visitor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
