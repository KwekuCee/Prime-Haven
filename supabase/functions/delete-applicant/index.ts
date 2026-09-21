// @ts-nocheck
// Admin action: permanently delete an applicant, their assessment attempts and
// their uploaded files.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, UUID_RE } from "../_shared/applicants.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ success: false, error: "unauthorized" }, 401);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["superadmin", "masteradmin"]);
    if (!roles || roles.length === 0) return json({ success: false, error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const applicantId = String(body.applicantId || "");
    if (!UUID_RE.test(applicantId)) return json({ success: false, error: "invalid_request" }, 400);

    const { data: applicant } = await supabase
      .from("applicants")
      .select("id, full_name, email, cv_url, portfolio_url")
      .eq("id", applicantId)
      .maybeSingle();
    if (!applicant) return json({ success: false, error: "not_found" }, 404);

    const { data: attempts } = await supabase
      .from("applicant_assessments")
      .select("practical_url")
      .eq("applicant_id", applicantId);

    const paths = [
      applicant.cv_url,
      applicant.portfolio_url,
      ...(attempts || []).map((a: any) => a.practical_url),
    ].filter((p: string | null) => !!p);

    if (paths.length > 0) {
      const { error: storageErr } = await supabase.storage.from("applicant-files").remove(paths);
      if (storageErr) console.error("Applicant file cleanup failed:", storageErr);
    }

    await supabase.from("applicant_assessments").delete().eq("applicant_id", applicantId);

    const { error: delErr } = await supabase.from("applicants").delete().eq("id", applicantId);
    if (delErr) {
      console.error("Applicant delete failed:", delErr);
      return json({ success: false, error: "delete_failed" }, 500);
    }

    return json({ success: true, filesRemoved: paths.length });
  } catch (err) {
    console.error("delete-applicant error:", err);
    return json({ success: false, error: "unexpected_error" }, 500);
  }
});
