// @ts-nocheck
// Public intake for the talent screening funnel.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, EMAIL_RE, TRACKS, limited } from "../_shared/applicants.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const fullName = String(body.fullName || "").trim().slice(0, 200);
    const email = String(body.email || "").trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim().slice(0, 40) : null;
    const track = String(body.track || "");
    const cvUrl = body.cvUrl ? String(body.cvUrl).slice(0, 500) : null;
    const portfolioUrl = body.portfolioUrl ? String(body.portfolioUrl).slice(0, 500) : null;
    const portfolioLink = body.portfolioLink ? String(body.portfolioLink).trim().slice(0, 500) : null;

    if (fullName.length < 2) return json({ success: false, error: "invalid_name", message: "Please enter your full name." }, 400);
    if (!EMAIL_RE.test(email) || email.length > 255) return json({ success: false, error: "invalid_email", message: "A valid email is required." }, 400);
    if (!TRACKS.includes(track as any)) return json({ success: false, error: "invalid_track", message: "Please choose a role track." }, 400);
    if (!cvUrl) return json({ success: false, error: "missing_cv", message: "Please upload your CV." }, 400);
    if (!portfolioUrl && !portfolioLink) {
      return json({ success: false, error: "missing_portfolio", message: "Please upload a portfolio file or share a link." }, 400);
    }
    if (portfolioLink && !/^https?:\/\//i.test(portfolioLink)) {
      return json({ success: false, error: "invalid_portfolio_link", message: "The portfolio link must start with http:// or https://" }, 400);
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (await limited(supabase, "talent_application", email)) {
      return json({ success: false, error: "rate_limited", message: "Too many attempts. Please try again later." }, 429);
    }

    const { data: existing } = await supabase
      .from("applicants")
      .select("id, status")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return json(
        {
          success: false,
          error: "already_applied",
          message: "We already have an application for this email. Check your inbox — we'll be in touch.",
        },
        409,
      );
    }

    const { data: inserted, error } = await supabase
      .from("applicants")
      .insert({
        full_name: fullName,
        email,
        phone,
        track,
        cv_url: cvUrl,
        portfolio_url: portfolioUrl,
        portfolio_link: portfolioLink,
        status: "submitted",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Applicant insert failed:", error);
      return json({ success: false, error: "save_failed", message: "We could not save your application. Please try again." }, 500);
    }

    // Notify the admin team (best effort).
    try {
      await supabase.from("notifications").insert({
        user_id: null,
        title: "New talent application",
        message: `${fullName} applied for ${track}.`,
        type: "info",
        link: "/superadmin/applicants",
      });
    } catch (_) { /* non-critical */ }

    return json({ success: true, applicantId: inserted.id });
  } catch (err) {
    console.error("submit-application error:", err);
    return json({ success: false, error: "unexpected_error" }, 500);
  }
});
