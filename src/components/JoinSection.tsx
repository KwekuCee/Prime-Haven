import { motion } from 'framer-motion';
import { ArrowRight, Zap, Users, DollarSign, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const JoinSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px]" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
          {/* For Clients */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-2xl p-10"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
              <Briefcase className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-3xl font-heading font-bold mb-4">
              Need a <span className="text-gradient">Design Done?</span>
            </h3>
            <p className="text-muted-foreground mb-6 text-lg">
              Post your project and our team of vetted designers and developers will bring your vision to life — fast and affordable.
            </p>
            <ul className="space-y-3 mb-8">
              {['Get matched with skilled creatives', 'Track progress in real-time', 'Pay only when satisfied'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="w-4 h-4 text-primary shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <a href="#contact">
              <Button variant="primary" size="lg" className="group">
                Start a Project
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
          </motion.div>

          {/* For Freelancers */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-2xl p-10"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-3xl font-heading font-bold mb-4">
              Want to <span className="text-gradient">Earn Money?</span>
            </h3>
            <p className="text-muted-foreground mb-6 text-lg">
              Join Prime Haven as a freelance designer or developer. Work on real projects, build your portfolio, and earn your share of our revenue pool.
            </p>
            <ul className="space-y-3 mb-8">
              {['Work on exciting client projects', 'Earn competitive revenue share', 'Join a vibrant creative community'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4 text-primary shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link to="/register">
              <Button variant="primary" size="lg" className="group animate-pulse-glow">
                Join as Freelancer — GH₵100
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <p className="text-muted-foreground text-sm mt-4">One-time fee • Instant access</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default JoinSection;
