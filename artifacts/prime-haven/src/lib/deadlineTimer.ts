// Deadline & Cooldown utility for Prime Haven

export interface TimerStatus {
  totalHours: number;
  remainingMs: number;
  remainingHours: number;
  remainingMinutes: number;
  remainingSeconds: number;
  formattedCountdown: string;
  percentElapsed: number;
  isExpired: boolean;
  milestone: 'normal' | '50_percent' | '70_percent' | '90_percent' | 'expired';
}

/**
 * Calculates timer status from claimed time and deadline
 * Default deadline is 48 hours if not explicitly provided
 */
export const calculateDeadlineTimer = (
  claimedAt: string | Date | null | undefined,
  deadlineAt: string | Date | null | undefined,
  fallbackHours = 48
): TimerStatus => {
  const now = Date.now();
  const start = claimedAt ? new Date(claimedAt).getTime() : now;
  let end: number;

  if (deadlineAt) {
    end = new Date(deadlineAt).getTime();
  } else {
    end = start + fallbackHours * 60 * 60 * 1000;
  }

  const totalDurationMs = Math.max(end - start, 1000);
  const remainingMs = end - now;
  const elapsedMs = Math.max(0, now - start);
  const percentElapsed = Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));

  const totalHours = Math.round(totalDurationMs / (60 * 60 * 1000));
  const isExpired = remainingMs <= 0;

  const safeRemainingMs = Math.max(0, remainingMs);
  const remainingHours = Math.floor(safeRemainingMs / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((safeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const remainingSeconds = Math.floor((safeRemainingMs % (1000 * 60)) / 1000);

  const formattedCountdown = isExpired
    ? '00h 00m 00s (Expired)'
    : `${String(remainingHours).padStart(2, '0')}h ${String(remainingMinutes).padStart(2, '0')}m ${String(remainingSeconds).padStart(2, '0')}s`;

  let milestone: TimerStatus['milestone'] = 'normal';
  if (isExpired) {
    milestone = 'expired';
  } else if (percentElapsed >= 90) {
    milestone = '90_percent';
  } else if (percentElapsed >= 70) {
    milestone = '70_percent';
  } else if (percentElapsed >= 50) {
    milestone = '50_percent';
  }

  return {
    totalHours,
    remainingMs,
    remainingHours,
    remainingMinutes,
    remainingSeconds,
    formattedCountdown,
    percentElapsed,
    isExpired,
    milestone,
  };
};

/**
 * Checks if a talent is currently in a 48-hour cooldown
 */
export const checkCooldownStatus = (cooldownUntil: string | Date | null | undefined): {
  isInCooldown: boolean;
  remainingHours: number;
  remainingMinutes: number;
  formattedCooldown: string;
} => {
  if (!cooldownUntil) {
    return { isInCooldown: false, remainingHours: 0, remainingMinutes: 0, formattedCooldown: '' };
  }

  const until = new Date(cooldownUntil).getTime();
  const diff = until - Date.now();

  if (diff <= 0) {
    return { isInCooldown: false, remainingHours: 0, remainingMinutes: 0, formattedCooldown: '' };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return {
    isInCooldown: true,
    remainingHours: hours,
    remainingMinutes: minutes,
    formattedCooldown: `${hours}h ${minutes}m`,
  };
};
