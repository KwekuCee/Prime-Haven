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
    <section className="py-24 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px]" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <span className="inline-block px-4 py-2 rounded-full glass text-primary text-sm font-medium mb-6">
            Join Our Tribe
          </span>

          {/* Headline */}
          <h2 className="text-4xl md:text-6xl font-heading font-bold mb-6">
            Ready to Create{' '}
            <span className="text-gradient">Something Amazing?</span>
          </h2>

          {/* Description */}
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Become a Prime Haven member and unlock opportunities to work on innovative 
            projects while earning your share of our revenue pool.
          </p>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-6 mb-10"
          >
            {benefits.map((benefit) => (
              <div key={benefit.text} className="flex items-center gap-2 text-muted-foreground">
                <benefit.icon className="w-5 h-5 text-primary" />
                <span>{benefit.text}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link to="/register">
              <Button variant="primary" size="lg" className="group animate-pulse-glow">
                Join Prime Haven — $5
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <p className="text-muted-foreground text-sm mt-4">
              One-time registration fee • Instant access
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default JoinSection;
