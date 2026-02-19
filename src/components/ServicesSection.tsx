import { motion } from 'framer-motion';
import { Palette, Layers, Globe, Cpu, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const services = [
  {
    icon: Palette,
    title: 'Graphic Design',
    slug: 'graphic-design',
    description: 'Eye-catching visual content that captivates audiences and elevates your brand identity.',
    tag: '01',
  },
  {
    icon: Layers,
    title: 'UI/UX Design',
    slug: 'ui-ux-design',
    description: 'Intuitive interfaces and seamless user experiences that delight and engage users.',
    tag: '02',
  },
  {
    icon: Globe,
    title: 'Web Development',
    slug: 'web-development',
    description: 'High-performance websites and web applications built with cutting-edge technologies.',
    tag: '03',
  },
  {
    icon: Cpu,
    title: 'IT Solutions',
    slug: 'it-solutions',
    description: 'Comprehensive technology solutions tailored to streamline your business operations.',
    tag: '04',
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-28 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 stripe-bg opacity-50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6">
        {/* Section Header - editorial style */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-20">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs mb-5">
              <span className="w-8 h-px bg-primary" />
              What We Do
            </span>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold leading-none">
              Our<br />
              <span className="text-gradient">Services</span>
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-muted-foreground max-w-xs text-base leading-relaxed md:text-right"
          >
            A comprehensive suite of digital services designed to transform your vision into reality.
          </motion.p>
        </div>

        {/* Services — large editorial list */}
        <div className="divide-y divide-border/40">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <Link to={`/services/${service.slug}`}>
                <motion.div
                  whileHover={{ x: 8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="group flex items-center gap-6 md:gap-10 py-8 cursor-pointer"
                >
                  {/* Number */}
                  <span className="hidden sm:block text-xs font-bold text-primary/50 font-heading tracking-wider w-6 shrink-0">
                    {service.tag}
                  </span>

                  {/* Icon bubble */}
                  <div className="w-14 h-14 rounded-2xl bg-card border border-border/60 group-hover:border-primary/40 group-hover:bg-primary/10 flex items-center justify-center transition-all duration-300 shrink-0">
                    <service.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-heading font-bold group-hover:text-primary transition-colors duration-300">
                      {service.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1.5 max-w-sm leading-relaxed hidden md:block">
                      {service.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="w-10 h-10 rounded-full border border-border/60 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all duration-300 shrink-0">
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary-foreground transition-colors duration-300" />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
