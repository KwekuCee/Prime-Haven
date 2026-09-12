import { supabase } from '@/integrations/supabase/client';
import { getUsdToGhsRate } from '@/lib/currency';

/**
 * Money actually paid by clients.
 *
 * Client money lands in two places:
 *   - `client_orders`  — fixed-price service checkouts (price quoted in USD)
 *   - `client_projects` — custom projects (price_ghs when we billed in cedis,
 *                         otherwise price_usd)
 *
 * Everything is normalised to GHS so it can be added to the ledger figures in
 * the SuperAdmin dashboard and the Finance Hub, which are all cedi-based.
 */
export interface ClientRevenue {
  /** Client money, in GHS. */
  totalGhs: number;
  ordersGhs: number;
  projectsGhs: number;
  /** Number of paid client transactions counted. */
  count: number;
  /** USD → GHS rate used for conversion. */
  rate: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const loadClientRevenue = async (): Promise<ClientRevenue> => {
  const [{ rate }, ordersRes, projectsRes] = await Promise.all([
    getUsdToGhsRate(),
    (supabase.from('client_orders') as any)
      .select('price, payment_status')
      .in('payment_status', ['completed', 'success', 'paid']),
    (supabase.from('client_projects') as any)
      .select('price_ghs, price_usd, paid_at')
      .not('paid_at', 'is', null),
  ]);

  const orders = (ordersRes?.data || []) as Array<{ price: number | null }>;
  const projects = (projectsRes?.data || []) as Array<{ price_ghs: number | null; price_usd: number | null }>;

  // Order prices are quoted in USD everywhere on the site.
  const ordersGhs = orders.reduce((sum, o) => sum + (Number(o.price) || 0) * rate, 0);

  const projectsGhs = projects.reduce((sum, p) => {
    const ghs = Number(p.price_ghs) || 0;
    if (ghs > 0) return sum + ghs;
    return sum + (Number(p.price_usd) || 0) * rate;
  }, 0);

  return {
    ordersGhs: round2(ordersGhs),
    projectsGhs: round2(projectsGhs),
    totalGhs: round2(ordersGhs + projectsGhs),
    count: orders.length + projects.length,
    rate,
  };
};

/** Share of client money that goes to the professional who delivered the work. */
export const TALENT_SHARE_PERCENT = 70;
