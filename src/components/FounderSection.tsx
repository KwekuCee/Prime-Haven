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
    <section className="py-24 relative overflow-hidden bg-background" id="founder">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/20 mb-4">
            The Visionary
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground">
            Meet Our <span className="text-primary">CEO & Founder</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          {/* Photo side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="flex flex-col items-center lg:items-start gap-6"
          >
            {/* Photo frame */}
            <div className="relative group">
              {/* Decorative ring */}
              <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-primary via-primary/50 to-transparent opacity-60 blur-sm group-hover:opacity-80 transition-opacity duration-500" />
              <div className="relative w-72 h-80 sm:w-80 sm:h-96 rounded-2xl overflow-hidden border-2 border-primary/30 bg-card">
                <img
                  src={ceoPhoto}
                  alt="Michael Kweku Essilfie - CEO & Founder, Prime Haven"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-full object-cover object-top bg-muted"
                />
              </div>
            </div>

            {/* Name card */}
            <div className="text-center lg:text-left">
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground">Michael Kweku Essilfie</h3>
              <p className="text-primary font-semibold text-lg mt-1">CEO & Founder</p>
              <p className="text-muted-foreground text-sm mt-2 font-medium">Prime Haven · Making IT Dreams a Reality</p>
            </div>

            {/* Quote decoration */}
            <div className="hidden lg:flex items-start gap-3 max-w-xs p-4 rounded-xl bg-card border border-border">
              <Quote className="w-6 h-6 text-primary shrink-0 mt-1" />
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                "Talent without opportunity is potential wasted. Prime Haven is that opportunity."
              </p>
            </div>
          </motion.div>

          {/* Story side */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-5"
          >
            {STORY_PARAGRAPHS.map((para, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 * i }}
                className={`leading-relaxed text-base sm:text-lg ${
                  i === 0
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {i === 0 && (
                  <span className="text-primary font-bold text-4xl sm:text-5xl leading-none float-left mr-2 mt-1">B</span>
                )}
                {i === 0 ? para.slice(1) : para}
              </motion.p>
            ))}

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="grid grid-cols-3 gap-4 pt-6 border-t border-border"
            >
              {[
                { value: '50+', label: 'Projects Delivered' },
                { value: '30+', label: 'Creative Talents' },
                { value: '3', label: 'Core Services' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold text-primary">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FounderSection;
