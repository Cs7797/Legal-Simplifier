import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from './ui/GlassCard';

const STEPS = [
  { id: 'uploading', label: 'Upload', description: 'Validating source and secure intake' },
  { id: 'extracting', label: 'Chunking', description: 'Extracting text and preparing sections' },
  { id: 'simplifying', label: 'AI Analysis', description: 'Summaries, clauses, risks, and advice' },
  { id: 'translating', label: 'Simplification', description: 'Preparing translated or localized output' },
];

function ProcessingStatus({ currentStep }) {
  const getStepStatus = (stepId) => {
    if (currentStep === stepId) return 'current';
    const currentIndex = STEPS.findIndex((step) => step.id === currentStep);
    const stepIndex = STEPS.findIndex((step) => step.id === stepId);
    return stepIndex < currentIndex ? 'completed' : 'pending';
  };

  return (
    <GlassCard className="relative overflow-hidden p-6" hover={false}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(99,102,241,0.12),transparent_22%)]" />
      <div className="relative">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-300" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Analyzing your document</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The live pipeline makes every stage visible while the analysis runs.</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          {STEPS.map((step, index) => {
            const status = getStepStatus(step.id);

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26, delay: index * 0.05, ease: 'easeOut' }}
                className={`rounded-[1.5rem] border p-4 ${
                  status === 'current'
                    ? 'border-cyan-400/30 bg-cyan-500/10 shadow-[0_0_30px_rgba(34,211,238,0.08)]'
                    : status === 'completed'
                      ? 'border-emerald-400/20 bg-emerald-500/10'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-300">
                    {index + 1}
                  </div>
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    status === 'current' ? 'bg-cyan-300 animate-pulse' : status === 'completed' ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-700'
                  }`} />
                </div>
                <p className="mt-4 text-base font-semibold text-slate-900 dark:text-white">{step.label}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{step.description}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {status === 'current' ? 'In progress' : status === 'completed' ? 'Completed' : 'Queued'}
                </p>
                {status === 'current' && (
                  <div className="shimmer mt-3 h-2 w-full rounded-full bg-cyan-100 dark:bg-cyan-500/20" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

export default ProcessingStatus;
