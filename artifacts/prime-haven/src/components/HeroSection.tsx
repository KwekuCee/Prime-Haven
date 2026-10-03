import { motion } from 'framer-motion';
import { ArrowRight, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import earthHorizon from '@/assets/earth-horizon.jpg';

const HeroSection = () => (
  <section className="relative sticky top-0 isolate flex h-[calc(100svh-3rem)] min-h-[570px] max-h-[920px] items-center overflow-hidden bg-hero-surface text-hero-foreground" aria-label="Prime Haven introduction">
    <img
      src={earthHorizon}
      alt="Earth's curved horizon glowing at sunrise, seen from space"
      width={1920}
      height={1080}
      fetchPriority="high"
      className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
    />
    <div className="hero-image-shade absolute inset-0 -z-10" />
    <div className="container relative mx-auto px-6 pt-20 pb-16 text-center sm:pt-24">
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 text-xs font-bold uppercase tracking-[0.16em] text-hero-muted"
      >
        Ghana's creative talent. Global ambition.
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.08 }}
        className="mx-auto max-w-5xl font-heading text-5xl font-extrabold leading-[1.05] sm:text-6xl lg:text-7xl"
      >
        Prime Haven
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.18 }}
        className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-hero-muted sm:text-xl"
      >
        Where great design meets real opportunity. Connect with vetted designers and developers, or find your next project.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.28 }}
        className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
      >
        <Link to="/start-project" className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-md bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto">
          Start a Project <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/register" className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-hero-foreground/60 px-6 py-3 text-sm font-bold text-hero-foreground transition-colors hover:bg-hero-foreground/10 sm:w-auto">
          <Users className="h-4 w-4" /> Join as Talent
        </Link>
      </motion.div>
    </div>
  </section>
);

export default HeroSection;
