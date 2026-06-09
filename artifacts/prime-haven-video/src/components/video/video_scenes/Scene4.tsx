import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f1e]" {...sceneTransitions.zoomThrough}>
      <motion.div
        className="absolute inset-0 bg-[#ff6b35]"
        initial={{ opacity: 0.1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 2 }}
      />
      <motion.div
        className="text-[8vw] font-bold text-white tracking-tight"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        PRIME<span className="text-[#ff6b35]">HAVEN</span>
      </motion.div>
      <motion.div
        className="text-[2.5vw] text-white/60 mt-4 font-medium"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        Your Next Great Idea Starts Here
      </motion.div>
    </motion.div>
  );
}
