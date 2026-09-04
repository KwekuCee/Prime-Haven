import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Quote } from 'lucide-react';
import ceoPhoto from '@/assets/ceo-founder.jpg';

const STORY_PARAGRAPHS = [
  "Before Prime Haven existed, Michael Kweku Essilfie saw something that troubled him deeply — a generation of brilliantly creative people with no real stage. Graphic designers, UI/UX artists, web developers, and digital creatives across Ghana were producing world-class work, yet struggling to connect with the clients who needed them most. The talent was there. The opportunity was not.",
  "Michael decided to change that. Driven by a conviction that creative talent deserves more than uncertainty, he set out to build something unprecedented — a premium digital agency where talented creatives could thrive, not just survive. Not a marketplace. Not a gig board. A family. A community. A haven.",
  "Prime Haven was born from that vision. Michael assembled a handpicked team of the finest designers and developers, built a rigorous quality system, and created a platform that bridges the gap between world-class creative talent and businesses hungry for outstanding digital work. Every project accepted is a contract. Every deliverable, a promise.",
  "Today, Prime Haven stands as proof that when you invest in people and give talent a home, extraordinary things happen. Under Michael's leadership, the agency has grown into a powerhouse of digital excellence — delivering graphic design, UI/UX, web development, and IT solutions that turn client dreams into digital reality. The mission remains the same: Making IT Dreams a Reality, one creative at a time."
];

const FounderSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yImage = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);

  return (
    <section ref={ref} className="py-32 relative overflow-hidden" id="founder">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 w-full h-[500px] bg-primary/5 blur-[120px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      </div>

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative w-full"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

            {/* Image Parallax Side */}
            <div className="relative lg:col-span-4 xl:col-span-5 flex justify-center lg:justify-start">
              <motion.div style={{ y: yImage }} className="relative w-64 h-[350px] sm:w-80 sm:h-[450px] rounded-[2rem] overflow-hidden paper-card border-border/70 group">
                <img
                  loading="lazy"
                  src={ceoPhoto}
                  alt="Michael Kweku Essilfie - CEO & Founder"
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />

                <div className="absolute bottom-6 left-6 z-20">
                  <h3 className="text-2xl font-bold text-white drop-shadow-xl font-heading">
                    Michael Kweku<br />Essilfie
                  </h3>
                  <p className="text-primary font-bold text-sm mt-1 drop-shadow-md uppercase tracking-wider">
                    CEO & Founder
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Editorial Text Side */}
            <div className="flex flex-col justify-center lg:col-span-8 xl:col-span-7 relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <span className="eyebrow">
                  The Visionary
                </span>
                <div className="h-px w-16 bg-primary/30" />
              </div>

              <div className="space-y-6 lg:space-y-8 relative">
                <Quote className="absolute -top-6 -left-6 w-24 h-24 text-primary/5 -z-10 rotate-180" />

                {STORY_PARAGRAPHS.map((para, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 0.6, delay: i * 0.15 }}
                    className={`leading-relaxed text-base sm:text-lg ${i === 0 ? 'text-foreground font-medium text-lg sm:text-xl' : 'text-muted-foreground'}`}
                  >
                    {i === 0 && (
                      <span className="text-primary font-bold text-5xl sm:text-6xl leading-[0.8] float-left mr-3 mt-1 font-heading">
                        {para.charAt(0)}
                      </span>
                    )}
                    {i === 0 ? para.slice(1) : para}
                  </motion.p>
                ))}
              </div>

              {/* Stats row */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="grid grid-cols-3 gap-6 pt-10 mt-10 border-t border-border/50"
              >
                {[
                  { value: '50+', label: 'Projects Delivered' },
                  { value: '30+', label: 'Creative Talents' },
                  { value: '3', label: 'Core Services' },
                ].map((stat) => (
                  <div key={stat.label} className="text-left">
                    <p className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </motion.div>

            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FounderSection;
