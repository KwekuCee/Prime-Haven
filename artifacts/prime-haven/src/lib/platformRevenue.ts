import { supabase } from '@/integrations/supabase/client';
import { loadClientRevenue } from '@/lib/clientRevenue';

/**
 * Single source of truth for platform revenue, in GHS.
 *
 * Used by both the SuperAdmin dashboard and the Finance Hub so the two screens
 * can never show different figures.
 *
 *   gross = max(completed payments + client money, configured monthly revenue)
 *           + realised escrow (client debts marked paid)
 */
export interface PlatformRevenue {
  /** Registration fees, manual entries and other completed ledger payments. */
  feeRevenue: number;
  /** Money paid by clients (service checkouts + custom projects). */
  clientRevenueGhs: number;
  /** Manually configured monthly revenue figure (only applies when higher). */
  configuredMonthly: number;
  /** Client debts still outstanding. */
  escrow: number;
  /** Client debts already settled — counts as realised revenue. */
  paidEscrow: number;
  /** Total revenue shown on both dashboards. */
  grossRevenue: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const loadPlatformRevenue = async (): Promise<PlatformRevenue> => {
  const [paymentsRes, debtsRes, settingsRes, clientRev] = await Promise.all([
    (supabase.from('payments') as any)
      .select('amount, status, archived_at')
      .eq('status', 'completed')
      .is('archived_at', null),
    (supabase.from('client_debts') as any).select('amount_owed, status'),
    supabase.from('system_settings').select('key, value').eq('key', 'monthly_revenue'),
    loadClientRevenue().catch(() => null),
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

  const settings = (settingsRes?.data || []) as Array<{ value: any }>;
  const configuredMonthly = settings.length > 0 ? Number(settings[0]?.value?.amount) || 0 : 0;

  const clientRevenueGhs = clientRev?.totalGhs || 0;
  const grossRevenue = Math.max(feeRevenue + clientRevenueGhs, configuredMonthly) + paidEscrow;

  return {
    feeRevenue: round2(feeRevenue),
    clientRevenueGhs: round2(clientRevenueGhs),
    configuredMonthly: round2(configuredMonthly),
    escrow: round2(escrow),
    paidEscrow: round2(paidEscrow),
    grossRevenue: round2(grossRevenue),
  };
};
