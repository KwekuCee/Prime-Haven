import { motion } from 'framer-motion';
import { ArrowRight, Briefcase, Users, Star, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  const stats = [
    { icon: Users, value: '50+', label: 'Vetted Designers' },
    { icon: Briefcase, value: '200+', label: 'Projects Delivered' },
    { icon: Star, value: '98%', label: 'Client Satisfaction' },
  ];

  const floatingCards = [
    { icon: '🎨', label: 'Graphic Design', delay: 0 },
    { icon: '💻', label: 'Web Development', delay: 0.4 },
    { icon: '📱', label: 'UI/UX Design', delay: 0.8 },
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-background">

      {/* Ambient background glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-[700px] h-[700px] bg-primary/20 rounded-full blur-[140px]"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.25, 0.12] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[160px]"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/8 rounded-full blur-[180px]"
        />

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, hsl(16 99% 55%) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Horizontal scan line */}
        <motion.div
          animate={{ y: ['-100%', '200%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear', repeatDelay: 4 }}
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        />
      </div>

      <div className="container mx-auto px-6 relative z-10 pt-28 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[calc(100vh-112px)]">

          {/* ─── Left Column ─── */}
          <div className="space-y-8">

            {/* Eyebrow badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2.5 border border-primary/30 bg-primary/5 px-4 py-2 rounded-full"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-primary tracking-widest uppercase">
                Ghana's Premier Creative Marketplace
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="font-heading font-black leading-[1.05] tracking-tight"
              style={{ fontSize: 'clamp(2.8rem, 5.5vw, 5rem)' }}
            >
              Where Great Design{' '}
              <span className="relative inline-block">
                <span className="text-gradient">Meets Real</span>
              </span>
              <br />
              Opportunity.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-lg text-muted-foreground leading-relaxed max-w-lg"
            >
              Connect with Ghana's top-tier designers and developers — or launch your creative career
              with guaranteed projects and real earnings.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link to="/start-project">
                <Button
                  size="lg"
                  className="group glow-primary h-13 px-8 text-base font-bold gap-2 w-full sm:w-auto"
                >
                  <Briefcase className="w-5 h-5" />
                  Start a Project
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-13 px-8 text-base font-bold gap-2 border-border/60 hover:border-primary/50 bg-background/40 backdrop-blur-md w-full sm:w-auto"
                >
                  <Users className="w-5 h-5" />
                  Join as Freelancer
                </Button>
              </Link>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-wrap gap-6 pt-4 border-t border-border/30"
            >
              {stats.map((s, i) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <s.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold leading-tight">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ─── Right Column – Visual ─── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative flex items-center justify-center hidden lg:flex"
          >
            {/* Outer glow ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="absolute w-[440px] h-[440px] rounded-full border border-primary/10"
              style={{
                background: 'conic-gradient(from 0deg, transparent 70%, hsl(16 99% 55% / 0.15) 100%)',
              }}
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute w-[340px] h-[340px] rounded-full border border-primary/15"
              style={{
                background: 'conic-gradient(from 180deg, transparent 70%, hsl(16 99% 55% / 0.12) 100%)',
              }}
            />

            {/* Center orb */}
            <div className="relative w-48 h-48">
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 blur-2xl"
              />
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent border border-primary/30 flex items-center justify-center backdrop-blur-sm">
                <motion.div
                  animate={{ rotate: [0, 15, 0, -15, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="w-16 h-16 text-primary" />
                </motion.div>
              </div>
            </div>

            {/* Floating service cards */}
            {floatingCards.map((card, i) => {
              const positions = [
                { top: '6%', left: '0%' },
                { top: '50%', right: '-8%', transform: 'translateY(-50%)' },
                { bottom: '8%', left: '8%' },
              ];
              return (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
                  transition={{
                    opacity: { duration: 0.5, delay: 0.8 + card.delay },
                    scale: { duration: 0.5, delay: 0.8 + card.delay },
                    y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: card.delay },
                  }}
                  className="absolute glass border border-primary/20 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl backdrop-blur-md"
                  style={positions[i]}
                >
                  <span className="text-2xl">{card.icon}</span>
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">{card.label}</span>
                </motion.div>
              );
            })}

            {/* Live indicator pill */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
              className="absolute bottom-2 right-4 glass border border-emerald-500/30 rounded-full px-3 py-1.5 flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-400">Live Projects Available</span>
            </motion.div>

            {/* Corner sparkle dots */}
            {[
              { top: '18%', right: '14%' },
              { bottom: '22%', right: '22%' },
            ].map((pos, i) => (
              <motion.div
                key={i}
                animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 1.2, ease: 'easeInOut' }}
                className="absolute w-3 h-3"
                style={pos}
              >
                <Zap className="w-full h-full text-primary/70" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/50 font-medium">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-5 h-8 rounded-full border border-muted-foreground/20 flex justify-center pt-1.5"
        >
          <div className="w-1 h-2 rounded-full bg-primary/60" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
