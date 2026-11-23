import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';

const FEATURES = [
  'Clause intelligence',
  'Risk heatmaps',
  'Explainable AI',
  'Contract comparison',
  'Context-aware chat',
  'Audit-ready exports',
];

const HERO_METRICS = [
  { label: 'Clauses detected', value: '248' },
  { label: 'Average clarity gain', value: '63%' },
  { label: 'Review turnaround', value: '< 60s' },
];

const PIPELINE_STEPS = [
  { title: 'Upload', detail: 'PDF, DOCX, TXT, or scanned pages enter a secure intake lane.' },
  { title: 'Chunking', detail: 'Sections are segmented into retrieval-ready legal units.' },
  { title: 'Embeddings', detail: 'Semantic vectors capture intent, obligations, and references.' },
  { title: 'Retrieval', detail: 'Relevant evidence is recalled before the model answers.' },
  { title: 'AI Analysis', detail: 'Complex language becomes plain-English explanations.' },
  { title: 'Risk Detection', detail: 'Clauses are scored for impact, ambiguity, and exposure.' },
  { title: 'Simplification', detail: 'Negotiation-ready summaries and rewrites are generated.' },
];

const STORY_SECTIONS = [
  {
    eyebrow: 'Step 01',
    title: 'Start with the original agreement, exactly as it was drafted.',
    body: 'Document previews, clause labels, and contract metadata establish trust before any AI intervention happens.',
    accent: 'from-cyan-400/30 via-indigo-500/20 to-transparent',
  },
  {
    eyebrow: 'Step 02',
    title: 'Peel back dense legal language into plain-English explanations.',
    body: 'Complex obligations and definitions fade into concise guidance your team can act on immediately.',
    accent: 'from-violet-400/30 via-fuchsia-500/20 to-transparent',
  },
  {
    eyebrow: 'Step 03',
    title: 'Overlay a live risk model on top of the clauses that matter most.',
    body: 'High-risk language lights up first, with rationale, safer rewrites, and explainable flags attached to each issue.',
    accent: 'from-rose-400/30 via-amber-500/20 to-transparent',
  },
  {
    eyebrow: 'Step 04',
    title: 'Finish with recommendations, evidence, and next-step confidence.',
    body: 'Users see why a clause was flagged, what to negotiate, and what retrieved context grounded the answer.',
    accent: 'from-emerald-400/30 via-sky-500/20 to-transparent',
  },
];

const HEATMAP_CLAUSES = [
  {
    title: 'Unlimited liability clause',
    level: 'High risk',
    riskClass: 'bg-red-500/10 text-red-700 ring-1 ring-red-400/30 dark:bg-red-500/20 dark:text-red-200',
    summary: 'Exposes the signer to unrestricted financial responsibility for indirect and consequential loss.',
    rewrite: 'Cap liability to fees paid under the agreement and exclude indirect damages.',
    score: '9.2',
  },
  {
    title: 'Termination on seven days notice',
    level: 'Medium risk',
    riskClass: 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-400/30 dark:bg-amber-500/20 dark:text-amber-200',
    summary: 'Creates business continuity risk by allowing a fast exit window with limited cure time.',
    rewrite: 'Extend the cure period and require material breach plus written notice.',
    score: '6.5',
  },
  {
    title: 'Assignment only with sole discretion',
    level: 'Medium risk',
    riskClass: 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-400/30 dark:bg-amber-500/20 dark:text-amber-200',
    summary: 'Restricts operational flexibility during restructuring, fundraising, or vendor changes.',
    rewrite: 'Permit assignment to affiliates or successors with notice rather than absolute approval.',
    score: '5.8',
  },
  {
    title: 'Standard payment timing',
    level: 'Low risk',
    riskClass: 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-400/30 dark:bg-emerald-500/20 dark:text-emerald-200',
    summary: 'Payment cadence is conventional and easy for both parties to interpret.',
    rewrite: 'No revision needed unless invoice timing needs clarification.',
    score: '2.1',
  },
];

const DASHBOARD_METRICS = [
  { label: 'Readability score', value: 91, tone: 'from-cyan-400 to-sky-500', suffix: '/100' },
  { label: 'Risk score', value: 78, tone: 'from-rose-500 to-orange-400', suffix: '/100' },
  { label: 'Simplification accuracy', value: 96, tone: 'from-violet-500 to-indigo-500', suffix: '%' },
  { label: 'Clauses detected', value: 24, tone: 'from-emerald-400 to-teal-500', suffix: '' },
];

