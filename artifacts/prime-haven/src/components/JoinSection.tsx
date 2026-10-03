import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CheckCircle2, ShieldCheck, Zap, Sparkles, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroBg from '@/assets/hero-bg.jpg';
import earthHorizon from '@/assets/earth-horizon.jpg';

const JoinSection = () => {
  return (
    <section className="relative overflow-hidden bg-[#06080e] py-24 text-white border-y border-white/10" aria-label="Join Prime Haven">
      {/* Ambient background glows matching Hero horizon */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-primary/10 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[450px] w-[450px] rounded-full bg-blue-600/10 blur-[140px]" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-bold uppercase tracking-[0.16em] text-primary mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Where Great Work Happens
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight text-white leading-[1.08]">
            Two paths. <span className="display-italic text-primary">One standard.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Whether you are bringing a product idea to life or ready to ship high-impact code and design from Ghana, Prime Haven is built for you.
          </p>
        </motion.div>

        {/* Dual Hero Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Card 1: Clients - Got something to build */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0d17] p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl hover:border-white/20 transition-all duration-300"
          >
            {/* Background Image Texture with Scrim */}
            <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-luminosity overflow-hidden">
              <img
                src={heroBg}
                alt="Technology build texture"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0d17] via-[#0a0d17]/80 to-transparent" />
            <div className="pointer-events-none absolute top-0 right-0 h-44 w-44 rounded-full bg-primary/10 blur-[80px]" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary bg-primary/15 border border-primary/20 px-3 py-1 rounded-full">
                  Clients &amp; Founders
                </span>
                <span className="text-xs text-zinc-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Escrow Protected
                </span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight leading-[1.15]">
                Got something to build? <br />
                <span className="display-italic text-primary">Tell us what you need.</span>
              </h3>

              <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed">
                Send over the brief — even if it is still rough. We will tell you honestly what it takes, what it costs, and how long it will run before you commit to anything.
              </p>

              {/* Guarantees List */}
              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Matched with vetted senior Ghanaian designers and developers</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Stage-gated payments — funds released only as deliverables are approved</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Live client workspace with direct milestone feedback &amp; code releases</span>
                </div>
              </div>
            </div>

            {/* Actions & Bottom Bar */}
            <div className="relative z-10 mt-10 pt-6 border-t border-white/[0.08]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Button
                  asChild
                  className="h-12 rounded-full bg-white text-black pl-6 pr-2 text-sm font-bold hover:bg-zinc-100 transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)] group/btn"
                >
                  <Link to="/start-project" className="flex items-center justify-between gap-4">
                    <span>Start a Project</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white group-hover/btn:translate-x-0.5 transition-transform">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </Button>

                <Link
                  to="/services/web-development"
                  className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-1 self-center sm:self-auto"
                >
                  Explore disciplines <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Pill badge matching hero bottom bar */}
              <div className="mt-6 flex items-center gap-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] px-4 py-2 text-[11px] font-semibold text-zinc-400">
                <span className="text-white font-bold">Fast turnarounds</span>
                <span className="h-2.5 w-px bg-white/20" />
                <span>Web Apps</span>
                <span className="h-2.5 w-px bg-white/20" />
                <span>UI/UX</span>
                <span className="h-2.5 w-px bg-white/20" />
                <span>Mobile Software</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Freelancers - Looking for work */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[#090c15] p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl hover:border-white/20 transition-all duration-300"
          >
            {/* Background Earth Texture with Scrim */}
            <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-luminosity overflow-hidden">
              <img
                src={earthHorizon}
                alt="Earth Horizon for talent opportunities"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090c15] via-[#090c15]/80 to-transparent" />
            <div className="pointer-events-none absolute top-0 left-0 h-44 w-44 rounded-full bg-blue-500/10 blur-[80px]" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/90 bg-white/10 border border-white/15 px-3 py-1 rounded-full">
                  Talent &amp; Creators
                </span>
                <span className="text-xs text-primary font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> 70% Revenue Split
                </span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight leading-[1.15]">
                Looking for work? <br />
                <span className="display-italic text-primary">Get paid for work you're proud of.</span>
              </h3>

              <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed">
                Join our vetted network as a designer, developer, or video artist. Real client contracts, automated job assignment, and direct Mobile Money or bank payouts.
              </p>

              {/* Freelancer Guarantees */}
              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Zero bidding wars — contracts matched directly to your profile</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Rapid payouts via Mobile Money (MTN, Telecel) or local bank transfer</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span>Build verified portfolio credentials with real commercial clients</span>
                </div>
              </div>
            </div>

            {/* Actions & Bottom Bar */}
            <div className="relative z-10 mt-10 pt-6 border-t border-white/[0.08]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Button
                  asChild
                  className="h-12 rounded-full bg-primary text-white pl-6 pr-2 text-sm font-bold hover:bg-primary/90 transition-all shadow-[0_0_25px_hsla(13,100%,58%,0.4)] group/btn"
                >
                  <Link to="/register" className="flex items-center justify-between gap-4">
                    <span>Join the Network — $15.00</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black group-hover/btn:translate-x-0.5 transition-transform">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </Button>

                <Link
                  to="/marketplace"
                  className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-1 self-center sm:self-auto"
                >
                  Browse marketplace <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Pill badge matching hero bottom bar */}
              <div className="mt-6 flex items-center gap-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] px-4 py-2 text-[11px] font-semibold text-zinc-400">
                <span className="text-white font-bold">One-time entry</span>
                <span className="h-2.5 w-px bg-white/20" />
                <span>Instant project board access</span>
                <span className="h-2.5 w-px bg-white/20" />
                <span>No monthly dues</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default JoinSection;
