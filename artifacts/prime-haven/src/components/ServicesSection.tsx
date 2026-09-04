import { motion, type Variants } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CORE_SERVICES } from '@/lib/coreServices';

const listVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 120, damping: 18, mass: 0.8 },
  },
};

const iconVariants: Variants = {
  hidden: { scale: 0.6, rotate: -12, opacity: 0 },
  visible: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 260, damping: 16, delay: 0.05 },
  },
};

const ServicesSection = () => {
  return (
    <section id="services" className="py-24 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:items-start gap-12 lg:gap-20">
            {/* Sticky Heading */}
            <div className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="self-start lg:sticky lg:top-32 flex flex-col gap-6"
              >
                <span className="eyebrow w-fit">What we do</span>
                <h2 className="text-4xl md:text-5xl font-heading font-extrabold tracking-tight leading-[1.05] text-foreground text-balance">
                  Our core <span className="display-italic text-primary">services</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed text-pretty">
                  Eight disciplines, one team. From brand and product design to code, motion, video, and the IT that keeps it all running.
                </p>
                <Link
                  to="/start-project"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all w-fit"
                >
                  Start a project <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </div>

            {/* Services list */}
            <div className="lg:col-span-7">
              <motion.ol
                variants={listVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className="flex flex-col gap-4"
                aria-label="Core services"
              >
                {CORE_SERVICES.map((service, index) => (
                  <motion.li
                    key={service.slug}
                    variants={itemVariants}
                    whileHover={{ x: 8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    className={`group flex items-start gap-5 rounded-2xl border border-border/60 bg-card/30 p-5 sm:p-6 ${index === 0 ? 'sm:col-span-2 sm:p-8 bg-primary/[0.04] border-primary/25' : ''}`}
                  >
                    <motion.div
                      variants={iconVariants}
                      className="w-12 h-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300"
                    >
                      <service.icon className="w-6 h-6 text-primary" aria-hidden="true" />
                    </motion.div>

                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                      <h3 className="text-xl font-heading font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                        {service.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed text-pretty">
                        {service.description}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </motion.ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
