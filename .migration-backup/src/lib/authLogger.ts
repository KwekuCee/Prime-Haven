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

export async function logAuthEvent(
  event: AuthLogEvent,
  payload: { email?: string; user_id?: string; description?: string } = {},
) {
  try {
    await supabase.functions.invoke("log-auth-event", {
      body: { event, ...payload },
    });
  } catch (e) {
    // Never block UX on logging failures
    console.warn("logAuthEvent failed", e);
  }
}
