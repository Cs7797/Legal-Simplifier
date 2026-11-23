import React from 'react';
import { motion } from 'framer-motion';

function GlassCard({ className = '', children, hover = true, ...props }) {
  const classes = [
    'surface-panel rounded-2xl shadow-md transition-all duration-200 ease-in-out',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.div
      className={classes}
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ duration: 0.24, ease: 'easeInOut' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default GlassCard;
