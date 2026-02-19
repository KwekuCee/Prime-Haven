import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { Users, Briefcase, Star, TrendingUp, X, Sparkles, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface StatsData {
  totalMembers: number;
  projectsDelivered: number;
  satisfactionRate: number;
  totalSubmissions: number;
  categoryBreakdown: Record<string, { total: number; delivered: number; pending: number }>;
  roleBreakdown: Record<string, number>;
}

const fallbackStats: StatsData = {
  totalMembers: 47,
  projectsDelivered: 124,
  satisfactionRate: 98,
  totalSubmissions: 200,
  categoryBreakdown: {},
  roleBreakdown: {},
};

const AnimatedCounter = ({ value, suffix }: { value: number; suffix: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const duration = 2000;
      const increment = value / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return <span ref={ref} className="tabular-nums">{count}{suffix}</span>;
};

const categoryLabels: Record<string, string> = {
  'graphic_design': 'Graphic Design',
  'Graphic Design': 'Graphic Design',
  'ui_ux': 'UI/UX Design',
  'UI/UX Design': 'UI/UX Design',
  'web_development': 'Web Development',
  'Web Development': 'Web Development',
};

const DrillDownContent = ({ stat, stats }: { stat: string; stats: StatsData }) => {
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
              <circle cx="50" cy="50" r="42" fill="none" className="stroke-secondary" strokeWidth="8" />
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
          <div className="glass rounded-lg p-3">
            <p className="text-lg font-bold text-primary">{stats.projectsDelivered}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div className="glass rounded-lg p-3">
            <p className="text-lg font-bold">{stats.totalSubmissions}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const StatsSection = () => {
  const [stats, setStats] = useState<StatsData>(fallbackStats);
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
      } catch { /* keep fallback */ }
    };
    fetchStats();
  }, []);

  const statItems = [
    { key: 'members', icon: Users, value: stats.totalMembers, suffix: '+', label: 'Prime Members', drillLabel: 'Team Breakdown' },
    { key: 'projects', icon: Briefcase, value: stats.projectsDelivered, suffix: '+', label: 'Projects Delivered', drillLabel: 'Projects by Category' },
    { key: 'satisfaction', icon: Star, value: stats.satisfactionRate, suffix: '%', label: 'Client Satisfaction', drillLabel: 'Satisfaction Details' },
    { key: 'submissions', icon: TrendingUp, value: stats.totalSubmissions, suffix: '+', label: 'Total Submissions', drillLabel: 'Submissions by Category' },
  ];

  const activeDrill = statItems.find(s => s.key === drillDown);

  return (
    <section id="about" className="py-28 relative overflow-hidden">
      {/* Background treatments */}
      <div className="absolute inset-0 grid-overlay opacity-10 pointer-events-none" />
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute right-0 bottom-0 w-[300px] h-[300px] bg-primary/6 rounded-full blur-[80px] pointer-events-none" />

      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end gap-8 mb-20">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="flex-1"
          >
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs">
                <span className="w-8 h-px bg-primary" />
                Our Impact
              </span>
              {isLive && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live Data
                </span>
              )}
            </div>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold leading-none">
              Numbers That<br />
              <span className="text-gradient">Speak</span>
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-muted-foreground max-w-xs text-base leading-relaxed md:text-right"
          >
            Our growing community of talented designers and developers continue to deliver exceptional results.
          </motion.p>
        </div>

        {/* Stats — large horizontal cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statItems.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <motion.div
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setDrillDown(stat.key)}
                className="relative group cursor-pointer rounded-2xl border border-border/40 bg-card/60 hover:border-primary/40 hover:bg-card backdrop-blur-sm p-8 transition-all duration-300 overflow-hidden"
              >
                {/* Glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" style={{ boxShadow: 'inset 0 0 30px hsla(16,99%,55%,0.06)' }} />

                {/* Top row */}
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 border border-primary/20 flex items-center justify-center transition-all duration-300">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-xs text-primary font-bold">
                    <Sparkles className="w-3 h-3" />
                    <span>Details</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>

                {/* Number */}
                <div className="text-4xl sm:text-5xl font-heading font-bold text-gradient mb-2 leading-none">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>

                {/* Label */}
                <p className="text-muted-foreground text-sm font-semibold">{stat.label}</p>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
          {drillDown && <DrillDownContent stat={drillDown} stats={stats} />}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default StatsSection;
