import { supabase } from '@/integrations/supabase/client';

export type RateLimitAction =
  | 'newsletter_subscribe'
  | 'consultation_booking'
  | 'support_ticket'
  | 'project_inquiry'
  | 'promo_email'
  | 'visitor_chat'
  | 'client_lead'
  | 'client_order'
  | 'registration'
  | 'auth_signin'
  | 'admin_login'
  | 'verification_resend'
  | 'password_reset'
  | 'project_message'
  | 'tip_payment'
  | 'withdrawal_request'
  | 'work_submission'
  | 'talent_application'
  | 'applicant_upload'
  | 'assessment_submit'
  | 'hire_request';

export interface RateLimitResult {
  allowed: boolean;
  /** Friendly message to show the user when blocked. */
  message?: string;
  retryAfterSeconds?: number;
}

function formatWait(seconds: number): string {
  if (!seconds || seconds < 60) return 'a moment';
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

/**
 * Server-side rate limit check. Fails open on network/permission errors so a
 * transient problem never blocks a legitimate submission — the matching edge
 * functions enforce the same limits again before writing anything.
 */
export async function checkRateLimit(
  action: RateLimitAction,
  identifier: string | null | undefined,
): Promise<RateLimitResult> {
  try {
    const { data, error } = await (supabase as any).rpc('check_rate_limit', {
      p_action: action,
      p_identifier: (identifier || 'anonymous').toString().trim().toLowerCase(),
    });
    if (error) return { allowed: true };
    const result = data as { allowed?: boolean; retry_after_seconds?: number } | null;
    if (result && result.allowed === false) {
      const retry = Number(result.retry_after_seconds) || 0;
      return {
        allowed: false,
        retryAfterSeconds: retry,
        message: `Too many attempts. Please try again in ${formatWait(retry)}.`,
      };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}