const USER_DOCS = [
  {
    title: 'Quick Start',
    points: [
      'Sign in so uploads, history, and chat stay attached to your workspace.',
      'Open Analyze and choose File or Text mode.',
      'Run analysis to generate a summary, risk score, clauses, and advice.',
      'Ask follow-up questions in the assistant using the saved document context.',
    ],
  },
  {
    title: 'How It Works',
    points: [
      'Upload or paste a legal document.',
      'The app extracts and cleans the document text.',
      'AI simplifies the document and identifies important clauses.',
      'Risk scoring and actionable advice are shown in structured cards.',
      'The assistant retrieves relevant document chunks before answering.',
    ],
  },
  {
    title: 'Features',
    points: [
      'Risk score with high, medium, and safe breakdowns.',
      'Clause scan for obligations, termination, payment, liability, and penalties.',
      'Compare mode for added, removed, and modified clauses.',
      'Multi-language output for simplified English or original language.',
      'PDF exports and saved analysis history.',
    ],
  },
];

const DEVELOPER_DOCS = [
  {
    title: 'Quick Start',
    points: [
      'Install dependencies in both client and server folders.',
      'Configure Supabase, auth keys, database URL, and AI provider keys.',
      'Apply the database schema so pgvector and RAG chunk tables exist.',
      'Run the backend server and Vite client locally.',
    ],
  },
  {
    title: 'How It Works',
    points: [
      'React routes collect files, text, language mode, and chat messages.',
      'Express APIs handle upload, extraction, analysis, comparison, chat, and persistence.',
      'Analysis output is saved to Supabase/PostgreSQL for authenticated users.',
      'RAG chunks are embedded, stored in pgvector, and retrieved with hybrid search.',
      'Chat responses receive retrieved source chunks as grounding context.',
    ],
  },
  {
    title: 'Features',
    points: [
      'Auth-gated routes and API requests with bearer tokens.',
      'PostgreSQL persistence for analyses, history, and RAG chunks.',
      'Hybrid RAG retrieval using semantic vector search plus full-text search.',
      'Deterministic reranking for final source chunk selection.',
      'Modular backend services for analysis, translation, persistence, and RAG.',
    ],
  },
];

const ARCHITECTURE_STEPS = [
  'React + Tailwind UI',
  'Express API',
  'Text Extraction',
  'AI Analysis',
  'PostgreSQL + pgvector',
  'Hybrid RAG Chat',
];

const TEST_DOCUMENT = `Residential Lease Test Clause

The tenant must pay rent of $1,800 on the first day of each month. If payment is more than five days late, the landlord may charge a late fee of $150.

The landlord may terminate this agreement with seven days notice if the tenant breaches any material obligation, including unpaid rent, unauthorized occupants, or damage to the property.

The tenant agrees to indemnify and hold the landlord harmless from all claims, losses, damages, and attorney fees arising from the tenant's use of the premises.

The tenant may not assign or sublease the property without the landlord's prior written consent. The landlord may withhold consent at its sole discretion.

Questions to test:
1. What are the top risks for the tenant?
2. Is the late fee reasonable?
3. What should the tenant negotiate before signing?`;

const fadeIn = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

function countUpTransition(index) {
  return { duration: 0.6, delay: index * 0.08, ease: 'easeOut' };
}

