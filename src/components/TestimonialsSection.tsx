import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface Testimonial {
  id: string;
  client_name: string;
  company_role: string | null;
  service_used: string | null;
  rating: number;
  review_text: string;
  display_order: number;
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-1">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-primary fill-primary' : 'text-muted-foreground/20'}`}
      />
    ))}
  </div>
);

const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      const { data } = await supabase
        .from('testimonials')
        .select('id, client_name, company_role, service_used, rating, review_text, display_order')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });
      if (data) setTestimonials(data);
      setLoading(false);
    };
    fetchTestimonials();
  }, []);

  const go = useCallback((dir: 1 | -1) => {
    setDirection(dir);
    setCurrent((prev) => (prev + dir + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(() => go(1), 6000);
    return () => clearInterval(timer);
  }, [go, testimonials.length]);

  if (loading || testimonials.length === 0) return null;

  const t = testimonials[current];

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60, filter: 'blur(4px)' }),
    center: { opacity: 1, x: 0, filter: 'blur(0px)' },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60, filter: 'blur(4px)' }),
  };

  return (
    <section className="py-28 relative overflow-hidden" id="testimonials">
      {/* Background */}
      <div className="absolute inset-0 grid-overlay opacity-10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/6 rounded-full blur-[150px] pointer-events-none" />

      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-20">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-xs mb-5">
              <span className="w-8 h-px bg-primary" />
              Client Stories
            </span>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold leading-none">
              What Clients<br />
              <span className="text-gradient">Say</span>
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-muted-foreground max-w-xs text-base leading-relaxed md:text-right"
          >
            Real words from the businesses we've helped transform digitally.
          </motion.p>
        </div>

        {/* Carousel */}
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            {/* Large decorative quote */}
            <Quote className="absolute -top-8 -left-4 w-20 h-20 text-primary/8 rotate-180 select-none" />
            <Quote className="absolute -bottom-8 -right-4 w-20 h-20 text-primary/8 select-none" />

            <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/60 backdrop-blur-sm min-h-[280px]">
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

              <div className="p-10 sm:p-14">
                <AnimatePresence custom={direction} mode="wait">
                  <motion.div
                    key={t.id}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col gap-7"
                  >
                    <StarRating rating={t.rating} />

                    <blockquote className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-foreground leading-tight">
                      "{t.review_text}"
                    </blockquote>

                    <div className="flex items-center gap-4 pt-2 border-t border-border/40">
                      <div className="w-11 h-11 rounded-full bg-gradient-primary flex items-center justify-center shrink-0 shadow-[0_0_20px_hsla(16,99%,55%,0.3)]">
                        <span className="text-primary-foreground font-bold text-base">
                          {t.client_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{t.client_name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          {t.company_role && (
                            <span className="text-sm text-muted-foreground">{t.company_role}</span>
                          )}
                          {t.company_role && t.service_used && (
                            <span className="text-muted-foreground/40">·</span>
                          )}
                          {t.service_used && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                              {t.service_used}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-8">
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > current ? 1 : -1);
                    setCurrent(i);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-400 ${
                    i === current ? 'w-10 bg-primary shadow-[0_0_10px_hsla(16,99%,55%,0.6)]' : 'w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/50'
                  }`}
                  aria-label={`Go to review ${i + 1}`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => go(-1)}
                className="h-10 w-10 rounded-full border-border/60 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => go(1)}
                className="h-10 w-10 rounded-full border-border/60 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
