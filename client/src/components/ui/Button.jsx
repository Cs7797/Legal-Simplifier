import React from 'react';
import { motion } from 'framer-motion';

const VARIANT_CLASSES = {
  primary:
    'border-transparent bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30',
  secondary:
    'border-white/60 bg-white/75 text-slate-700 shadow-sm shadow-slate-900/5 backdrop-blur hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:border-indigo-400/30 dark:hover:text-white',
  ghost:
    'border-transparent bg-transparent text-slate-600 hover:border-indigo-200/70 hover:bg-white/60 hover:text-indigo-600 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/10 dark:hover:text-white',
};

function Button({
  as = 'button',
  variant = 'primary',
  className = '',
  children,
  ...props
}) {
  const Component = as === 'a' ? motion.a : motion.button;
  const classes = [
    'inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:pointer-events-none disabled:opacity-50',
    VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component
      className={classes}
      whileHover={props.disabled ? undefined : { scale: 1.03 }}
      whileTap={props.disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Button;
