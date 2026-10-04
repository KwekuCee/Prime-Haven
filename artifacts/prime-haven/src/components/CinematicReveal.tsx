import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface CinematicRevealProps {
  children: ReactNode;
  className?: string;
  direction?: 'left' | 'right' | 'up';
  first?: boolean;
}

const CinematicReveal = ({ children, className, direction = 'up', first = false }: CinematicRevealProps) => {
  const reduceMotion = useReducedMotion();
  const offset = direction === 'left' ? -34 : direction === 'right' ? 34 : 0;

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, x: offset, y: direction === 'up' ? 46 : 20, scale: 0.985, filter: 'blur(12px)' }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: first ? 0.18 : 0.08, margin: first ? '0px 0px -8% 0px' : '0px 0px -12% 0px' }}
      transition={reduceMotion ? { duration: 0 } : { duration: first ? 0.95 : 0.72, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};

export default CinematicReveal;