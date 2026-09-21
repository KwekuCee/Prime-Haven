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

export const TRACKS = ["Graphic Design", "Web Development", "UI/UX Design"] as const;

export const TOKEN_RE = /^[a-f0-9]{24,128}$/;

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
