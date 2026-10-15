import { supabase } from '@/integrations/supabase/client';
import { loadClientRevenue } from '@/lib/clientRevenue';

export interface ProfessionAllocationItem {
  slug: string;
  label: string;
  manualAllocation: number;
  contractBudget: number;
  clientOrders: number;
  total: number;
  talentPool70: number;
  platformShare30: number;
}

export const CANONICAL_SERVICES: Array<{ slug: string; label: string; legacyKey: string }> = [
  { slug: 'graphic-design', label: 'Graphic Design', legacyKey: 'graphic' },
  { slug: 'ui-ux-design', label: 'UI/UX Design', legacyKey: 'uiux' },
  { slug: 'web-development', label: 'Web Development', legacyKey: 'web' },
  { slug: 'mobile-app-development', label: 'Mobile App Development', legacyKey: 'mobile' },
  { slug: 'motion-graphics', label: 'Motion Graphics', legacyKey: 'motion' },
  { slug: 'video-editing', label: 'Video Editing', legacyKey: 'video' },
  { slug: 'social-media-management', label: 'Social Media Management', legacyKey: 'smm' },
  { slug: 'general-it-solutions', label: 'General IT Solutions', legacyKey: 'it-solutions' },
];

/**
 * Normalizes any category string / slug to one of the canonical service slugs.
 * NOTE: Any category containing 'mobile', 'app', 'ios', or 'android' maps directly
 * to 'ui-ux-design', consolidating all app & UI work into the UI/UX Design department.
 */
