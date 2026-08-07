import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Users, Briefcase, Star, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const ease = [0.22, 1, 0.36, 1] as const;

const metrics = [
  { label: 'Vetted Talent', value: '50+', delta: '+12%', tone: 'text-primary' },
  { label: 'Projects Delivered', value: '200+', delta: '+8.4%', tone: 'text-indigo-500' },
  { label: 'Client Satisfaction', value: '98%', delta: '+2.1%', tone: 'text-emerald-500' },
  { label: 'Avg. Turnaround', value: '5 days', delta: '-1.2d', tone: 'text-amber-500' },
];

const disciplines = ['Graphic Design', 'UI/UX Design', 'Web Development', 'IT Solutions'];

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
      {/* Spectrum rail at the very top of the canvas */}
      <div className="absolute top-0 left-0 right-0 h-[6px] spectrum-bar" />
      <div className="absolute -top-24 left-0 right-0 h-32 spectrum-bar blur-[100px] opacity-25 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        {/* ─── Headline block ─── */}
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="eyebrow"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Ghana&apos;s premier creative marketplace
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.08, ease }}
            className="mt-8 font-heading font-extrabold leading-[0.96]"
            style={{ fontSize: 'clamp(2.9rem, 6.2vw, 5.6rem)' }}
          >
            Where great design
            <br />
            meets <span className="display-italic text-primary">real</span> opportunity
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            className="mt-7 mx-auto max-w-xl text-lg text-muted-foreground leading-relaxed"
          >
            Prime Haven connects clients with vetted designers and developers — and gives creative
            talent guaranteed projects, real points and real earnings.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
            className="mt-10 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link to="/start-project" className="btn-ink justify-center group">
              Start a Project
              <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-bold text-foreground transition-all duration-300 hover:border-primary/40 hover:-translate-y-0.5"
            >
              <Users className="w-4 h-4 text-primary" />
              Join as Talent
            </Link>
          </motion.div>

          {/* Social proof + discipline marquee */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-14"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              Trusted by founders, startups and brands across Ghana
            </p>
            <div className="mt-6 relative overflow-hidden max-w-3xl mx-auto [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
              <div className="flex w-max marquee-track gap-3">
                {[...disciplines, ...disciplines, ...disciplines, ...disciplines].map((d, i) => (
                  <span
                    key={`${d}-${i}`}
                    className="rounded-full border border-border/70 bg-card px-5 py-2 text-sm font-semibold text-muted-foreground whitespace-nowrap"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ─── Dashboard mock ─── */}
        <motion.div
          initial={{ opacity: 0, y: 70, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1.1, delay: 0.35, ease }}
          className="relative mt-20 max-w-5xl mx-auto spectrum-glow"
          style={{ perspective: 1400 }}
        >
          <div className="paper-card relative overflow-hidden p-3 sm:p-5 rounded-[2rem]">
            {/* Mock topbar */}
            <div className="flex items-center justify-between gap-4 rounded-full border border-border/70 bg-background px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center text-[11px] font-black text-primary-foreground">
                  PH
                </span>
                <span className="font-bold text-sm">Prime Haven</span>
              </div>
              <div className="hidden md:flex items-center gap-1.5">
                {['Dashboard', 'Marketplace', 'Submissions', 'Payments'].map((t, i) => (
                  <span
                    key={t}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                      i === 0 ? 'bg-foreground text-background' : 'border border-border/70 text-muted-foreground'
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <span className="flex items-center gap-2 text-[11px] font-semibold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>

            {/* Metric cards */}
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {metrics.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 + i * 0.08, ease }}
                  className="rounded-2xl border border-border/70 bg-background p-4"
                >
                  <p className="text-[11px] font-semibold text-muted-foreground">{m.label}</p>
                  <div className="mt-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-extrabold tracking-tight">{m.value}</span>
                    <span className={`text-[11px] font-bold ${m.tone}`}>{m.delta}</span>
                  </div>
                  {/* sparkline */}
                  <svg viewBox="0 0 120 34" className="mt-3 w-full h-8 overflow-visible">
                    <motion.path
                      d="M0 26 C 14 20, 22 30, 34 22 S 54 8, 66 18 S 88 26, 100 12 L 120 16"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className={m.tone}
                      stroke="currentColor"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.4, delay: 0.9 + i * 0.1, ease }}
                    />
                  </svg>
                </motion.div>
              ))}
            </div>

            {/* Lower panels */}
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 rounded-2xl border border-border/70 bg-background p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">Project Pipeline</h3>
                  <div className="flex gap-1">
                    {['1W', '1M', '6M', '1Y'].map((r, i) => (
                      <span
                        key={r}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          i === 1 ? 'bg-primary/12 text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-5 flex items-end gap-2 h-28">
                  {[42, 66, 38, 78, 54, 88, 62, 96, 70, 84, 58, 92].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.8, delay: 0.9 + i * 0.05, ease }}
                      className="flex-1 rounded-t-md"
                      style={{
                        background:
                          i % 3 === 0
                            ? 'hsl(var(--primary))'
                            : 'hsla(var(--primary) / 0.22)',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">Top Disciplines</h3>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="mt-4 space-y-3.5">
                  {[
                    { name: 'UI/UX Design', pct: 92 },
                    { name: 'Web Development', pct: 84 },
                    { name: 'Graphic Design', pct: 76 },
                  ].map((d, i) => (
                    <div key={d.name}>
                      <div className="flex justify-between text-[11px] font-semibold mb-1.5">
                        <span className="text-muted-foreground">{d.name}</span>
                        <span>{d.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${d.pct}%` }}
                          transition={{ duration: 1.2, delay: 1 + i * 0.12, ease }}
                          className="h-full rounded-full bg-gradient-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating accent chips */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="hidden xl:flex absolute -left-24 top-32 items-center gap-2.5 paper-card rounded-2xl px-4 py-3"
          >
            <span className="w-8 h-8 rounded-xl bg-primary/12 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary" />
            </span>
            <div className="text-left">
              <p className="text-xs font-bold leading-none">New contract</p>
              <p className="text-[10px] text-muted-foreground mt-1">Brand identity · GH₵2,400</p>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="hidden xl:flex absolute -right-24 bottom-24 items-center gap-2.5 paper-card rounded-2xl px-4 py-3"
          >
            <span className="w-8 h-8 rounded-xl bg-emerald-500/12 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </span>
            <div className="text-left">
              <p className="text-xs font-bold leading-none">Payout released</p>
              <p className="text-[10px] text-muted-foreground mt-1">Monthly pool · 29th</p>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
            className="hidden xl:flex absolute -right-20 top-6 items-center gap-2 paper-card rounded-full px-4 py-2"
          >
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold">4.9 average rating</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
