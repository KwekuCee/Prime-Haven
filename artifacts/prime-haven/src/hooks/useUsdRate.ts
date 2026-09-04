import { useEffect, useState } from 'react';
import { getUsdToGhsRate, ghsToUsd, formatUsd, formatGhs } from '@/lib/currency';

/**
 * Prime Haven quotes every amount in US dollars while the ledger and Korapay
 * settle in cedis. This hook resolves the live rate and hands back formatters
 * so screens can show dollars with the cedi figure underneath.
 */
export const useUsdRate = () => {
  const [rate, setRate] = useState(15.5);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    getUsdToGhsRate()
      .then(r => { if (active) { setRate(r.rate); setReady(true); } })
      .catch(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  return {
    rate,
    ready,
    /** GHS ledger amount → formatted USD string. */
    usd: (ghs: number) => formatUsd(ghsToUsd(Number(ghs) || 0, rate)),
    /** GHS ledger amount → formatted GHS string. */
    ghs: (ghs: number) => formatGhs(Number(ghs) || 0),
    /** GHS ledger amount → numeric USD. */
    usdValue: (ghs: number) => ghsToUsd(Number(ghs) || 0, rate),
  };
};
