import { supabase } from '@/integrations/supabase/client';
import { loadClientRevenue } from '@/lib/clientRevenue';

export interface ProfessionAllocationItem {
  slug: string;
  label: string;
  manualAllocation: number;
  contractBudget: number;
  clientOrders: number;
  total: number;
}

export const CANONICAL_SERVICES: Array<{ slug: string; label: string; legacyKey: string }> = [
  { slug: 'graphic-design', label: 'Graphic Design', legacyKey: 'graphic' },
  { slug: 'ui-ux-design', label: 'UI/UX Design', legacyKey: 'uiux' },
  { slug: 'web-development', label: 'Web Development', legacyKey: 'web' },
  { slug: 'mobile-app-development', label: 'Mobile App Development', legacyKey: 'mobile' },
  { slug: 'motion-graphics', label: 'Motion Graphics', legacyKey: 'motion' },
  { slug: 'video-editing', label: 'Video Editing', legacyKey: 'video' },
  { slug: 'social-media-management', label: 'Social Media Management', legacyKey: 'smm' },
  { slug: 'it-solutions', label: 'General IT Solutions', legacyKey: 'it' },
];

/**
 * Normalizes any category string / slug to one of the 8 canonical service slugs.
 */
export const normalizeServiceSlug = (cat: string | null | undefined): string => {
  const c = (cat || '').toLowerCase().trim();
  if (c.includes('graphic') || c.includes('logo') || c.includes('brand') || c.includes('flyer') || c.includes('print')) return 'graphic-design';
  if (c.includes('ui') || c.includes('ux')) return 'ui-ux-design';
  if (c.includes('web') || c.includes('dev') || c.includes('frontend') || c.includes('fullstack') || c.includes('backend')) return 'web-development';
  if (c.includes('mobile') || c.includes('app') || c.includes('ios') || c.includes('android')) return 'mobile-app-development';
  if (c.includes('motion') || c.includes('animat')) return 'motion-graphics';
  if (c.includes('video') || c.includes('edit')) return 'video-editing';
  if (c.includes('social') || c.includes('smm') || c.includes('media')) return 'social-media-management';
  if (c.includes('it') || c.includes('tech') || c.includes('support') || c.includes('solution') || c.includes('infrastruct')) return 'it-solutions';
  return 'graphic-design';
};

/**
 * Parses numeric budget in GHS from strings like "200", "GH₵ 250", "GH₵500.00".
 */
export const parseBudgetGhs = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Single source of truth for platform revenue, in GHS.
 *
 * Used by both the SuperAdmin dashboard and the Finance Hub so the two screens
 * always show matching figures.
 *
 *   Platform Net = feeRevenue (ledger payments) + clientRevenueGhs (client orders & projects)
 *   Profession Allocation = sum of:
 *     - manual allocations configured per service
 *     - budgets allocated to posted job contracts
 *     - paid client orders for each service
 *   Gross Platform Volume = Platform Net + Profession Allocation + paidEscrow
 */
