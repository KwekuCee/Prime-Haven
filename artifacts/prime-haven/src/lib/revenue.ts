import { supabase } from '@/integrations/supabase/client';

/** Flat share of every job price paid to the professional who completes it. */
export const DEFAULT_REVENUE_SHARE_PERCENT = 70;

let cached: { value: number; at: number } | null = null;

/**
 * Reads the platform-wide revenue share (percentage of a job's price paid to the
 * professional who claimed and completed it). Applies to every profession.
 */
export const getRevenueSharePercent = async (force = false): Promise<number> => {
  if (!force && cached && Date.now() - cached.at < 5 * 60_000) return cached.value;
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'revenue_share_percentage')
      .maybeSingle();
    const raw = (data as { value?: unknown } | null)?.value;
    const parsed = Number(typeof raw === 'object' && raw !== null ? (raw as any).value : raw);
    const value = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REVENUE_SHARE_PERCENT;
    cached = { value, at: Date.now() };
    return value;
  } catch {
    return DEFAULT_REVENUE_SHARE_PERCENT;
  }
};

/** Value a professional keeps from a job price. */
export const shareOf = (jobPrice: number, sharePercent = DEFAULT_REVENUE_SHARE_PERCENT) =>
  Math.round(((Number(jobPrice) || 0) * sharePercent) / 100 * 100) / 100;
