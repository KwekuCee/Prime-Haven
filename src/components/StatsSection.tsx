import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { Users, Briefcase, Star, TrendingUp, X, ChevronRight, Sparkles } from 'lucide-react';
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

  return (
    <span ref={ref} className="tabular-nums">
      {count}{suffix}
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
      } catch {
        // Keep fallback stats
      }
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
            <span className="text-primary font-medium uppercase tracking-wider text-sm">Our Impact</span>
            {isLive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <h2 className="text-4xl md:text-5xl font-heading font-bold mt-4 mb-6">
            Numbers That <span className="text-gradient">Speak</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Our growing community of talented designers and developers continue to deliver exceptional results.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {statItems.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <motion.div
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDrillDown(stat.key)}
                className="glass rounded-2xl p-8 text-center group hover:glow-primary transition-all cursor-pointer relative overflow-hidden"
              >
                {/* Subtle shimmer effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>

                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                    <stat.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-4xl md:text-5xl font-heading font-bold text-gradient mb-2">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-muted-foreground font-medium mb-3">{stat.label}</p>
                  <div className="flex items-center justify-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="w-3 h-3" />
                    <span>Click to explore</span>
                    <ChevronRight className="w-3 h-3" />
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
          {drillDown && <DrillDownContent stat={drillDown} stats={stats} />}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default StatsSection;
