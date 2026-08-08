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
  display_order: number | null;
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-primary fill-primary' : 'text-muted-foreground/30'}`}
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

  // Auto-advance
  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(() => go(1), 6000);
    return () => clearInterval(timer);
  }, [go, testimonials.length]);

  if (loading || testimonials.length === 0) return null;

  const t = testimonials[current];

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 80 : -80 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -80 : 80 }),
  };

  return (
    <section className="py-24 relative overflow-hidden bg-background" id="testimonials">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="eyebrow mb-5">
            Client Stories
          </span>
          <h2 className="text-4xl sm:text-5xl font-heading font-extrabold tracking-tight leading-[1.02] text-foreground">
            What Our <span className="display-italic text-primary">Clients Say</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            Real words from the businesses we've helped transform digitally.
          </p>
        </motion.div>

        {/* Carousel */}
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            {/* Large quote icon */}
            <Quote className="absolute -top-6 -left-4 w-16 h-16 text-primary/10 rotate-180" />

            <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-8 sm:p-12 min-h-[260px] flex flex-col justify-between">
              <AnimatePresence custom={direction} mode="wait">
                <motion.div
                  key={t.id}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="flex flex-col gap-6"
                >
                  {/* Stars */}
                  <StarRating rating={t.rating} />

                  {/* Review text */}
                  <blockquote className="text-lg sm:text-xl text-foreground leading-relaxed font-medium">
                    "{t.review_text}"
                  </blockquote>

                  {/* Client info */}
                  <div className="flex items-center gap-4">
                    {/* Avatar placeholder */}
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-lg">
                        {t.client_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{t.client_name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        {t.company_role && (
                          <span className="text-sm text-muted-foreground">{t.company_role}</span>
                        )}
                        {t.company_role && t.service_used && (
                          <span className="text-muted-foreground/40">·</span>
                        )}
                        {t.service_used && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
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

          {/* Controls */}
          <div className="flex items-center justify-between mt-8">
            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > current ? 1 : -1);
                    setCurrent(i);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                    }`}
                  aria-label={`Go to review ${i + 1}`}
                />
              ))}
            </div>

            {/* Arrows */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => go(-1)}
                className="h-10 w-10 rounded-full border-border hover:border-primary hover:text-primary transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => go(1)}
                className="h-10 w-10 rounded-full border-border hover:border-primary hover:text-primary transition-colors"
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
