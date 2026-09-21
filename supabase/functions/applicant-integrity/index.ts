// @ts-nocheck
// Records copy attempts during the assessment. The first attempt is a warning;
// the second ends the attempt and fails the applicant server-side so a page
// refresh cannot undo it.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, TOKEN_RE } from "../_shared/applicants.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const MAX_FLAGS = 2;

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
      .select("id, status, integrity_flags")
      .eq("access_token", token)
      .maybeSingle();

    if (!applicant) return json({ success: false, error: "not_found" }, 404);

    // Already closed out — report the terminal state without touching anything.
    if (!["invited", "in_review"].includes(applicant.status)) {
      return json({
        success: true,
        flags: applicant.integrity_flags || 0,
        rejected: applicant.status === "failed",
        warning: false,
      });
    }

    const flags = (applicant.integrity_flags || 0) + 1;
    const rejected = flags >= MAX_FLAGS;

    await supabase
      .from("applicants")
      .update({
        integrity_flags: flags,
        integrity_status: rejected
          ? `Rejected automatically after ${flags} copy attempts during the assessment.`
          : `Warned after ${flags} copy attempt during the assessment.`,
        ...(rejected ? { status: "failed", passed: false, score: 0 } : {}),
      })
      .eq("id", applicant.id);

    if (rejected) {
      // Close any open attempt so it can never be submitted.
      await supabase
        .from("applicant_assessments")
        .update({
          submitted_at: new Date().toISOString(),
          passed: false,
          score: 0,
          practical_review_status: "void_integrity",
        })
        .eq("applicant_id", applicant.id)
        .is("submitted_at", null);
    }

    return json({
      success: true,
      flags,
      rejected,
      warning: !rejected,
      message: rejected
        ? "Copying was detected a second time, so this attempt has been closed."
        : "Copying was detected. One more attempt and your application is rejected automatically.",
    });
  } catch (err) {
    console.error("applicant-integrity error:", err);
    return json({ success: false, error: "unexpected_error" }, 500);
  }
});
