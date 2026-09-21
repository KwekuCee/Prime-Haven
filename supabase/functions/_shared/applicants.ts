// Shared helpers for the talent applicant screening funnel.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const safePublicOrigin = (value: unknown) => {
  const fallback = "https://primehaven.tech";
  try {
    const origin = new URL(String(value || fallback)).origin;
    if (origin === "https://primehaven.tech" || origin.endsWith(".lovableproject.com")) return origin;
  } catch {
    /* fall through */
  }
  return fallback;
};

/**
 * Hiring tracks — mirrors src/lib/talentTracks.ts (derived from the homepage
 * services list). Keep both lists in step.
 */
export const TRACKS = [
  "Graphic Design",
  "UI/UX Design",
  "Web Development",
  "Mobile App Development",
  "Motion Graphics",
  "Video Editing",
  "Social Media Management",
  "General IT Solutions",
] as const;

/** Tracks that skip the practical exercise. */
export const TRACKS_WITHOUT_PRACTICAL = ["Social Media Management"];

export const trackHasPractical = (track: string | null | undefined) =>
  !!track && !TRACKS_WITHOUT_PRACTICAL.includes(track);

export const TOKEN_RE = /^[a-f0-9]{24,128}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const APPLICANT_FIELDS =
  "id, full_name, email, phone, track, status, score, passed, video_watched_at, cv_url, portfolio_url, portfolio_link, user_id, payment_reference, created_at";

/** Reads a system setting, falling back to the supplied default. */
export async function getSetting<T>(supabase: any, key: string, fallback: T): Promise<T> {
  try {
    const { data } = await supabase.from("system_settings").select("value").eq("key", key).maybeSingle();
    if (data?.value === undefined || data?.value === null || data?.value === "") return fallback;
    return data.value as T;
  } catch {
    return fallback;
  }
}

/** Server-side rate limit that fails open on transient errors. */
export async function limited(supabase: any, action: string, identifier: string): Promise<boolean> {
  try {
    const { data } = await supabase.rpc("check_rate_limit", { p_action: action, p_identifier: identifier });
    return !!data && data.allowed === false;
  } catch {
    return false;
  }
}

/** Wraps body HTML in the Prime Haven branded email shell. */
export const emailShell = (bodyHtml: string) => `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#0b0b0d;padding:24px 32px;color:#ffffff;font-size:18px;font-weight:bold;">Prime Haven</td></tr>
      <tr><td style="padding:32px;color:#1a1a1a;font-size:15px;line-height:1.6;">${bodyHtml}</td></tr>
      <tr><td style="padding:20px 32px;background:#f6f6f7;color:#888;font-size:12px;">Prime Haven · primehaven.tech</td></tr>
    </table>
  </td></tr>
</table>`;
