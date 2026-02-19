import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import ceoPhoto from '@/assets/ceo-founder.jpg';

const STORY_PARAGRAPHS = [
  "Before Prime Haven existed, Michael Kweku Essilfie saw something that troubled him deeply — a generation of brilliantly creative people with no real stage. Graphic designers, UI/UX artists, web developers, and digital creatives across Ghana were producing world-class work, yet struggling to connect with the clients who needed them most. The talent was there. The opportunity was not.",
  "Michael decided to change that. Driven by a conviction that creative talent deserves more than uncertainty, he set out to build something unprecedented — a premium digital agency where talented creatives could thrive, not just survive. Not a marketplace. Not a gig board. A family. A community. A haven.",
  "Prime Haven was born from that vision. Michael assembled a handpicked team of the finest designers and developers, built a rigorous quality system, and created a platform that bridges the gap between world-class creative talent and businesses hungry for outstanding digital work. Every project accepted is a contract. Every deliverable, a promise.",
  "Today, Prime Haven stands as proof that when you invest in people and give talent a home, extraordinary things happen. Under Michael's leadership, the agency has grown into a powerhouse of digital excellence — delivering graphic design, UI/UX, web development, and IT solutions that turn client dreams into digital reality. The mission remains the same: Making IT Dreams a Reality, one creative at a time."
];

const FounderSection = () => {
  return (
    <section className="py-28 relative overflow-hidden bg-card/20" id="founder">
      {/* Background treatments */}
      <div className="absolute inset-0 stripe-bg opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/6 rounded-full blur-[120px] pointer-events-none -translate-x-1/4 -translate-y-1/4" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none translate-x-1/4 translate-y-1/4" />

      <div className="container mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-20"
        >
          <span className="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs mb-5">
            <span className="w-8 h-px bg-primary" />
            The Visionary
          </span>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold leading-none">
            Meet Our<br />
            <span className="text-gradient">CEO & Founder</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-16 items-start max-w-7xl">
          {/* Photo side */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-8 lg:sticky lg:top-28"
          >
            {/* Photo frame — editorial */}
            <div className="relative group">
              {/* Offset decorative frame */}
              <div className="absolute -inset-4 rounded-3xl border border-primary/20 group-hover:border-primary/40 transition-all duration-500" />
              <div className="absolute -bottom-3 -right-3 w-full h-full rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 blur-sm" />

              <div className="relative rounded-2xl overflow-hidden border border-border/40 group-hover:border-primary/30 transition-all duration-500">
                <img
                  src={ceoPhoto}
                  alt="Michael Kweku Essilfie - CEO & Founder, Prime Haven"
                  className="w-full aspect-[3/4] object-cover object-top group-hover:scale-[1.02] transition-transform duration-700"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

                {/* Name plate overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-heading font-bold">Michael Kweku Essilfie</h3>
                  <p className="text-primary font-bold text-sm mt-1">CEO & Founder · Prime Haven</p>
                </div>
              </div>
            </div>

            {/* Quote card */}
            <div className="relative p-6 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm">
              <Quote className="w-8 h-8 text-primary/30 mb-3" />
              <p className="text-base text-foreground font-semibold italic leading-relaxed">
                "Talent without opportunity is potential wasted. Prime Haven is that opportunity."
              </p>
              <div className="mt-4 h-0.5 w-12 bg-gradient-primary rounded-full" />
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: '50+', label: 'Projects' },
                { value: '30+', label: 'Creatives' },
                { value: '3', label: 'Core Services' },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-4 rounded-xl border border-border/40 bg-card/40">
                  <p className="text-xl font-heading font-bold text-gradient">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Story side */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-8 pt-2"
          >
            {/* Large drop-cap intro */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              {/* Giant "B" drop cap */}
              <span className="float-left text-[7rem] leading-[0.75] font-heading font-bold text-gradient mr-4 mt-2 select-none">
                B
              </span>
              <p className="text-xl md:text-2xl font-semibold text-foreground leading-relaxed">
                {STORY_PARAGRAPHS[0].slice(1)}
              </p>
            </motion.div>

            {/* Horizontal rule */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border/60" />
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div className="flex-1 h-px bg-border/60" />
            </div>

            {/* Remaining paragraphs */}
            {STORY_PARAGRAPHS.slice(1).map((para, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className="text-base sm:text-lg text-muted-foreground leading-relaxed"
              >
                {para}
              </motion.p>
            ))}

            {/* Mission statement highlight */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative mt-10 p-8 rounded-2xl overflow-hidden border border-primary/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent" />
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-primary" />
              <p className="relative text-2xl md:text-3xl font-heading font-bold text-foreground leading-tight">
                "Making IT Dreams a Reality,<br />
                <span className="text-gradient">one creative at a time."</span>
              </p>
              <p className="relative mt-3 text-sm text-muted-foreground font-semibold">— Michael Kweku Essilfie, CEO & Founder</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FounderSection;
