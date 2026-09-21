// @ts-nocheck
// Scores the multiple-choice answers server-side, stores the practical task for
// manual review, emails the applicant their result, and routes them to payment
// or a polite decline.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";
import { corsHeaders, json, TOKEN_RE, getSetting, limited, emailShell, escapeHtml, safePublicOrigin } from "../_shared/applicants.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function sendResultEmail(applicant: any, result: {
  score: number; passed: boolean; passMark: number; correctCount: number; totalQuestions: number; portalLink: string;
}) {
  const safeName = escapeHtml(applicant.full_name);
  const safeTrack = escapeHtml(applicant.track);
  const safePortalLink = escapeHtml(result.portalLink);
  const body = result.passed
    ? `
      <p style="margin:0 0 16px;">Hi ${safeName},</p>
      <p style="margin:0 0 16px;">You passed the <strong>${safeTrack}</strong> assessment.</p>
      <p style="margin:0 0 16px;">Your score: <strong>${result.score}%</strong> (${result.correctCount} of ${result.totalQuestions} correct). Our bar for this round is ${result.passMark}%.</p>
      <p style="margin:0 0 16px;">One step remains — complete your one-time registration to activate your professional account, dashboard and Discord access.</p>
      <p style="margin:24px 0;"><a href="${safePortalLink}" style="background:#fe4c18;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold;display:inline-block;">Complete my registration</a></p>`
    : `
      <p style="margin:0 0 16px;">Hi ${safeName},</p>
      <p style="margin:0 0 16px;">Thank you for taking the <strong>${safeTrack}</strong> assessment.</p>
      <p style="margin:0 0 16px;">Your score: <strong>${result.score}%</strong> (${result.correctCount} of ${result.totalQuestions} correct). Our bar for this round is ${result.passMark}%, so we won't be moving forward this time — and there is nothing to pay.</p>
      <p style="margin:0 0 16px;">We'd genuinely welcome another application in the future as your portfolio grows.</p>`;

  const transporter = nodemailer.createTransport({
    host: Deno.env.get("SMTP_HOST"),
    port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
    secure: false,
    auth: { user: Deno.env.get("SMTP_USER"), pass: Deno.env.get("SMTP_PASS") },
  });

  await transporter.sendMail({
    from: `"Prime Haven" <${Deno.env.get("SMTP_USER")}>`,
    to: applicant.email,
    subject: result.passed
      ? `You passed the Prime Haven ${applicant.track} assessment`
      : `Your Prime Haven ${applicant.track} assessment result`,
    html: emailShell(body),
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim().toLowerCase();
    const answers = body.answers && typeof body.answers === "object" ? body.answers : null;
    const practicalUrl = body.practicalUrl ? String(body.practicalUrl).slice(0, 500) : null;
    const practicalText = body.practicalText ? String(body.practicalText).slice(0, 4000) : null;
    const origin = safePublicOrigin(body.origin || req.headers.get("origin"));

    if (!TOKEN_RE.test(token)) return json({ success: false, error: "invalid_token" }, 400);
    if (!answers) return json({ success: false, error: "invalid_request", message: "No answers received." }, 400);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: applicant } = await supabase
      .from("applicants")
      .select("id, status, track, full_name, email, access_token")
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
      .select("id, question_ids, practical_task_id")
      .eq("applicant_id", applicant.id)
      .is("submitted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!assessment) return json({ success: false, error: "no_open_attempt", message: "Start the assessment first." }, 400);

    // A practical submission is only required when this track has a task.
    if (assessment.practical_task_id && !practicalUrl && !practicalText) {
      return json({ success: false, error: "missing_practical", message: "Please submit your practical task." }, 400);
    }

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

    let emailSent = false;
    try {
      await sendResultEmail(applicant, {
        score,
        passed,
        passMark,
        correctCount,
        totalQuestions: scoredCount,
        portalLink: `${origin}/applicant/${applicant.access_token}`,
      });
      emailSent = true;
    } catch (mailErr) {
      console.error("Result email failed:", mailErr);
    }

    return json({ success: true, score, passed, passMark, correctCount, totalQuestions: scoredCount, emailSent });
  } catch (err) {
    console.error("submit-assessment error:", err);
    return json({ success: false, error: "unexpected_error" }, 500);
  }
});
