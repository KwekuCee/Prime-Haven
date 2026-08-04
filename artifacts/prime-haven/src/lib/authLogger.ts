import { supabase } from "@/integrations/supabase/client";

export type AuthLogEvent =
  | "login_success"
  | "login_failed"
  | "login_blocked_unverified"
  | "logout"
  | "signup"
  | "password_reset_requested"
  | "password_changed"
  | "admin_login_success"
  | "admin_login_failed";

// Events the backend requires a verified session for.
const POST_AUTH_EVENTS: AuthLogEvent[] = [
  "login_success",
  "admin_login_success",
  "logout",
  "password_changed",
];

export async function logAuthEvent(
  event: AuthLogEvent,
  payload: { email?: string; user_id?: string; description?: string } = {},
) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;

    // Post-auth events must carry a real session token. If the session isn't
    // available (e.g. already signed out), skip logging instead of triggering a 401.
    if (POST_AUTH_EVENTS.includes(event) && !token) return;

    await supabase.functions.invoke("log-auth-event", {
      body: { event, ...payload },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch (e) {
    // Never block UX on logging failures
    console.warn("logAuthEvent failed", e);
  }
}

