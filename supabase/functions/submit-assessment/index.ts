// @ts-nocheck
// Scores the multiple-choice answers server-side, stores the practical task for
// manual review, and routes the applicant to payment or a polite decline.
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
    const answers = body.answers && typeof body.answers === "object" ? body.answers : null;
    const practicalUrl = body.practicalUrl ? String(body.practicalUrl).slice(0, 500) : null;
    const practicalText = body.practicalText ? String(body.practicalText).slice(0, 4000) : null;

    if (!TOKEN_RE.test(token)) return json({ success: false, error: "invalid_token" }, 400);
    if (!answers) return json({ success: false, error: "invalid_request", message: "No answers received." }, 400);
    if (!practicalUrl && !practicalText) {
      return json({ success: false, error: "missing_practical", message: "Please submit your practical task." }, 400);
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: applicant } = await supabase
      .from("applicants")
      .select("id, status, track")
      .eq("access_token", token)
      .maybeSingle();

    if (!applicant) return json({ success: false, error: "not_found" }, 404);
    if (await limited(supabase, "assessment_submit", applicant.id)) {
      return json({ success: false, error: "rate_limited", message: "Too many attempts. Please try again later." }, 429);
    }
    if (!["invited", "in_review"].includes(applicant.status)) {
      return json({ success: false, error: "stage_locked", message: "This assessment has already been submitted." }, 403);
    }

    const { data: assessment } = await supabase
      .from("applicant_assessments")
      .select("id, question_ids")
      .eq("applicant_id", applicant.id)
      .is("submitted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!assessment) return json({ success: false, error: "no_open_attempt", message: "Start the assessment first." }, 400);

    const { data: questions } = await supabase
      .from("assessment_questions")
      .select("id, question_type, correct_option, points")
      .in("id", assessment.question_ids);

    let earned = 0;
    let possible = 0;
    let correctCount = 0;
    let scoredCount = 0;

    for (const q of questions || []) {
      if (q.question_type !== "multiple_choice" || q.correct_option === null) continue;
      const points = q.points || 1;
      possible += points;
      scoredCount += 1;
      if (Number(answers[q.id]) === Number(q.correct_option)) {
        earned += points;
        correctCount += 1;
      }
    }

    const passMark = Number(await getSetting<number>(supabase, "applicant_pass_mark", 70)) || 70;
    const score = possible > 0 ? Math.round((earned / possible) * 1000) / 10 : 0;
    const passed = score >= passMark;

    await supabase
      .from("applicant_assessments")
      .update({
        answers,
        correct_count: correctCount,
        total_questions: scoredCount,
        score,
        passed,
        practical_url: practicalUrl,
        practical_text: practicalText,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", assessment.id);

    await supabase
      .from("applicants")
      .update({ score, passed, status: passed ? "passed" : "failed" })
      .eq("id", applicant.id);

    return json({ success: true, score, passed, passMark, correctCount, totalQuestions: scoredCount });
  } catch (err) {
    console.error("submit-assessment error:", err);
    return json({ success: false, error: "unexpected_error" }, 500);
  }
});
