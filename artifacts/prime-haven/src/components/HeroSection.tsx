import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CORE_SERVICES } from '@/lib/coreServices';
import earthHorizon from '@/assets/earth-horizon.jpg';

const HERO_SERVICES = CORE_SERVICES.slice(0, 5);

const HeroSection = () => {
  const reduceMotion = useReducedMotion();
  const reveal = (delay: number) => reduceMotion ? {} : {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay },
  };

  return (
    <section className="flex h-[100svh] min-h-[620px] flex-col overflow-hidden bg-background text-foreground" aria-label="Prime Haven introduction">
      <div className="mx-auto flex w-full max-w-5xl shrink-0 flex-col items-center px-5 pb-5 pt-24 text-center sm:pb-7 sm:pt-28 lg:pt-32">
        <motion.p {...reveal(0)} className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">
          Ghana's creative talent. Global ambition.
        </motion.p>
        <motion.h1 {...reveal(0.08)} className="mt-3 max-w-5xl font-heading text-[2.65rem] font-extrabold leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-[4.75rem]">
          Digital craft from Ghana,<br /><span className="text-primary">built for the world.</span>
        </motion.h1>
        <motion.p {...reveal(0.16)} className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:mt-5 sm:text-base">
          One accountable team for design, development, motion and digital growth — from first brief to approved delivery.
        </motion.p>
        <motion.div {...reveal(0.24)} className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:mt-6">
          <Button asChild className="h-11 rounded-full bg-foreground pl-5 pr-2 text-sm font-semibold text-background hover:bg-foreground/90">
            <Link to="/start-project">Start a Project <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-full bg-background text-foreground"><ArrowRight className="h-4 w-4" /></span></Link>
          </Button>
          <Link to="/register" className="text-sm font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline">Join as Talent</Link>
        </motion.div>
      </div>

      <motion.div {...reveal(0.32)} className="relative mx-4 mb-5 min-h-0 flex-1 rounded-[28px] sm:mx-6 sm:mb-6 lg:mx-8">
        <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-hero-surface">
          <img
            src={earthHorizon}
            alt="Earth's curved horizon glowing at sunrise, seen from space"
            width={1920}
            height={1080}
            fetchPriority="high"
            className="h-full w-full object-cover object-center"
          />
          <div className="hero-image-shade pointer-events-none absolute inset-0" />
          <div className="absolute left-5 top-6 text-hero-foreground sm:left-10 sm:top-9">
            <p className="text-3xl font-extrabold leading-none sm:text-5xl">One vision.</p>
            <p className="mt-2 max-w-36 text-xs leading-snug text-hero-muted sm:max-w-48 sm:text-sm">Good work travels further together.</p>
          </div>
          <div className="absolute bottom-16 right-5 text-right text-hero-foreground sm:bottom-9 sm:right-10">
            <p className="text-lg font-bold sm:text-2xl">Made to move ideas forward.</p>
            <p className="mt-1 text-xs text-hero-muted sm:text-sm">Design · Development · Digital</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-1/2 z-10 flex w-[calc(100%-2rem)] max-w-max -translate-x-1/2 translate-y-1/2 items-center overflow-x-auto rounded-full bg-card px-4 py-3 text-[10px] font-bold text-card-foreground shadow-[var(--shadow-soft)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto sm:px-7 sm:text-xs">
          {HERO_SERVICES.map((service, index) => (
            <div key={service.slug} className="flex shrink-0 items-center">
              {index > 0 && <span className="mx-3 h-3 w-px bg-border sm:mx-5" aria-hidden="true" />}
              <Link to={`/services/${service.slug}`} className="whitespace-nowrap transition-colors hover:text-primary">
                {service.title}
              </Link>
            </div>
          ))}
          <Link to="#services" aria-label="View all services" className="ml-3 shrink-0 text-primary transition-transform hover:translate-x-0.5 sm:ml-5">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
