import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Sparkles, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useRef } from 'react';
import heroBg from '@/assets/hero-bg.jpg';

const MARQUEE_ITEMS = [
  'Graphic Design', '·', 'UI/UX Design', '·', 'Web Development', '·',
  'IT Solutions', '·', 'Digital Strategy', '·', 'Brand Identity', '·',
  'Graphic Design', '·', 'UI/UX Design', '·', 'Web Development', '·',
  'IT Solutions', '·', 'Digital Strategy', '·', 'Brand Identity', '·',
];

const HeroSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={containerRef} className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Parallax Background */}
      <motion.div className="absolute inset-0 z-0" style={{ y: bgY }}>
        <img
          src={heroBg}
          alt="Digital technology background"
          className="w-full h-full object-cover scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
      </motion.div>

      {/* Grid overlay */}
      <div className="absolute inset-0 z-[1] grid-overlay opacity-20 pointer-events-none" />

      {/* Primary glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/15 blur-[120px] pointer-events-none z-[1]" />

      {/* Main Content */}
      <motion.div
        style={{ y: textY, opacity }}
        className="relative z-10 flex-1 flex flex-col items-center justify-center pt-28 pb-12 px-6"
      >
        <div className="max-w-5xl mx-auto text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2.5 border border-primary/30 bg-primary/10 px-5 py-2 rounded-full mb-10 backdrop-blur-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm text-primary font-bold tracking-wider uppercase">Est. 2026 · Youth-Driven Innovation</span>
          </motion.div>

          {/* Main Headline */}
          <div className="overflow-hidden mb-6">
            <motion.h1
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              className="text-[clamp(3.5rem,10vw,8.5rem)] font-heading font-bold leading-[0.9] tracking-tighter"
            >
              Making{' '}
              <span className="relative inline-block">
                <span className="text-gradient">IT Dreams</span>
                {/* Underline accent */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute -bottom-2 left-0 right-0 h-1.5 bg-gradient-primary rounded-full origin-left"
                />
              </span>
              <br />
              a Reality
            </motion.h1>
          </div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="text-lg md:text-xl text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed"
          >
            Youth-driven design & technology solutions that transform digital
            landscapes and empower organizations to thrive.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a href="#portfolio">
              <Button
                variant="primary"
                size="lg"
                className="group h-14 px-8 text-base font-bold glow-primary relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  View Our Work
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
                </span>
              </Button>
            </a>
            <Link to="/register">
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-8 text-base font-bold border-border/60 hover:border-primary/50 hover:text-primary transition-all duration-300"
              >
                Join Our Team
              </Button>
            </Link>
          </motion.div>

          {/* Trust Strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="mt-16 flex items-center justify-center gap-8 flex-wrap"
          >
            {[
              { value: '50+', label: 'Projects' },
              { value: '30+', label: 'Creatives' },
              { value: '98%', label: 'Satisfaction' },
              { value: '3', label: 'Core Services' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-heading font-bold text-gradient">{stat.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Marquee strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="relative z-10 border-y border-border/30 bg-card/20 backdrop-blur-sm overflow-hidden py-3.5"
      >
        <div className="marquee-track gap-8">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span
              key={i}
              className={`text-sm font-bold whitespace-nowrap ${item === '·' ? 'text-primary text-lg' : 'text-muted-foreground uppercase tracking-widest'}`}
            >
              {item}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-20 right-8 z-10 hidden md:flex flex-col items-center gap-2"
      >
        <span className="text-xs text-muted-foreground uppercase tracking-[0.2em] rotate-90 mb-4 font-bold">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ArrowDown className="w-4 h-4 text-primary" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
