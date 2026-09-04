import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { Users, Briefcase, Star, TrendingUp, ChevronRight, Sparkles, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { getUsdToGhsRate, formatUsd, formatGhs, type RateSource } from '@/lib/currency';

interface StatsData {
  totalMembers: number;
  projectsDelivered: number;
  satisfactionRate: number;
  totalSubmissions: number;
  categoryBreakdown: Record<string, { total: number; delivered: number; pending: number }>;
  roleBreakdown: Record<string, number>;
}

interface SalaryStats {
  totalGhs: number;
  totalUsd: number;
  baselineUsd: number;
  displayUsd: number;
  payoutCount: number;
  lastPaidAt: string | null;
  rate: number;
  rateSource: RateSource;
  live: boolean;
}

const fallbackStats: StatsData = {
  totalMembers: 0,
  projectsDelivered: 0,
  satisfactionRate: 0,
  totalSubmissions: 0,
  categoryBreakdown: {},
  roleBreakdown: {},
};

/** Verified payouts made to talent before in-app tracking began (USD). */
const BASELINE_USD_FALLBACK = 5200;

/** Round down to the nearest $100 so the public figure is never overstated. */
const floorToHundred = (value: number) => Math.floor(value / 100) * 100;

const fallbackSalary: SalaryStats = {
  totalGhs: 0,
  totalUsd: 0,
  baselineUsd: BASELINE_USD_FALLBACK,
  displayUsd: BASELINE_USD_FALLBACK,
  payoutCount: 0,
  lastPaidAt: null,
  rate: 15.5,
  rateSource: 'fallback',
  live: false,
};

/** Compact USD formatter for the big headline number: $1.2K, $48.5K, $1.3M */
const formatCompactUsd = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 10_000) return `$${(value / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};


const AnimatedCounter = ({
  value,
  suffix = '',
  format,
}: {
  value: number;
  suffix?: string;
  format?: (n: number) => string;
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView) return undefined;

    // First reveal: count up from zero. Later updates (live data): ease from the current value.
    const from = hasAnimated.current ? count : 0;
    hasAnimated.current = true;
    const duration = 1800;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {format ? format(count) : `${Math.floor(count)}${suffix}`}
    </span>
  );
};

const categoryLabels: Record<string, string> = {
  'graphic_design': 'Graphic Design',
  'Graphic Design': 'Graphic Design',
  'ui_ux': 'UI/UX Design',
  'UI/UX Design': 'UI/UX Design',
  'web_development': 'Web Development',
  'Web Development': 'Web Development',
};

const DrillDownContent = ({ stat, stats, salary }: { stat: string; stats: StatsData; salary: SalaryStats }) => {
  if (stat === 'salaries') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          Salaries, mobile-money withdrawals, partner commissions and client tips paid out to Prime Haven talent, converted to US
          dollars at today&apos;s rate.
        </p>
        <div className="rounded-2xl border border-border/70 bg-background p-5 text-center">
          <p className="text-3xl font-heading font-extrabold tracking-tight text-primary">{formatUsd(salary.displayUsd)}+</p>
          <p className="text-xs text-muted-foreground mt-1">
            {salary.payoutCount > 0 ? `${formatGhs(salary.totalGhs)} tracked in-app` : 'Verified payouts to date'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl border border-border/70 bg-background p-3">
            <p className="text-lg font-bold">{salary.payoutCount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Tracked payouts</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background p-3">
            <p className="text-lg font-bold">
              {salary.lastPaidAt ? new Date(salary.lastPaidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Last payout</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center">
          Rate: 1 USD = GH₵{salary.rate.toFixed(2)}
          {salary.rateSource === 'live' ? ' (live international rate)' : salary.rateSource === 'system' ? ' (system rate)' : ''}
          {' · '}rounded down to the nearest $100 and updated automatically as payouts are made.
        </p>
        {salary.baselineUsd > 0 && (
          <p className="text-[11px] text-muted-foreground text-center">
            Includes verified payouts made to Prime Haven talent before in-app tracking began.
          </p>
        )}
      </div>

    );
  }

  if (stat === 'members') {
    const roles = stats.roleBreakdown;
    const total = Object.values(roles).reduce((a, b) => a + b, 0) || 1;
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">Breakdown of team members by role</p>
        {Object.entries(roles).length > 0 ? (
          Object.entries(roles).map(([role, count]) => (
            <div key={role} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-medium capitalize">{role === 'designer' ? 'Designers' : role === 'superadmin' ? 'Admins' : 'Master Admins'}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
              <Progress value={(count / total) * 100} className="h-2" />
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No breakdown available yet</p>
        )}
      </div>
    );
  }

  if (stat === 'projects' || stat === 'submissions') {
    const breakdown = stats.categoryBreakdown;
    const maxVal = Math.max(...Object.values(breakdown).map(c => c.total), 1);
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {stat === 'projects' ? 'Delivered projects by category' : 'All submissions by category'}
        </p>
        {Object.entries(breakdown).length > 0 ? (
          Object.entries(breakdown).map(([category, data]) => (
            <div key={category} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{categoryLabels[category] || category}</span>
                <div className="flex items-center gap-2">
                  {stat === 'projects' ? (
                    <span className="text-muted-foreground">{data.delivered} delivered</span>
                  ) : (
                    <>
                      <span className="text-muted-foreground">{data.total} total</span>
                      {data.pending > 0 && (
                        <span className="text-xs text-amber-500">({data.pending} pending)</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <Progress
                value={((stat === 'projects' ? data.delivered : data.total) / maxVal) * 100}
                className="h-2"
              />
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No category data available yet</p>
        )}
      </div>
    );
  }

  if (stat === 'satisfaction') {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">Based on PH approval rate across all submissions</p>
        <div className="flex items-center justify-center py-4">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                className="stroke-secondary"
                strokeWidth="8"
              />
              <motion.circle
                cx="50" cy="50" r="42"
                fill="none"
                className="stroke-primary"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - stats.satisfactionRate / 100) }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">{stats.satisfactionRate}%</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl border border-border/70 bg-background p-3">
            <p className="text-lg font-bold text-primary">{stats.projectsDelivered}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background p-3">
            <p className="text-lg font-bold">{stats.totalSubmissions}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const SALARY_REFRESH_MS = 60_000;

const StatsSection = () => {
  const [stats, setStats] = useState<StatsData>(fallbackStats);
  const [salary, setSalary] = useState<SalaryStats>(fallbackSalary);
  const [isLive, setIsLive] = useState(false);
  const [drillDown, setDrillDown] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('public-stats');
        if (!error && data?.success && data?.stats) {
          setStats({
            totalMembers: Math.max(data.stats.totalMembers, 1),
            projectsDelivered: Math.max(data.stats.projectsDelivered, 0),
            satisfactionRate: data.stats.satisfactionRate,
            totalSubmissions: Math.max(data.stats.totalSubmissions, 0),
            categoryBreakdown: data.stats.categoryBreakdown || {},
            roleBreakdown: data.stats.roleBreakdown || {},
          });
          setIsLive(true);
        }
      } catch {
        // Keep fallback stats
      }
    };
    fetchStats();
  }, []);

  // Total salaries paid — aggregate RPC (no row access needed) + live FX rate.
  // Refreshes on a timer and whenever a new payout row lands in `payments`.
  useEffect(() => {
    let cancelled = false;

    const fetchSalaries = async () => {
      try {
        const [{ data, error }, fx] = await Promise.all([
          (supabase as any).rpc('public_total_salaries_paid'),
          getUsdToGhsRate(),
        ]);
        if (cancelled || error) return;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return;
        const totalGhs = Number(row.total_ghs) || 0;
        const totalUsd = Math.round((totalGhs / fx.rate) * 100) / 100;
        const baselineUsd = Number(row.baseline_usd) || BASELINE_USD_FALLBACK;
        setSalary({
          totalGhs,
          totalUsd,
          baselineUsd,
          displayUsd: floorToHundred(Math.max(baselineUsd, totalUsd)),
          payoutCount: Number(row.payout_count) || 0,
          lastPaidAt: row.last_paid_at ?? null,
          rate: fx.rate,
          rateSource: fx.source,
          live: true,
        });

      } catch {
        // Keep previous value
      }
    };

    fetchSalaries();
    const interval = setInterval(fetchSalaries, SALARY_REFRESH_MS);

    const channel = supabase
      .channel(`public-salaries-paid-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchSalaries())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => fetchSalaries())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_payouts' }, () => fetchSalaries())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_tips' }, () => fetchSalaries())
      .subscribe();


    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const statItems = [
    { key: 'salaries', icon: Wallet, value: salary.displayUsd, suffix: '+', format: formatCompactUsd, label: 'Salaries Paid', drillLabel: 'Salaries Paid to Talent', highlight: true, span: 'sm:col-span-2 md:col-span-2 md:row-span-2' },
    { key: 'members', icon: Users, value: stats.totalMembers, suffix: stats.totalMembers > 0 ? '+' : '', label: 'Prime Members', drillLabel: 'Team Breakdown', span: 'md:col-span-2' },
    { key: 'projects', icon: Briefcase, value: stats.projectsDelivered, suffix: stats.projectsDelivered > 0 ? '+' : '', label: 'Projects Delivered', drillLabel: 'Projects by Category', span: 'md:col-span-2' },
    { key: 'satisfaction', icon: Star, value: stats.satisfactionRate, suffix: stats.satisfactionRate > 0 ? '%' : '', label: 'Client Satisfaction', drillLabel: 'Satisfaction Details', span: 'md:col-span-2' },
    { key: 'submissions', icon: TrendingUp, value: stats.totalSubmissions, suffix: stats.totalSubmissions > 0 ? '+' : '', label: 'Total Submissions', drillLabel: 'Submissions by Category', span: 'md:col-span-2' },
  ] as Array<{
    key: string;
    icon: typeof Users;
    value: number;
    suffix?: string;
    format?: (n: number) => string;
    label: string;
    drillLabel: string;
    highlight?: boolean;
    span: string;
  }>;

  const activeDrill = statItems.find(s => s.key === drillDown);

  return (
    <section id="about" className="py-24 relative">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="eyebrow">Our Impact</span>
            {isLive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <h2 className="text-4xl md:text-5xl font-heading font-extrabold tracking-tight mt-6 mb-6 text-foreground">Our Impact in <span className="display-italic text-primary">Numbers</span></h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A transparent view of the work moving through Prime Haven. Figures update from our live records when available.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 lg:gap-5">
          {statItems.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={stat.span}
            >
              <motion.div
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDrillDown(stat.key)}
                className={`lift-card p-6 lg:p-7 group transition-all cursor-pointer relative overflow-hidden h-full ${
                  stat.highlight ? 'border-primary/40 bg-primary/[0.04]' : ''
                }`}
              >
                {stat.highlight && salary.live && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Live
                  </span>
                )}

                <div className={`relative z-10 h-full ${stat.highlight ? 'flex flex-col items-start justify-center gap-6' : 'flex items-center gap-5'}`}>
                  <div className="w-14 h-14 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <stat.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className={`font-heading font-extrabold tracking-tight text-foreground ${stat.highlight ? 'text-4xl lg:text-5xl' : 'text-3xl lg:text-4xl'}`}>
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} format={stat.format} />
                    </div>
                    <p className="text-muted-foreground font-medium text-sm md:text-base mt-1">{stat.label}</p>
                    {stat.highlight && (
                      <p className="text-xs text-muted-foreground/80 mt-3 max-w-[22ch] leading-relaxed">
                        {salary.payoutCount > 0
                          ? `Across ${salary.payoutCount.toLocaleString()} completed ${salary.payoutCount === 1 ? 'payout' : 'payouts'} to Prime Haven talent`
                          : 'Paid out to Prime Haven talent since we started'}
                      </p>
                    )}

                    <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                      <Sparkles className="w-3 h-3" />
                      <span>Click to explore</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Drill-Down Modal */}
      <Dialog open={!!drillDown} onOpenChange={(open) => !open && setDrillDown(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              {activeDrill && <activeDrill.icon className="w-5 h-5 text-primary" />}
              {activeDrill?.drillLabel}
            </DialogTitle>
          </DialogHeader>
          {drillDown && <DrillDownContent stat={drillDown} stats={stats} salary={salary} />}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default StatsSection;