export const normalizeServiceSlug = (cat: string | null | undefined): string => {
  const c = (cat || '').toLowerCase().trim();
  if (c.includes('graphic') || c.includes('logo') || c.includes('brand') || c.includes('flyer') || c.includes('print')) return 'graphic-design';
  // Consolidate "Mobile App Development" directly into "ui-ux-design"
  if (c.includes('mobile') || c.includes('app') || c.includes('ios') || c.includes('android')) return 'ui-ux-design';
  if (c.includes('ui') || c.includes('ux')) return 'ui-ux-design';
  if (c.includes('web') || c.includes('dev') || c.includes('frontend') || c.includes('fullstack') || c.includes('backend')) return 'web-development';
  if (c.includes('motion') || c.includes('animat')) return 'motion-graphics';
  if (c.includes('video') || c.includes('edit')) return 'video-editing';
  if (c.includes('social') || c.includes('smm') || c.includes('media')) return 'social-media-management';
  if (c.includes('it') || c.includes('tech') || c.includes('support') || c.includes('solution') || c.includes('infrastruct')) return 'general-it-solutions';
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
 * Provides both all-time financial ledger metrics and current calendar month metrics.
 */
export interface PlatformRevenue {
  /** All-Time Metrics */
  allTimeGross: number;
  allTimeSalariesPaid: number;
  allTimePendingSalaries: number;
  allTimeTalentShare: number;
  allTimePlatformProfit: number;

  /** Current Calendar Month Metrics */
  monthGross: number;
  monthPendingSalaries: number;
  monthSalariesPaid: number;
  monthPlatformProfit: number;

  /** Backward-compatible properties */
  feeRevenue: number;
  clientRevenueGhs: number;
  platformNet: number;
  configuredMonthly: number;
  escrow: number;
  paidEscrow: number;
  grossRevenue: number;
  totalProfessionAllocation: number;
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
  const now = new Date();
  const startOfMonthMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const [
    paymentsRes,
    debtsRes,
    contractsRes,
    ordersRes,
    projectsRes,
    earningsRes,
    designersRes,
    submissionsRes,
    applicantScreeningRes,
    clientRev
  ] = await Promise.all([
    (supabase.from('payments') as any)
      .select('amount, status, type, created_at, archived_at')
      .eq('status', 'completed')
      .is('archived_at', null),
    (supabase.from('client_debts') as any).select('amount_owed, status, created_at, paid_at'),
    (supabase.from('job_contracts') as any).select('id, category, budget, status, created_at, completed_at'),
    (supabase.from('client_orders') as any).select('id, service_type, price, payment_status, project_status, created_at'),
    (supabase.from('client_projects') as any).select('id, category, price_ghs, price_usd, paid_at, status, created_at, completed_at'),
    (supabase.from('job_earnings') as any).select('id, amount, status, created_at'),
    supabase.from('designer_details').select('salary_estimated, user_id'),
    (supabase.from('submissions') as any).select('id, contract_id, client_project_id, client_accepted, status'),
    ((supabase as any).from('applicant_screening')).select('id, payment_status, created_at').eq('payment_status', 'paid').catch(() => ({ data: [] })),
    loadClientRevenue().catch(() => null),
  ]);

  const usdRate = clientRev?.rate || 15.5;

  // Build lookup of accepted/approved submissions
  const acceptedJobIds = new Set<string>();
  ((submissionsRes?.data || []) as Array<{ contract_id?: string | null; client_project_id?: string | null; client_accepted?: boolean; status?: string }>).forEach((s) => {
    if (s.client_accepted || s.status === 'approved') {
      if (s.contract_id) acceptedJobIds.add(s.contract_id);
      if (s.client_project_id) acceptedJobIds.add(s.client_project_id);
    }
  });

  // 1. Process outgoing payouts vs incoming registration fees
  let allTimeSalariesPaid = 0;
  let monthSalariesPaid = 0;
  let allTimeRegistrationFees = 0;
  let monthRegistrationFees = 0;

  const payoutKeywords = ['withdrawal', 'salary', 'payout'];

  ((paymentsRes?.data || []) as Array<{ amount: number | null; type: string | null; created_at: string | null }>).forEach((p) => {
    const amt = Number(p.amount) || 0;
    const typeLower = (p.type || '').toLowerCase();
    const isPayout = payoutKeywords.some((k) => typeLower.includes(k));
    const isThisMonth = p.created_at ? new Date(p.created_at).getTime() >= startOfMonthMs : false;

    if (isPayout) {
      allTimeSalariesPaid += amt;
      if (isThisMonth) monthSalariesPaid += amt;
    } else {
      // Registration fee payments (100% Prime Haven profit)
      const isRegFee = typeLower.includes('registration') || typeLower.includes('reg_fee') || typeLower.includes('screening') || (typeLower !== 'client_order' && amt > 0);
      if (isRegFee) {
        allTimeRegistrationFees += amt;
        if (isThisMonth) monthRegistrationFees += amt;
      }
    }
  });

  // Check applicant_screening table for paid registration fees ($15 / GH₵ 100)
  ((applicantScreeningRes?.data || []) as Array<{ amount?: number | null; created_at?: string | null }>).forEach((s) => {
    const amt = Number(s.amount) || 100;
    allTimeRegistrationFees += amt;
    const isThisMonth = s.created_at ? new Date(s.created_at).getTime() >= startOfMonthMs : false;
    if (isThisMonth) monthRegistrationFees += amt;
  });

  // 2. Process Escrow & Debts
  let escrow = 0;
  let allTimePaidDebts = 0;
  let monthPaidDebts = 0;

  ((debtsRes?.data || []) as Array<{ amount_owed: number | null; status: string | null; created_at: string | null; paid_at: string | null }>).forEach((d) => {
    const amt = Number(d.amount_owed) || 0;
    const isThisMonth = new Date(d.paid_at || d.created_at || 0).getTime() >= startOfMonthMs;
    if (d.status === 'paid') {
      allTimePaidDebts += amt;
      if (isThisMonth) monthPaidDebts += amt;
    } else {
      escrow += amt;
    }
  });

  // 3. Process completed manual job contracts (only realized when completed or accepted)
  const contractBudgetsByService: Record<string, number> = {};
  let allTimeCompletedContractsBudget = 0;
  let monthCompletedContractsBudget = 0;

  ((contractsRes?.data || []) as Array<{ id: string; category: string | null; budget: string | null; status: string | null; created_at: string | null; completed_at: string | null }>).forEach((c) => {
    const statusLower = (c.status || '').toLowerCase().trim();
    const isCompleted = statusLower === 'completed' || acceptedJobIds.has(c.id);
    if (!isCompleted) return;

    const slug = normalizeServiceSlug(c.category);
    const amt = parseBudgetGhs(c.budget);
    contractBudgetsByService[slug] = (contractBudgetsByService[slug] || 0) + amt;
    allTimeCompletedContractsBudget += amt;

    const recordTime = new Date(c.completed_at || c.created_at || 0).getTime();
    if (recordTime >= startOfMonthMs) {
      monthCompletedContractsBudget += amt;
    }
  });

  // 4. Process Client Orders (USD -> GHS) & Client Projects (GHS/USD)
  const clientOrdersByService: Record<string, number> = {};
  let allTimePaidClientOrders = 0;
  let monthPaidClientOrders = 0;
  let allTimeCompletedClientOrders = 0;
  let monthCompletedClientOrders = 0;

  ((ordersRes?.data || []) as Array<{ id: string; service_type: string | null; price: number | null; payment_status: string | null; project_status: string | null; created_at: string | null }>).forEach((o) => {
    const payStatus = (o.payment_status || '').toLowerCase();
    if (!['paid', 'success', 'completed'].includes(payStatus)) return;

    const slug = normalizeServiceSlug(o.service_type);
    const amt = (Number(o.price) || 0) * usdRate;
    clientOrdersByService[slug] = (clientOrdersByService[slug] || 0) + amt;
    allTimePaidClientOrders += amt;

    const recordTime = new Date(o.created_at || 0).getTime();
    if (recordTime >= startOfMonthMs) {
      monthPaidClientOrders += amt;
    }

    const projStatus = (o.project_status || '').toLowerCase();
    const isCompleted = ['completed', 'accepted', 'approved'].includes(projStatus) || acceptedJobIds.has(o.id);
    if (isCompleted) {
      allTimeCompletedClientOrders += amt;
      if (recordTime >= startOfMonthMs) {
        monthCompletedClientOrders += amt;
      }
    }
  });

  ((projectsRes?.data || []) as Array<{ id: string; category: string | null; price_ghs: number | null; price_usd: number | null; paid_at: string | null; payment_status?: string | null; status: string | null; created_at: string | null; completed_at?: string | null }>).forEach((p) => {
    const payStatus = (p.payment_status || '').toLowerCase();
    const isPaid = Boolean(p.paid_at) || ['paid', 'success', 'completed'].includes(payStatus);
    if (!isPaid) return;

    const slug = normalizeServiceSlug(p.category);
    const amt = Number(p.price_ghs) || (Number(p.price_usd) || 0) * usdRate;
    clientOrdersByService[slug] = (clientOrdersByService[slug] || 0) + amt;
    allTimePaidClientOrders += amt;

    const recordTime = new Date(p.paid_at || p.created_at || 0).getTime();
    if (recordTime >= startOfMonthMs) {
      monthPaidClientOrders += amt;
    }

    const projStatus = (p.status || '').toLowerCase();
    const isCompleted = ['completed', 'accepted', 'approved'].includes(projStatus) || acceptedJobIds.has(p.id);
    if (isCompleted) {
      allTimeCompletedClientOrders += amt;
      const compTime = new Date(p.completed_at || p.paid_at || p.created_at || 0).getTime();
      if (compTime >= startOfMonthMs) {
        monthCompletedClientOrders += amt;
      }
    }
  });

  // If completed client orders count is zero, all paid orders are treated as completed for revenue realization
  const effectiveCompletedClientOrders = allTimeCompletedClientOrders > 0 ? allTimeCompletedClientOrders : allTimePaidClientOrders;
  const effectiveMonthCompletedClientOrders = monthCompletedClientOrders > 0 ? monthCompletedClientOrders : monthPaidClientOrders;

  // 5. Build Profession Allocation breakdown — derived strictly from completed contracts & client orders
  const byService: Record<string, ProfessionAllocationItem> = {};
  const servicesList: ProfessionAllocationItem[] = [];
  let totalProfessionAllocation = 0;

  CANONICAL_SERVICES.forEach((service) => {
    const contractBudget = contractBudgetsByService[service.slug] || 0;
    const clientOrders = clientOrdersByService[service.slug] || 0;
    const total = round2(contractBudget + clientOrders);
    const talentPool70 = round2(total * 0.70);
    const platformShare30 = round2(total * 0.30);

    const item: ProfessionAllocationItem = {
      slug: service.slug,
      label: service.label,
      manualAllocation: 0,
      contractBudget: round2(contractBudget),
      clientOrders: round2(clientOrders),
      total,
      talentPool70,
      platformShare30,
    };

    byService[service.slug] = item;
    if (service.slug === 'general-it-solutions') {
      byService['it-solutions'] = item;
    }
    servicesList.push(item);
    totalProfessionAllocation += total;
  });

  // Alias Mobile App Development directly into UI/UX Design
  byService['mobile-app-development'] = byService['ui-ux-design'];

  // 6. Process Job Earnings
  let allTimePendingEarnings = 0;
  let monthPendingEarnings = 0;
  let allTimeRecordedEarnings = 0;

  ((earningsRes?.data || []) as Array<{ amount: number | null; status: string | null; created_at: string | null }>).forEach((e) => {
    const amt = Number(e.amount) || 0;
    allTimeRecordedEarnings += amt;
    const isThisMonth = e.created_at ? new Date(e.created_at).getTime() >= startOfMonthMs : false;
    if (e.status === 'available' || e.status === 'pending') {
      allTimePendingEarnings += amt;
      if (isThisMonth) monthPendingEarnings += amt;
    }
  });

  const sumDesignerSalaries = ((designersRes?.data || []) as Array<{ salary_estimated: number | null }>).reduce(
    (sum, d) => sum + (Number(d.salary_estimated) || 0),
    0
  );

  // 7. Calculate Consolidated All-Time & Monthly Financials
  // allTimeGross = Completed Manual Contracts Budget + Paid Client Orders + Paid Registration Fees + Realized Paid Debts
  const allTimeGross = round2(allTimeCompletedContractsBudget + allTimePaidClientOrders + allTimeRegistrationFees + allTimePaidDebts);
  const monthGross = round2(monthCompletedContractsBudget + monthPaidClientOrders + monthRegistrationFees + monthPaidDebts);

  // allTimeTalentShare = 70% of All Completed Manual Contracts + 70% of All Completed Client Orders (excludes registration fees)
  const allTimeTalentShare = round2(
    Math.max(
      allTimeRecordedEarnings,
      (allTimeCompletedContractsBudget + effectiveCompletedClientOrders) * 0.70
    )
  );

  // allTimePendingSalaries = Total Talent Accrued (70%) - Total Salaries Paid (or sum of all unpaid job_earnings)
  const formulaPending = Math.max(0, allTimeTalentShare - allTimeSalariesPaid);
  const allTimePendingSalaries = round2(Math.max(formulaPending, allTimePendingEarnings, sumDesignerSalaries));
  const monthPendingSalaries = round2(
    Math.max(
      0,
      (monthCompletedContractsBudget + effectiveMonthCompletedClientOrders) * 0.70 - monthSalariesPaid,
      monthPendingEarnings
    )
  );

  // allTimePlatformProfit = 100% of All Registration Fees + 30% of All Completed Manual Contracts + 30% of All Completed Client Orders
  const allTimePlatformProfit = round2(
    allTimeRegistrationFees + (allTimeCompletedContractsBudget + effectiveCompletedClientOrders) * 0.30
  );

  // monthPlatformProfit = 100% of This Month's Registration Fees + 30% of This Month's Completed Contracts + 30% of This Month's Completed Client Orders
  const monthPlatformProfit = round2(
    monthRegistrationFees + (monthCompletedContractsBudget + effectiveMonthCompletedClientOrders) * 0.30
  );

  const clientRevenueGhs = clientRev?.totalGhs || allTimePaidClientOrders;
  const platformNet = allTimeRegistrationFees + clientRevenueGhs;

  return {
    allTimeGross,
    allTimeSalariesPaid: round2(allTimeSalariesPaid),
    allTimePendingSalaries,
    allTimeTalentShare,
    allTimePlatformProfit,

    monthGross,
    monthPendingSalaries,
    monthSalariesPaid: round2(monthSalariesPaid),
    monthPlatformProfit,

    feeRevenue: round2(allTimeRegistrationFees),
    clientRevenueGhs: round2(clientRevenueGhs),
    platformNet: round2(platformNet),
    configuredMonthly: round2(totalProfessionAllocation),
    escrow: round2(escrow),
    paidEscrow: round2(allTimePaidDebts),
    grossRevenue: allTimeGross,
    totalProfessionAllocation: round2(totalProfessionAllocation),
    categoryRevenue: {
      graphic: round2(byService['graphic-design']?.total || 0),
      uiux: round2(byService['ui-ux-design']?.total || 0),
      web: round2(byService['web-development']?.total || 0),
      total: round2(totalProfessionAllocation),
      byService,
      services: servicesList,
    },
  };
};
