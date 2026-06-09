import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center" {...sceneTransitions.fadeBlur}>
      <motion.img 
        src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
        className="absolute inset-0 w-full h-full object-cover opacity-40"
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 5 }}
      />
      
      <div className="relative z-10 text-center">
        <motion.h1 
          className="text-[6vw] font-bold text-white mb-4"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Ghana's Premier <span className="text-[#ff6b35]">Creative Hub</span>
        </motion.h1>
        
        <motion.div
          className="flex gap-8 justify-center text-[2.5vw] font-medium tracking-wide text-white/80"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <span>Connect.</span>
          <span>Create.</span>
          <span>Deliver.</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
