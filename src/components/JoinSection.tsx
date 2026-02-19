import { motion } from 'framer-motion';
import { ArrowRight, Zap, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const benefits = [
  { icon: Zap, text: 'Work on exciting projects' },
  { icon: Users, text: 'Join a vibrant community' },
  { icon: DollarSign, text: 'Earn competitive revenue share' },
];

const JoinSection = () => {
  return (
    <section className="py-28 relative overflow-hidden">
      {/* Full bleed orange-tinted dark background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Large glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/12 rounded-full blur-[180px] pointer-events-none" />

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-overlay opacity-10 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 px-5 py-2 rounded-full mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-sm font-bold tracking-wider uppercase">Join Our Tribe</span>
          </div>

          {/* Headline */}
          <h2 className="text-5xl md:text-6xl lg:text-8xl font-heading font-bold leading-[0.9] tracking-tighter mb-8">
            Ready to Create<br />
            <span className="text-gradient">Something</span><br />
            Amazing?
          </h2>

          {/* Description */}
          <p className="text-xl text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed">
            Become a Prime Haven member and unlock opportunities to work on innovative
            projects while earning your share of our revenue pool.
          </p>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-6 mb-14"
          >
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit.text}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 * i }}
                className="flex items-center gap-2.5 px-5 py-3 rounded-full border border-border/40 bg-card/40 backdrop-blur-sm"
              >
                <benefit.icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">{benefit.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col items-center gap-4"
          >
            <Link to="/register">
              <Button
                variant="primary"
                size="lg"
                className="group h-16 px-10 text-lg font-bold glow-strong relative overflow-hidden animate-pulse-glow"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Join Prime Haven — GH₵100
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
                </span>
              </Button>
            </Link>
            <p className="text-muted-foreground text-sm">
              One-time registration fee · Instant access
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default JoinSection;
