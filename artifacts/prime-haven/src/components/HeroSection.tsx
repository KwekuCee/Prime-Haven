import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Search, Briefcase, Users, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MagneticEffect } from '@/components/ui/MagneticEffect';
import { Link } from 'react-router-dom';
import heroBg from '@/assets/hero-bg.jpg';
import { useTranslation } from 'react-i18next';

const HeroSection = () => {
  const { t } = useTranslation();

  const quickStats = [
    { icon: Users, label: 'Active Designers', value: '50+' },
    { icon: Briefcase, label: 'Projects Delivered', value: '200+' },
    { icon: Star, label: 'Client Satisfaction', value: '98%' },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Dynamic Aurora/Mesh Tech Background */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-transparent">
        {/* Animated glowing orbs for tech aurora effect */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[10%] left-[10%] w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-primary/20 rounded-full blur-[100px] md:blur-[150px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] md:w-[700px] md:h-[700px] bg-blue-600/15 rounded-full blur-[120px] md:blur-[160px]"
        />

        {/* Overlay grid mesh that fades out towards the bottom */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsla(226,60%,40%,0.08)_1px,transparent_1px),linear-gradient(to_bottom,hsla(226,60%,40%,0.08)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_20%,#000_40%,transparent_100%)]" />

        {/* Gradient fade out to seamlessly transition to standard page body */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/80 to-background" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 relative z-10 pt-20">
        <div className="flex flex-col items-center justify-center max-w-4xl mx-auto">
          <div className="text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8 mx-auto"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground font-medium">Ghana's Premier Freelance Design & Tech Hub</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-bold leading-tight mb-6"
            >
              Find Top{' '}
              <span className="text-gradient">Creative Talent</span>
              <br />
              or Get Hired
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-base sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto px-2 lg:px-0"
            >
              Post your project and get matched with skilled designers & developers, or join as a freelancer and start earning.
            </motion.p>

            {/* Dual CTA */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
            >
              <MagneticEffect intensity={0.15}>
                <Link to="/start-project">
                  <Button variant="primary" size="lg" className="group glow-primary text-base px-8 h-12">
                    <Briefcase className="w-5 h-5 mr-2" />
                    Start a Project
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </MagneticEffect>
              <MagneticEffect intensity={0.1}>
                <Link to="/register">
                  <Button variant="outline" size="lg" className="text-base px-8 h-12 bg-background/50 backdrop-blur-md">
                    <Users className="w-5 h-5 mr-2" />
                    Join as Freelancer
                  </Button>
                </Link>
              </MagneticEffect>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 lg:gap-12"
            >
              {quickStats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-6 h-10 rounded-full border-2 border-muted-foreground flex justify-center pt-2"
          >
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1 h-2 bg-primary rounded-full"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