export interface PlatformRevenue {
  /** Registration fees, manual entries and other completed ledger payments. */
  feeRevenue: number;
  /** Money paid by clients (service checkouts + custom projects). */
  clientRevenueGhs: number;
  /** Net platform incoming payments (feeRevenue + clientRevenueGhs). */
  platformNet: number;
  /** Manually configured monthly revenue figure. */
  configuredMonthly: number;
  /** Client debts still outstanding. */
  escrow: number;
  /** Client debts already settled — counts as realised revenue. */
  paidEscrow: number;
  /** Total gross platform volume. */
  grossRevenue: number;
  /** Sum total of all profession allocations. */
  totalProfessionAllocation: number;
  /** Category-allocated revenue by department & dynamic services list. */
  categoryRevenue: {
    graphic: number;
    uiux: number;
    web: number;
    total: number;
    byService: Record<string, ProfessionAllocationItem>;
    services: ProfessionAllocationItem[];
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const loadPlatformRevenue = async (): Promise<PlatformRevenue> => {
  const [paymentsRes, debtsRes, settingsRes, clientRev, contractsRes, ordersRes, projectsRes] = await Promise.all([
    (supabase.from('payments') as any)
      .select('amount, status, archived_at')
      .eq('status', 'completed')
      .is('archived_at', null),
    (supabase.from('client_debts') as any).select('amount_owed, status'),
    supabase.from('system_settings').select('key, value').in('key', ['monthly_revenue', 'monthly_revenue_by_category']),
    loadClientRevenue().catch(() => null),
    (supabase.from('job_contracts') as any).select('id, category, budget, status'),
    (supabase.from('client_orders') as any).select('id, service_type, price, payment_status'),
    (supabase.from('client_projects') as any).select('id, category, price_ghs, price_usd, paid_at'),
  ]);

  const feeRevenue = ((paymentsRes?.data || []) as Array<{ amount: number | null }>)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  let escrow = 0;
  let paidEscrow = 0;
  ((debtsRes?.data || []) as Array<{ amount_owed: number | null; status: string | null }>).forEach((d) => {
    const amount = Number(d.amount_owed) || 0;
    if (d.status === 'paid') paidEscrow += amount;
    else escrow += amount;
  });

  const settingsRows = (settingsRes?.data || []) as Array<{ key: string; value: any }>;
  const monthlyRevenueSetting = settingsRows.find((s) => s.key === 'monthly_revenue')?.value;
  const categorySetting = settingsRows.find((s) => s.key === 'monthly_revenue_by_category')?.value || {};

  const usdRate = clientRev?.rate || 15.5;

  // Accumulate contract budgets by canonical service
  const contractBudgetsByService: Record<string, number> = {};
  ((contractsRes?.data || []) as Array<{ category: string | null; budget: string | null; status: string | null }>).forEach((c) => {
    // Only exclude cancelled contracts — posted contract budgets show under their profession immediately
    if (c.status === 'cancelled') return;
    const slug = normalizeServiceSlug(c.category);
    const amt = parseBudgetGhs(c.budget);
    contractBudgetsByService[slug] = (contractBudgetsByService[slug] || 0) + amt;
  });

  // Accumulate client orders / projects by canonical service
  const clientOrdersByService: Record<string, number> = {};
  ((ordersRes?.data || []) as Array<{ service_type: string | null; price: number | null; payment_status: string | null }>).forEach((o) => {
    if (!o.payment_status || !['paid', 'success', 'completed'].includes(o.payment_status)) return;
    const slug = normalizeServiceSlug(o.service_type);
    const amt = (Number(o.price) || 0) * usdRate; // order prices are in USD
    clientOrdersByService[slug] = (clientOrdersByService[slug] || 0) + amt;
  });

  ((projectsRes?.data || []) as Array<{ category: string | null; price_ghs: number | null; price_usd: number | null; paid_at: string | null }>).forEach((p) => {
    if (!p.paid_at) return; // only money confirmed by the payment gateway
    const slug = normalizeServiceSlug(p.category);
    const amt = Number(p.price_ghs) || (Number(p.price_usd) || 0) * usdRate;
    clientOrdersByService[slug] = (clientOrdersByService[slug] || 0) + amt;
  });

  // Build items for each of the 8 canonical services
  const byService: Record<string, ProfessionAllocationItem> = {};
  const servicesList: ProfessionAllocationItem[] = [];
  let totalProfessionAllocation = 0;

  CANONICAL_SERVICES.forEach((service) => {
    // Check both slug and legacy key for manual setting
    // Manual/demo allocations are no longer counted — only real money.
    const manualAmt = 0;
    const contractBudget = contractBudgetsByService[service.slug] || 0;
    const clientOrders = clientOrdersByService[service.slug] || 0;
    const total = manualAmt + contractBudget + clientOrders;

    const item: ProfessionAllocationItem = {
      slug: service.slug,
      label: service.label,
      manualAllocation: round2(manualAmt),
      contractBudget: round2(contractBudget),
      clientOrders: round2(clientOrders),
      total: round2(total),
    };

    byService[service.slug] = item;
    servicesList.push(item);
    totalProfessionAllocation += total;
  });

  const graphicTotal = byService['graphic-design']?.total || 0;
  const uiuxTotal = byService['ui-ux-design']?.total || 0;
  const webTotal = byService['web-development']?.total || 0;

  let configuredMonthly = Number(monthlyRevenueSetting?.amount) || 0;
  if (totalProfessionAllocation > 0) {
    configuredMonthly = totalProfessionAllocation;
  }

  const clientRevenueGhs = clientRev?.totalGhs || 0;
  const platformNet = feeRevenue + clientRevenueGhs;

  // Gross Platform Volume = Platform Net + Total Profession Allocation + realised escrow
  const grossRevenue = round2(platformNet + totalProfessionAllocation + paidEscrow);

  return {
    feeRevenue: round2(feeRevenue),
    clientRevenueGhs: round2(clientRevenueGhs),
    platformNet: round2(platformNet),
    configuredMonthly: round2(configuredMonthly),
    escrow: round2(escrow),
    paidEscrow: round2(paidEscrow),
    grossRevenue: round2(grossRevenue),
    totalProfessionAllocation: round2(totalProfessionAllocation),
    categoryRevenue: {
      graphic: round2(graphicTotal),
      uiux: round2(uiuxTotal),
      web: round2(webTotal),
      total: round2(totalProfessionAllocation),
      byService,
      services: servicesList,
    },
  };
};
