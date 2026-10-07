import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import technologyBuild from '@/assets/technology-build-texture.jpg';
import earthHorizon from '@/assets/earth-horizon.jpg';

const CLIENT_BENEFITS = [
  'Vetted Ghanaian specialists matched to your brief',
  'Clear upfront payment with client-controlled approval',
  'One workspace for milestones, feedback, and delivery',
];

const TALENT_BENEFITS = [
  'No bidding wars — claim work matched to your discipline',
  'Direct Mobile Money or local bank payouts',
  'A verified portfolio built from real client work',
];

const JoinSection = () => {
  const reduceMotion = useReducedMotion();
  const reveal = (delay: number) => reduceMotion ? {} : {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.18 },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <section className="border-y border-on-ink/10 bg-ink py-24 text-on-ink sm:py-32" aria-label="Join Prime Haven">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="grid gap-8 border-b border-on-ink/15 pb-12 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-primary">09 / Where great work happens</p>
            <h2 className="max-w-4xl font-heading text-5xl font-extrabold leading-[0.98] sm:text-7xl">
              Bring the brief.<br /><span className="display-italic text-primary">Or bring the craft.</span>
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-on-ink/60 sm:text-base lg:col-span-4 lg:justify-self-end">
            One platform for clients ready to build and professionals ready to do work that matters.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-lg border border-on-ink/15 bg-on-ink/15 lg:grid-cols-12">
          <motion.article {...reveal(0.05)} className="group relative flex min-h-[620px] flex-col justify-end overflow-hidden bg-ink lg:col-span-7">
            <img src={technologyBuild} alt="Product design and technology workspace prepared for a new build" loading="lazy" width={1536} height={1024} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" />
            <div className="panel-scrim absolute inset-0" />
            <div className="relative z-10 p-7 sm:p-10 lg:p-12">
              <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">For clients &amp; founders</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-on-ink/70"><ShieldCheck className="h-4 w-4 text-primary" /> Client-approved delivery</span>
              </div>
              <h3 className="max-w-xl font-heading text-4xl font-extrabold leading-[1.02] sm:text-5xl">Turn the rough idea into <span className="text-primary">real work.</span></h3>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-on-ink/70 sm:text-base">Share the brief. We will scope it honestly, match the right specialists, and keep the work visible from kickoff to approval.</p>
              <ul className="mt-8 grid gap-3 sm:grid-cols-3">
                {CLIENT_BENEFITS.map((benefit) => <li key={benefit} className="flex gap-2 text-xs leading-relaxed text-on-ink/70"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{benefit}</li>)}
              </ul>
              <div className="mt-10 flex flex-wrap items-center gap-5 border-t border-on-ink/15 pt-6">
                <Button asChild className="h-12 rounded-full px-6"><Link to="/start-project">Start a project <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                <Link to="/services/web-development" className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-ink/65 transition-colors hover:text-on-ink">Explore services <ArrowUpRight className="h-4 w-4" /></Link>
              </div>
            </div>
          </motion.article>

          <motion.article {...reveal(0.14)} className="group relative flex min-h-[620px] flex-col justify-end overflow-hidden bg-ink lg:col-span-5">
            <img src={earthHorizon} alt="Earth horizon representing opportunities for Ghanaian professionals worldwide" loading="lazy" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" />
            <div className="panel-scrim absolute inset-0" />
            <div className="relative z-10 p-7 sm:p-10 lg:p-12">
              <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">For professionals</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-on-ink/70"><Zap className="h-4 w-4 text-primary" /> 70% per approved job</span>
              </div>
              <h3 className="font-heading text-4xl font-extrabold leading-[1.02] sm:text-5xl">Build a career around <span className="text-primary">your best work.</span></h3>
              <p className="mt-5 text-sm leading-relaxed text-on-ink/70 sm:text-base">Pass the screening, enter your discipline’s marketplace, and earn from client-approved work.</p>
              <ul className="mt-8 space-y-3">
                {TALENT_BENEFITS.map((benefit) => <li key={benefit} className="flex gap-2 text-xs leading-relaxed text-on-ink/70"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{benefit}</li>)}
              </ul>
              <div className="mt-10 flex flex-wrap items-center gap-5 border-t border-on-ink/15 pt-6">
                <Button asChild className="h-12 rounded-full px-6"><Link to="/apply">Apply to Join <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-ink/65 transition-colors hover:text-on-ink">View marketplace <ArrowUpRight className="h-4 w-4" /></Link>
              </div>
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  );
};

export default JoinSection;