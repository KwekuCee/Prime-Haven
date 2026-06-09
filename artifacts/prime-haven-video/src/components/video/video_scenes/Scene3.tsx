import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center bg-[#0a0f1e]" {...sceneTransitions.splitHorizontal}>
      <motion.img 
        src={`${import.meta.env.BASE_URL}images/stats-bg.png`}
        className="absolute inset-0 w-full h-full object-cover opacity-50"
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={{ duration: 5 }}
      />
      
      <div className="relative z-10 flex gap-20 items-center justify-center w-full">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="text-[12vw] font-black text-[#ff6b35] leading-none mb-2">50+</div>
          <div className="text-[3vw] font-medium text-white/80">Top Designers</div>
        </motion.div>

        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="text-[12vw] font-black text-[#ff6b35] leading-none mb-2">200+</div>
          <div className="text-[3vw] font-medium text-white/80">Projects Delivered</div>
        </motion.div>
      </div>
    </motion.div>
  );
}
