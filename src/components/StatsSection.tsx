import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { Users, Briefcase, Star, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StatsData {
  totalMembers: number;
  projectsDelivered: number;
  satisfactionRate: number;
  totalSubmissions: number;
}

const fallbackStats: StatsData = {
  totalMembers: 47,
  projectsDelivered: 124,
  satisfactionRate: 98,
  totalSubmissions: 200,
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

const StatsSection = () => {
  const [stats, setStats] = useState<StatsData>(fallbackStats);
  const [isLive, setIsLive] = useState(false);

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
    { icon: Users, value: stats.totalMembers, suffix: '+', label: 'Prime Members' },
    { icon: Briefcase, value: stats.projectsDelivered, suffix: '+', label: 'Projects Delivered' },
    { icon: Star, value: stats.satisfactionRate, suffix: '%', label: 'Client Satisfaction' },
    { icon: TrendingUp, value: stats.totalSubmissions, suffix: '+', label: 'Total Submissions' },
  ];

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
              <div className="glass rounded-2xl p-8 text-center group hover:glow-primary transition-shadow">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                  <stat.icon className="w-8 h-8 text-primary" />
                </div>
                <div className="text-4xl md:text-5xl font-heading font-bold text-gradient mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-muted-foreground font-medium">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
