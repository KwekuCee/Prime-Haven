import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1300),
      setTimeout(() => setPhase(4), 1800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center bg-[#0a0f1e]" {...sceneTransitions.clipPolygon}>
      <motion.img 
        src={`${import.meta.env.BASE_URL}images/services-bg.png`}
        className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen"
        initial={{ x: '-5%' }}
        animate={{ x: '0%' }}
        transition={{ duration: 6, ease: "linear" }}
      />
      
      <div className="relative z-10 w-full max-w-[80vw] mx-auto flex flex-col items-center">
        <motion.h2 
          className="text-[4vw] font-bold mb-12 text-white/90"
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        >
          Everything you need, in one place
        </motion.h2>

        <div className="flex justify-between w-full gap-8">
          {["UI/UX Design", "Web Dev", "Graphic Design"].map((service, i) => (
            <motion.div 
              key={service}
              className="flex-1 bg-[#1a1f35]/80 border border-white/10 p-8 flex items-center justify-center text-[2.5vw] font-bold text-center rounded-2xl relative overflow-hidden h-[25vh]"
              initial={{ opacity: 0, y: 50, rotateX: -20 }}
              animate={phase >= i + 2 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 50, rotateX: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35]/20 to-transparent opacity-50" />
              <span className="relative z-10">{service}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
