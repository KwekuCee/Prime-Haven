import { motion } from 'framer-motion';
import { Palette, Layers, Globe, Cpu, ArrowUpRight, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const services = [
  {
    icon: Palette,
    title: 'Graphic Design',
    slug: 'graphic-design',
    description: 'Eye-catching visual content that captivates audiences and elevates your brand identity.',
  },
  {
    icon: Layers,
    title: 'UI/UX Design',
    slug: 'ui-ux-design',
    description: 'Intuitive interfaces and seamless user experiences that delight and engage users.',
  },
  {
    icon: Globe,
    title: 'Web Development',
    slug: 'web-development',
    description: 'High-performance websites and web applications built with cutting-edge technologies.',
  },
  {
    icon: Cpu,
    title: 'IT Solutions',
    slug: 'it-solutions',
    description: 'Comprehensive technology solutions tailored to streamline your business operations.',
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-24 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
            {/* Sticky Heading */}
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-32 space-y-6">
                <span className="eyebrow">What we do</span>
                <h2 className="text-4xl md:text-5xl font-heading font-extrabold tracking-tight leading-[1.05] text-foreground">
                  Our core <span className="display-italic text-primary">services</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We offer a comprehensive suite of digital services designed to transform your vision into reality.
                </p>
                <Link
                  to="/start-project"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all"
                >
                  Start a project <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Scrolling Services */}
            <div className="lg:col-span-7">
              <div className="flex flex-col gap-6">
                {services.map((service, index) => (
                  <motion.div
                    key={service.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, delay: index * 0.05 }}
                  >
                    <Link to={`/services/${service.slug}`} className="block">
                      <motion.div
                        whileHover={{ y: -6 }}
                        className="glass glass-hover rounded-2xl p-8 group cursor-pointer flex flex-col sm:flex-row gap-6"
                      >
                        {/* Icon */}
                        <div className="w-14 h-14 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <service.icon className="w-7 h-7 text-primary" />
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <h3 className="text-xl font-heading font-bold mb-3 group-hover:text-primary transition-colors">
                            {service.title}
                          </h3>
                          <p className="text-muted-foreground leading-relaxed mb-4">
                            {service.description}
                          </p>
                          <div className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-sm font-medium">Learn more</span>
                            <ArrowUpRight className="w-4 h-4 ml-1" />
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
