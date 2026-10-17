import { supabase } from "@/integrations/supabase/client";
import { loadClientRevenue } from "@/lib/clientRevenue";

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
  { slug: "graphic-design", label: "Graphic Design", legacyKey: "graphic" },
  { slug: "ui-ux-design", label: "UI/UX Design", legacyKey: "uiux" },
  { slug: "web-development", label: "Web Development", legacyKey: "web" },
  { slug: "mobile-app-development", label: "Mobile App Development", legacyKey: "mobile" },
  { slug: "motion-graphics", label: "Motion Graphics", legacyKey: "motion" },
  { slug: "video-editing", label: "Video Editing", legacyKey: "video" },
  { slug: "social-media-management", label: "Social Media Management", legacyKey: "smm" },
  { slug: "general-it-solutions", label: "General IT Solutions", legacyKey: "it-solutions" },
];

/**
 * Normalizes any category string / slug to one of the canonical service slugs.
 * NOTE: Any category containing 'mobile', 'app', 'ios', or 'android' maps directly
 * to 'ui-ux-design', consolidating all app & UI work into the UI/UX Design department.
 */
export const normalizeServiceSlug = (cat: string | null | undefined): string => {
  const c = (cat || "").toLowerCase().trim();
  if (c.includes("graphic") || c.includes("logo") || c.includes("brand") || c.includes("flyer") || c.includes("print"))
    return "graphic-design";
  // Consolidate "Mobile App Development" directly into "ui-ux-design"
  if (c.includes("mobile") || c.includes("app") || c.includes("ios") || c.includes("android")) return "ui-ux-design";
  if (c.includes("ui") || c.includes("ux")) return "ui-ux-design";
  if (
    c.includes("web") ||
    c.includes("dev") ||
    c.includes("frontend") ||
    c.includes("fullstack") ||
    c.includes("backend")
  )
    return "web-development";
  if (c.includes("motion") || c.includes("animat")) return "motion-graphics";
  if (c.includes("video") || c.includes("edit")) return "video-editing";
  if (c.includes("social") || c.includes("smm") || c.includes("media")) return "social-media-management";
  if (
    c.includes("it") ||
    c.includes("tech") ||
    c.includes("support") ||
    c.includes("solution") ||
    c.includes("infrastruct")
  )
    return "general-it-solutions";
  return "graphic-design";
};

/**
 * Parses numeric budget in GHS from strings like "200", "GH₵ 250", "GH₵500.00".
 */
export const parseBudgetGhs = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  const cleaned = String(val).replace(/[^0-9.]/g, "");
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

const safe = async (q: PromiseLike<{ data: any }>): Promise<any[]> => {
  try {
    const r = await q;
    return (r && r.data) || [];
  } catch {
    return [];
  }
};

const REGISTRATION_FEE_GHS = 100;

