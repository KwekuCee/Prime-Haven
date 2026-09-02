import { supabase } from '@/integrations/supabase/client';

/**
 * Prime Haven prices are quoted in US dollars.
 * Korapay / Paystack settle Ghanaian mobile money in GHS, so we convert
 * at the current international rate right before the checkout opens.
 */
export const JOIN_FEE_USD = 15;

/** Used only if every live/remote rate source fails. */
const FALLBACK_USD_TO_GHS = 15.5;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let cached: { rate: number; source: RateSource; fetchedAt: number } | null = null;

export type RateSource = 'live' | 'system' | 'fallback';

export interface ExchangeRate {
  /** How many GHS one USD buys. */
  rate: number;
  source: RateSource;
  fetchedAt: Date;
}

const fetchWithTimeout = async (url: string, ms = 6000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

/** Live mid-market rate from public, keyless FX APIs (tries two providers). */
const fetchLiveRate = async (): Promise<number | null> => {
  try {
    const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const json = await res.json();
      const ghs = Number(json?.rates?.GHS);
      if (Number.isFinite(ghs) && ghs > 0) return ghs;
    }
  } catch {
    /* try next provider */
  }
  try {
    const res = await fetchWithTimeout('https://api.frankfurter.app/latest?from=USD&to=GHS');
    if (res.ok) {
      const json = await res.json();
      const ghs = Number(json?.rates?.GHS);
      if (Number.isFinite(ghs) && ghs > 0) return ghs;
    }
  } catch {
    /* fall through */
  }
  return null;
};

/** Admin-managed rate stored in `system_settings.usd_to_ghs_rate`. */
const fetchSystemRate = async (): Promise<number | null> => {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'usd_to_ghs_rate')
      .maybeSingle();
    const v: unknown = data?.value;
    if (typeof v === 'number' && v > 0) return v;
    if (typeof v === 'string' && parseFloat(v) > 0) return parseFloat(v);
    if (v && typeof v === 'object' && 'rate' in (v as Record<string, unknown>)) {
      const r = parseFloat(String((v as Record<string, unknown>).rate));
      if (r > 0) return r;
    }
  } catch {
    /* ignore */
  }
  return null;
};

/**
 * Resolve the current USD → GHS rate.
 * Order: live international rate → admin system setting → static fallback.
 * Result is cached for 10 minutes so repeated calls during checkout are instant.
 */
export const getUsdToGhsRate = async (force = false): Promise<ExchangeRate> => {
  if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { rate: cached.rate, source: cached.source, fetchedAt: new Date(cached.fetchedAt) };
  }

  let rate = await fetchLiveRate();
  let source: RateSource = 'live';

  if (!rate) {
    rate = await fetchSystemRate();
    source = 'system';
  }
  if (!rate) {
    rate = FALLBACK_USD_TO_GHS;
    source = 'fallback';
  }

  cached = { rate, source, fetchedAt: Date.now() };
  return { rate, source, fetchedAt: new Date() };
};

/** Convert a USD amount to GHS for the gateway, rounded UP to the nearest pesewa. */
export const usdToGhs = (usd: number, rate: number) => Math.ceil(usd * rate * 100) / 100;

/** Convert a GHS amount to USD for display, rounded to the nearest cent. */
export const ghsToUsd = (ghs: number, rate: number) => Math.round((ghs / rate) * 100) / 100;

export const formatUsd = (amount: number, opts: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  }).format(amount);

export const formatGhs = (amount: number) =>
  `GH₵${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
