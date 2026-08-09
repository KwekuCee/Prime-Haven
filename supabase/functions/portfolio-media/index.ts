import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PUBLIC_STATUSES = ["approved", "ph_approved", "client_accepted"];
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|svg)$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const designerId = String(body?.designer_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(designerId)) {
      return new Response(JSON.stringify({ error: "invalid designer_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: rows, error } = await admin
      .from("submissions")
      .select("id, files_urls, status, designer_id")
      .eq("designer_id", designerId)
      .in("status", PUBLIC_STATUSES)
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) throw error;

    const paths: string[] = [];
    for (const row of rows ?? []) {
      for (const p of (row.files_urls ?? []) as string[]) {
        if (!p) continue;
        if (/^https?:\/\//i.test(p)) continue;
        if (!paths.includes(p)) paths.push(p);
      }
    }

    const media: Record<string, string> = {};
    if (paths.length > 0) {
      const { data: signed } = await admin.storage
        .from("submissions")
        .createSignedUrls(paths.slice(0, 200), 60 * 60 * 24 * 7);
      for (const s of signed ?? []) {
        if (s.path && s.signedUrl) media[s.path] = s.signedUrl;
      }
    }

    return new Response(
      JSON.stringify({
        media,
        images: Object.keys(media).filter((p) => IMAGE_EXT.test(p)),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("portfolio-media error", err);
    return new Response(JSON.stringify({ error: "failed to load portfolio media" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