export const loadPlatformRevenue = async (): Promise<PlatformRevenue> => {
  const now = new Date();
  const startOfMonthMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const inMonth = (d?: string | null) => (d ? new Date(d).getTime() >= startOfMonthMs : false);

  const [payments, debts, contracts, orders, projects, withdrawals, applicants, submissions, talentDetails, clientRev] =
    await Promise.all([
      safe(
        (supabase.from("payments") as any)
          .select("amount, status, type, created_at, archived_at")
          .eq("status", "completed")
          .is("archived_at", null),
      ),
      safe((supabase.from("client_debts") as any).select("amount_owed, status, created_at, paid_at")),
      safe((supabase.from("job_contracts") as any).select("id, category, budget, status, created_at, completed_at")),
      safe((supabase.from("client_orders") as any).select("id, service_type, price, payment_status, created_at")),
      safe(
        (supabase.from("client_projects") as any).select(
          "id, category, price_ghs, price_usd, paid_at, status, created_at",
        ),
      ),
      safe((supabase.from("withdrawals") as any).select("amount, currency, status, processed_at, created_at")),
      safe((supabase.from("applicants") as any).select("id, paid_at").not("paid_at", "is", null)),
      safe((supabase.from("submissions") as any).select("contract_id, client_accepted, status")),
      safe((supabase.from("designer_details") as any).select("salary_estimated")),
      loadClientRevenue().catch(() => null),
    ]);
  const usdRate = clientRev?.rate || 15.5;

  const totalTalentExpectedSalaries = (talentDetails || []).reduce((sum: number, d: any) => {
    const val = Number(d.salary_estimated) || 0;
    return sum + val;
  }, 0);

  const accepted = new Set<string>();
  submissions.forEach((s: any) => {
    if ((s.client_accepted || s.status === "approved") && s.contract_id) accepted.add(s.contract_id);
  });

  let allTimeGross = 0,
    monthGross = 0;
  // Splittable = subject to the 70/30 talent split. Registration fees are 100% Prime Haven.
  let splittableGross = 0,
    monthSplittable = 0;
  let regFees = 0;
  const contractsBy: Record<string, number> = {};
  const ordersBy: Record<string, number> = {};

  // 1. Manual contracts — counted once completed / accepted.
  contracts.forEach((c: any) => {
    const st = (c.status || "").toLowerCase();
    if (st === "cancelled") return;
    const amt = parseBudgetGhs(c.budget);
    const slug = normalizeServiceSlug(c.category);
    // Department breakdown: total value of all live contracts per profession.
    contractsBy[slug] = (contractsBy[slug] || 0) + amt;
    if (st === "completed" || st === "approved" || st === "accepted" || accepted.has(c.id)) {
      allTimeGross += amt;
      splittableGross += amt;
      if (inMonth(c.completed_at || c.created_at)) {
        monthGross += amt;
        monthSplittable += amt;
      }
    }
  });

  // 2. Gateway payments — client orders (USD) and paid client projects.
  orders.forEach((o: any) => {
    if (!["paid", "success", "completed"].includes((o.payment_status || "").toLowerCase())) return;
    const amt = (Number(o.price) || 0) * usdRate;
    const slug = normalizeServiceSlug(o.service_type);
    ordersBy[slug] = (ordersBy[slug] || 0) + amt;
    allTimeGross += amt;
    splittableGross += amt;
    if (inMonth(o.created_at)) {
      monthGross += amt;
      monthSplittable += amt;
    }
  });
  projects.forEach((p: any) => {
    if (!p.paid_at) return;
    const amt = Number(p.price_ghs) || (Number(p.price_usd) || 0) * usdRate;
    const slug = normalizeServiceSlug(p.category);
    ordersBy[slug] = (ordersBy[slug] || 0) + amt;
    allTimeGross += amt;
    splittableGross += amt;
    if (inMonth(p.paid_at)) {
      monthGross += amt;
      monthSplittable += amt;
    }
  });

  // 3. Registration fees (applicants who paid + fee payments in the ledger).
  let monthRegFees = 0;
  applicants.forEach((a: any) => {
    regFees += REGISTRATION_FEE_GHS;
    allTimeGross += REGISTRATION_FEE_GHS;
    if (inMonth(a.paid_at)) {
      monthGross += REGISTRATION_FEE_GHS;
      monthRegFees += REGISTRATION_FEE_GHS;
    }
  });
  let salariesPaid = 0,
    monthSalariesPaid = 0;
  payments.forEach((p: any) => {
    const t = (p.type || "").toLowerCase();
    const amt = Number(p.amount) || 0;
    if (t.includes("registration") || t.includes("reg_fee") || t.includes("screening")) {
      regFees += amt;
      allTimeGross += amt;
      if (inMonth(p.created_at)) {
        monthGross += amt;
        monthRegFees += amt;
      }
    }
  });

  // 4. Debts: paid debts are revenue; unpaid balance is escrow.
  let escrow = 0,
    paidDebts = 0;
  debts.forEach((d: any) => {
    const amt = Number(d.amount_owed) || 0;
    if ((d.status || "").toLowerCase() === "paid") {
      paidDebts += amt;
      allTimeGross += amt;
      splittableGross += amt;
      if (inMonth(d.paid_at || d.created_at)) {
        monthGross += amt;
        monthSplittable += amt;
      }
    } else escrow += amt;
  });

  // 5. Salaries paid = completed talent withdrawals.
  withdrawals.forEach((w: any) => {
    if (!["completed", "success", "successful", "paid"].includes((w.status || "").toLowerCase())) return;
    const amt = Number(w.amount) || 0;
    const ghs = (w.currency || "GHS").toUpperCase() === "USD" ? amt * usdRate : amt;
    salariesPaid += ghs;
    if (inMonth(w.processed_at || w.created_at)) monthSalariesPaid += ghs;
  });

  const talentShare = splittableGross * 0.7;
  // Prime Haven profit = 30% of splittable revenue + 100% of registration fees.
  const profit = splittableGross * 0.3 + regFees;
  // Strictly the sum of all talents' expected/estimated salaries
  const pending = totalTalentExpectedSalaries;
  const monthPending = totalTalentExpectedSalaries;

  const byService: Record<string, ProfessionAllocationItem> = {};
  const services: ProfessionAllocationItem[] = [];
  let deptTotal = 0;
  CANONICAL_SERVICES.forEach((svc) => {
    const cb = contractsBy[svc.slug] || 0;
    const co = ordersBy[svc.slug] || 0;
    const total = round2(cb + co);
    const item: ProfessionAllocationItem = {
      slug: svc.slug,
      label: svc.slug === "ui-ux-design" ? "UI/UX Design" : svc.label,
      manualAllocation: 0,
      contractBudget: round2(cb),
      clientOrders: round2(co),
      total,
      talentPool70: round2(total * 0.7),
      platformShare30: round2(total * 0.3),
    };
    byService[svc.slug] = item;
    if (svc.slug === "general-it-solutions") byService["it-solutions"] = item;
    services.push(item);
    deptTotal += total;
  });
  byService["mobile-app-development"] = byService["ui-ux-design"];

  const clientRevenueGhs = Object.values(ordersBy).reduce((a, b) => a + b, 0);
  return {
    allTimeGross: round2(allTimeGross),
    allTimeSalariesPaid: round2(salariesPaid),
    allTimePendingSalaries: round2(totalTalentExpectedSalaries),
    allTimeTalentShare: round2(talentShare),
    allTimePlatformProfit: round2(profit),
    monthGross: round2(monthGross),
    monthPendingSalaries: round2(totalTalentExpectedSalaries),
    monthSalariesPaid: round2(monthSalariesPaid),
    monthPlatformProfit: round2(monthSplittable * 0.3 + monthRegFees),
    feeRevenue: round2(regFees),
    clientRevenueGhs: round2(clientRevenueGhs),
    platformNet: round2(profit),
    configuredMonthly: round2(deptTotal),
    escrow: round2(escrow),
    paidEscrow: round2(paidDebts),
    grossRevenue: round2(allTimeGross),
    totalProfessionAllocation: round2(deptTotal),
    categoryRevenue: {
      graphic: byService["graphic-design"].total,
      uiux: byService["ui-ux-design"].total,
      web: byService["web-development"].total,
      total: round2(deptTotal),
      byService,
      services,
    },
  };
};