function DocCard({ section, index }) {
  return (
    <motion.div variants={fadeIn}>
      <GlassCard className="h-full p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge>{section.title}</Badge>
            <h3 className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">{section.title}</h3>
          </div>
          <span className="rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20">
            0{index + 1}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {section.points.map((point, pointIndex) => (
            <div
              key={point}
              className="surface-panel-muted flex gap-3 rounded-2xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-xs font-semibold text-white">
                {pointIndex + 1}
              </span>
              <span>{point}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}

function ArchitectureDiagram() {
  return (
    <GlassCard className="p-6" hover={false}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="indigo">Architecture</Badge>
          <h2 className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">The existing stack, presented with more clarity</h2>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {ARCHITECTURE_STEPS.map((step, index) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.28, delay: index * 0.05, ease: 'easeOut' }}
            className="relative"
          >
            <div className="surface-panel-muted min-h-[124px] rounded-3xl p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20">
                {index + 1}
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-950 dark:text-white">{step}</p>
            </div>
            {index < ARCHITECTURE_STEPS.length - 1 && (
              <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-cyan-300/70 xl:block dark:bg-cyan-400/20" />
            )}
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

function HeroSection({ primaryHref }) {
  return (
    <GlassCard className="hero-shell relative overflow-hidden p-8 lg:p-10" hover={false}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.2),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.22),transparent_28%),radial-gradient(circle_at_60%_80%,rgba(236,72,153,0.15),transparent_25%)]" />
      <div className="pointer-events-none absolute left-[10%] top-10 h-24 w-24 rounded-full border border-cyan-300/20 bg-cyan-400/10 blur-2xl" />
      <div className="pointer-events-none absolute right-[8%] top-24 h-32 w-32 rounded-full border border-fuchsia-300/20 bg-fuchsia-500/10 blur-3xl" />

      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_470px] lg:items-center">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="relative"
        >
          <motion.div variants={fadeIn}>
            <Badge variant="indigo" className="border-cyan-400/20 bg-cyan-400/10 text-cyan-700 dark:text-cyan-200">
              Premium AI legal workspace
            </Badge>
          </motion.div>
          <motion.h1
            variants={fadeIn}
            className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl dark:text-white"
          >
            LEGAL DOCUMENT SIMPLIFIER
          </motion.h1>
          <motion.p
            variants={fadeIn}
            className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300"
          >
            AI-powered simplification, risk detection, and explainable legal insights presented like a live intelligence system.
          </motion.p>
          <motion.div variants={fadeIn} className="mt-7 flex flex-wrap gap-3">
            <Button as="a" href={primaryHref} className="shadow-[0_0_40px_rgba(56,189,248,0.18)]">
              Upload and analyze
            </Button>
            <Button as="a" href="#story-sections" variant="secondary" className="dark:border-cyan-500/20 dark:bg-white/5">
              Explore the product story
            </Button>
          </motion.div>

          <motion.div variants={fadeIn} className="mt-10 grid gap-3 sm:grid-cols-3">
            {HERO_METRICS.map((metric) => (
              <div key={metric.label} className="glass-chip rounded-3xl px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{metric.value}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: 'easeOut' }}
          className="relative"
        >
          <div className="absolute -left-10 top-12 hidden w-48 rounded-3xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl lg:block dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Live clause state</p>
            <div className="mt-3 space-y-2">
              {['Liability flagged', 'Termination window detected', 'Payment terms normalized'].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-200">
                  <span className={`h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-red-400' : index === 1 ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="absolute -right-8 bottom-10 hidden w-44 rounded-3xl border border-cyan-200 bg-white/88 p-4 backdrop-blur-xl lg:block dark:border-cyan-400/15 dark:bg-slate-950/60">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Explainability</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">92%</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">confidence with retrieved source evidence attached</p>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(241,245,249,0.88))] p-5 shadow-[0_25px_80px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.82))] dark:shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent dark:via-cyan-400/60" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Document intelligence</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Lease_review_v7.pdf</h2>
              </div>
              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Risk score', value: '7.8 / 10', tone: 'text-rose-300' },
                  { label: 'Clauses reviewed', value: '24', tone: 'text-cyan-200' },
                  { label: 'Plain-English summary', value: 'Ready', tone: 'text-emerald-300' },
                ].map((item) => (
                  <div key={item.label} className="rounded-3xl border border-slate-200 bg-white/88 px-4 py-4 dark:border-white/8 dark:bg-white/5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{item.label}</p>
                    <p className={`mt-3 text-2xl font-semibold ${item.tone}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Highlighted document</p>
                  <Badge variant="danger">High exposure</Badge>
                </div>
                <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                  <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-rose-900 dark:text-inherit">
                    The tenant agrees to indemnify and hold the landlord harmless from all claims, losses, damages, and attorney fees...
                  </p>
                  <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-inherit">
                    The landlord may terminate this agreement with seven days notice if the tenant breaches any material obligation...
                  </p>
                  <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-emerald-900 dark:text-inherit">
                    The tenant must pay rent of $1,800 on the first day of each month...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="relative mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white/70 py-3 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="animate-[feature-scroll_22s_linear_infinite] whitespace-nowrap">
          {[...FEATURES, ...FEATURES, ...FEATURES].map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="mx-2 inline-flex rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur-xl dark:border-cyan-400/15 dark:bg-white/[0.05] dark:text-slate-200"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

function PipelineSection() {
  return (
    <GlassCard className="relative overflow-hidden p-6 lg:p-8" hover={false}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(129,140,248,0.12),transparent_22%)]" />
      <div className="relative">
        <Badge variant="indigo">AI pipeline</Badge>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">A visible processing pipeline makes the product feel engineered</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Each stage glows in sequence to explain how the system moves from raw uploads to grounded, explainable legal insight.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          {PIPELINE_STEPS.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.32, delay: index * 0.05, ease: 'easeOut' }}
              className="relative"
            >
              <div className="pipeline-node h-full rounded-[1.75rem] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25">
                    {index + 1}
                  </div>
                  <div className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

function StorySection() {
  return (
    <div id="story-sections" className="grid gap-4">
      {STORY_SECTIONS.map((section, index) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <GlassCard className="relative overflow-hidden p-6 lg:p-8" hover={false}>
            <div className={`pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r ${section.accent}`} />
            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
              <div>
                <Badge>{section.eyebrow}</Badge>
                <h3 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">{section.title}</h3>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">{section.body}</p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(148,163,184,0.18)] dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_20px_60px_rgba(2,6,23,0.25)]">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <span>Preview state</span>
                  <span>0{index + 1}</span>
                </div>
                <div className="mt-5 space-y-3">
                  {index === 0 && (
                    <>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">Original legal wording preserved for audit traceability.</div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">Cross references, parties, dates, and obligations remain intact.</div>
                    </>
                  )}
                  {index === 1 && (
                    <>
                      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-800 dark:text-cyan-100">Plain-English summary replaces dense clause phrasing.</div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">Key duties, deadlines, and penalties are isolated.</div>
                    </>
                  )}
                  {index === 2 && (
                    <>
                      <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-100">Unlimited liability highlighted with a critical severity tag.</div>
                      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-100">Fast termination windows receive negotiation prompts.</div>
                    </>
                  )}
                  {index === 3 && (
                    <>
                      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-100">Recommended fallback language is ready to share with counsel.</div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">Retrieved evidence and confidence scores remain visible.</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}

function HeatmapShowcase() {
  const [activeClause, setActiveClause] = useState(HEATMAP_CLAUSES[0]);

  return (
    <GlassCard className="relative overflow-hidden p-6 lg:p-8" hover={false}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(239,68,68,0.12),transparent_20%),radial-gradient(circle_at_20%_70%,rgba(16,185,129,0.12),transparent_24%)]" />
      <div className="relative">
        <Badge variant="danger">Interactive risk heatmap</Badge>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">The centerpiece turns contract review into a visual risk system</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Hovering or selecting a clause reveals the risk score, explanation, and a safer rewrite, which makes the product feel immediately enterprise-grade.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white/92 p-5 shadow-[0_20px_70px_rgba(148,163,184,0.18)] dark:border-white/10 dark:bg-slate-950/75 dark:shadow-[0_20px_70px_rgba(2,6,23,0.3)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Contract surface</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">Service agreement excerpt</h3>
              </div>
              <Badge className="border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">Hover simulated</Badge>
            </div>

            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
              {HEATMAP_CLAUSES.map((clause) => (
                <button
                  key={clause.title}
                  type="button"
                  onMouseEnter={() => setActiveClause(clause)}
                  onFocus={() => setActiveClause(clause)}
                  onClick={() => setActiveClause(clause)}
                  className={`block w-full rounded-3xl px-4 py-4 text-left transition ${
                    activeClause.title === clause.title
                      ? 'border border-cyan-200 bg-cyan-50 shadow-[0_0_0_1px_rgba(34,211,238,0.12)] dark:border-white/10 dark:bg-white/8 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
                      : 'border border-transparent bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${clause.riskClass}`}>{clause.level}</span>
                    <span className="text-slate-950 dark:text-white">{clause.title}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{clause.summary}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <GlassCard className="p-5" hover={false}>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Selected clause</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{activeClause.title}</h3>
              <div className="mt-4 flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${activeClause.riskClass}`}>{activeClause.level}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">Risk score {activeClause.score}/10</span>
              </div>
              <div className="mt-5 rounded-3xl bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {activeClause.summary}
              </div>
            </GlassCard>

            <GlassCard className="p-5" hover={false}>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Suggested safer rewrite</p>
              <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">{activeClause.rewrite}</p>
            </GlassCard>

            <GlassCard className="p-5" hover={false}>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Explainable AI panel</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Why flagged</p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">The clause concentrates financial exposure on one party without a liability cap or carve-outs.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Retrieved context</p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">Matched against indemnity, limitation of liability, and risk-allocation patterns from prior clause segments.</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function MetricsSection() {
  return (
    <GlassCard className="p-6 lg:p-8" hover={false}>
      <Badge variant="indigo">Results dashboard</Badge>
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Animated metrics make the system feel alive after every analysis</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            The current app already computes rich results. This section reframes those outputs into premium KPI cards and visual summaries.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {DASHBOARD_METRICS.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={countUpTransition(index)}
            className="rounded-[1.75rem] border border-slate-200 bg-white/92 p-5 shadow-[0_18px_60px_rgba(148,163,184,0.18)] dark:border-white/10 dark:bg-slate-950/78 dark:shadow-[0_18px_60px_rgba(2,6,23,0.28)]"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{metric.label}</p>
            <div className={`mt-5 inline-flex rounded-full bg-gradient-to-r ${metric.tone} px-3 py-1 text-xs font-semibold text-white`}>
              Live signal
            </div>
            <p className="mt-5 text-4xl font-semibold text-slate-950 dark:text-white">
              {metric.value}
              <span className="ml-1 text-lg text-slate-500 dark:text-slate-400">{metric.suffix}</span>
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/8">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${Math.min(100, metric.value)}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.08, ease: 'easeOut' }}
                className={`h-full rounded-full bg-gradient-to-r ${metric.tone}`}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

function ComparisonSection() {
  return (
    <GlassCard className="p-6 lg:p-8" hover={false}>
      <Badge>Comparison view</Badge>
      <div className="mt-4 grid gap-5 xl:grid-cols-2">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white/92 p-5 dark:border-white/10 dark:bg-slate-950/78">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Original contract</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-100">Unlimited indemnity survives termination.</div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-100">Cure period limited to seven days.</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">Assignment requires sole discretion approval.</div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white/92 p-5 dark:border-white/10 dark:bg-slate-950/78">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Simplified contract</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-100">Liability capped to fees paid in the prior 12 months.</div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-800 dark:text-cyan-100">Cure period extended to 30 days for non-payment breaches.</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">Affiliate assignment allowed with written notice.</div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function DocsPage({ copyTestDocument, copied, scrollToDocSection }) {
  return (
    <section className="space-y-6 py-6">
      <GlassCard className="relative overflow-hidden p-8 lg:p-10" hover={false}>
        <div className="pointer-events-none absolute right-[-6rem] top-[-8rem] h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl dark:bg-indigo-500/10" />
        <Badge variant="indigo">Documentation</Badge>
        <motion.h1
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl dark:text-white"
        >
          User and developer docs
        </motion.h1>
        <motion.p
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.32, delay: 0.06, ease: 'easeOut' }}
          className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300"
        >
          The upgraded presentation stays aligned with the same workflow and architecture already available in the product.
        </motion.p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => scrollToDocSection('user-docs')}>User docs</Button>
          <Button type="button" onClick={() => scrollToDocSection('developer-docs')} variant="secondary">Developer docs</Button>
          <Button type="button" onClick={() => scrollToDocSection('example-usage')} variant="secondary">Example</Button>
        </div>
      </GlassCard>

      <motion.div
        id="user-docs"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="space-y-4"
      >
        <div>
          <Badge>User section</Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {USER_DOCS.map((section, index) => (
            <DocCard key={section.title} section={section} index={index} />
          ))}
        </div>
      </motion.div>

      <ArchitectureDiagram />

      <motion.div
        id="example-usage"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <GlassCard className="p-6" hover={false}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Badge variant="indigo">Example</Badge>
              <h2 className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">Copy and paste this into Text mode</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Use this sample lease clause to test summary quality, risk scoring, actionable advice, and contextual chat.
              </p>
            </div>
            <Button onClick={copyTestDocument}>{copied ? 'Copied' : 'Copy test text'}</Button>
          </div>
          <pre className="mt-5 max-h-[360px] overflow-auto rounded-2xl border border-slate-200/80 bg-slate-950 p-5 text-sm leading-6 text-slate-100 shadow-inner dark:border-white/10 dark:bg-black/40">
            <code>{TEST_DOCUMENT}</code>
          </pre>
        </GlassCard>
      </motion.div>

      <motion.div
        id="developer-docs"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="space-y-4"
      >
        <div>
          <Badge>Developer section</Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {DEVELOPER_DOCS.map((section, index) => (
            <DocCard key={section.title} section={section} index={index} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function HomePage({ mode = 'home', user }) {
  const [copied, setCopied] = useState(false);
  const primaryHref = user ? '#/analyze' : '#/login?redirect=%23%2Fanalyze&reason=auth';

  const scrollToDocSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const copyTestDocument = async () => {
    try {
      await navigator.clipboard.writeText(TEST_DOCUMENT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (mode === 'docs') {
    return <DocsPage copyTestDocument={copyTestDocument} copied={copied} scrollToDocSection={scrollToDocSection} />;
  }

  return (
    <section className="space-y-6 py-6">
      <HeroSection primaryHref={primaryHref} />
      <PipelineSection />
      <StorySection />
      <HeatmapShowcase />
      <MetricsSection />
      <ComparisonSection />
      <ArchitectureDiagram />
    </section>
  );
}

export default HomePage;
