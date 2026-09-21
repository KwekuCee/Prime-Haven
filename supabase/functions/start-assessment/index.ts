// @ts-nocheck
// Draws a randomized question set for the applicant's track. Answer keys stay
// on the server — only prompts and options are returned.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, TOKEN_RE, getSetting } from "../_shared/applicants.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const shuffle = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim().toLowerCase();
    if (!TOKEN_RE.test(token)) return json({ success: false, error: "invalid_token" }, 400);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: applicant } = await supabase
      .from("applicants")
      .select("id, track, status, video_watched_at")
      .eq("access_token", token)
      .maybeSingle();

    if (!applicant) return json({ success: false, error: "not_found" }, 404);
    if (!["invited", "in_review"].includes(applicant.status)) {
      return json({ success: false, error: "stage_locked", message: "The assessment is not available at this stage." }, 403);
    }
    if (!applicant.video_watched_at) {
      return json({ success: false, error: "video_required", message: "Please watch the intro video first." }, 403);
    }

    // Reuse an unsubmitted attempt so a refresh doesn't reshuffle the quiz.
    const { data: open } = await supabase
      .from("applicant_assessments")
      .select("id, question_ids, practical_task_id")
      .eq("applicant_id", applicant.id)
      .is("submitted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: task } = await supabase
      .from("assessment_tasks")
      .select("id, title, brief, submission_type")
      .eq("track", applicant.track)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    let assessmentId = open?.id;
    let questionIds: string[] = open?.question_ids || [];

    if (!assessmentId) {
      const quizSize = Number(await getSetting<number>(supabase, "applicant_quiz_size", 15)) || 15;

      const { data: pool } = await supabase
        .from("assessment_questions")
        .select("id")
        .eq("track", applicant.track)
        .eq("is_active", true);

      if (!pool || pool.length === 0) {
        return json({ success: false, error: "no_questions", message: "No questions are available for your track yet." }, 400);
      }

      questionIds = shuffle(pool.map((q: any) => q.id)).slice(0, Math.min(quizSize, pool.length));

      const { data: created, error: createErr } = await supabase
        .from("applicant_assessments")
        .insert({
          applicant_id: applicant.id,
          track: applicant.track,
          question_ids: questionIds,
          practical_task_id: task?.id || null,
        })
        .select("id")
        .single();

      if (createErr) {
        console.error("Assessment create failed:", createErr);
        return json({ success: false, error: "start_failed" }, 500);
      }
      assessmentId = created.id;

      if (applicant.status !== "in_review") {
        await supabase.from("applicants").update({ status: "in_review" }).eq("id", applicant.id);
      }
    }

    const { data: questions } = await supabase
      .from("assessment_questions")
      .select("id, prompt, options, question_type")
      .in("id", questionIds);

    // Preserve the drawn order.
    const ordered = questionIds
      .map((id) => (questions || []).find((q: any) => q.id === id))
      .filter(Boolean);

    return json({
      success: true,
      assessmentId,
      questions: ordered,
      task: task ? { id: task.id, title: task.title, brief: task.brief, submissionType: task.submission_type } : null,
    });
  } catch (err) {
    console.error("start-assessment error:", err);
    return json({ success: false, error: "unexpected_error" }, 500);
  }
});
