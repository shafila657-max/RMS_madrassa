import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const COLORS = ['#10b981', '#f59e0b', '#34d399', '#fbbf24', '#0ea5e9', '#f43f5e', '#ffffff'];

// Party-popper burst from both bottom corners. Plays once, then clears itself.
const Confetti = ({ pieces = 70, duration = 3.2 }) => {
  const reduceMotion = useReducedMotion();

  const bits = useMemo(() => Array.from({ length: pieces }, (_, i) => {
    const fromLeft = i % 2 === 0;
    return {
      id: i,
      fromLeft,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 6,
      round: Math.random() > 0.6,
      x: (fromLeft ? 1 : -1) * (25 + Math.random() * 55),
      peak: -(45 + Math.random() * 45),
      rotate: (Math.random() - 0.5) * 900,
      delay: Math.random() * 0.25,
    };
  }), [pieces]);

  if (reduceMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden="true">
      {bits.map(b => (
        <motion.span
          key={b.id}
          className="absolute bottom-0 block"
          style={{
            left: b.fromLeft ? '4%' : '96%',
            width: b.size,
            height: b.round ? b.size : b.size * 0.45,
            borderRadius: b.round ? '9999px' : '2px',
            backgroundColor: b.color,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: `${b.x}vw`,
            y: [`0vh`, `${b.peak}vh`, `${b.peak + 60}vh`],
            opacity: [1, 1, 0],
            rotate: b.rotate,
          }}
          transition={{ duration, delay: b.delay, ease: 'easeOut', times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
};

export default Confetti;
