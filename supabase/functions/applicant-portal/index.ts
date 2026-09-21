// @ts-nocheck
// Token-gated state for the applicant portal. Also records that the intro video
// was watched. Never returns assessment answer keys.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, TOKEN_RE, getSetting, limited } from "../_shared/applicants.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim().toLowerCase();
    const action = String(body.action || "state");

    if (!TOKEN_RE.test(token)) return json({ success: false, error: "invalid_token" }, 400);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await limited(supabase, "applicant_portal", `${token}:${ip}`)) {
      return json({ success: false, error: "rate_limited", message: "Too many requests. Please try again shortly." }, 429);
    }

    const { data: applicant } = await supabase
      .from("applicants")
      .select("id, full_name, email, track, status, score, passed, video_watched_at, user_id")
      .eq("access_token", token)
      .maybeSingle();

    if (!applicant) return json({ success: false, error: "not_found", message: "This link is not valid." }, 404);
    if (applicant.status === "submitted") {
      return json({ success: false, error: "not_invited", message: "Your application is still under review." }, 403);
    }

    if (action === "video_watched" && !applicant.video_watched_at) {
      await supabase
        .from("applicants")
        .update({ video_watched_at: new Date().toISOString() })
        .eq("id", applicant.id);
      applicant.video_watched_at = new Date().toISOString();
    }

    // Once the fee is paid, flip to active as soon as the email is verified.
    if (applicant.status === "paid" && applicant.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email_verified")
        .eq("id", applicant.user_id)
        .maybeSingle();
      if (profile?.email_verified) {
        await supabase.from("applicants").update({ status: "active" }).eq("id", applicant.id);
        applicant.status = "active";
      }
    }

    const videoUrl = await getSetting<string>(supabase, "applicant_intro_video_url", "");
    const discordInvite = await getSetting<string>(supabase, "discord_invite_url", "");

    const { data: assessment } = await supabase
      .from("applicant_assessments")
      .select("id, score, passed, submitted_at, total_questions, correct_count")
      .eq("applicant_id", applicant.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return json({
      success: true,
      applicant: {
        fullName: applicant.full_name,
        email: applicant.email,
        track: applicant.track,
        status: applicant.status,
        score: applicant.score,
        passed: applicant.passed,
        videoWatched: !!applicant.video_watched_at,
      },
      assessment: assessment || null,
      videoUrl,
      discordInvite,
    });
  } catch (err) {
    console.error("applicant-portal error:", err);
    return json({ success: false, error: "unexpected_error" }, 500);
  }
});
