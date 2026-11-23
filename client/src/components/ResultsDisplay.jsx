import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { mapClausesForDisplay, RISK_STYLES } from '../utils/clausePresentation';
import Badge from './ui/Badge';
import GlassCard from './ui/GlassCard';

const PdfRiskViewer = lazy(() => import('./PdfRiskViewer'));

const RISK_FILTERS = ['ALL', 'HIGH', 'MEDIUM', 'SAFE'];

function extractSummaryPoints(content) {
  const lines = String(content || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const bulletLines = lines
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').trim());

  if (bulletLines.length > 0) {
    return bulletLines.slice(0, 6);
  }

  return String(content || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 5);
}

function getBadgeVariant(level) {
  if (level === 'HIGH') return 'danger';
  if (level === 'MEDIUM') return 'warning';
  return 'success';
}

function buildCriticalFlags(results, clauses) {
  const highRisk = clauses.filter((clause) => clause.riskLevel === 'HIGH').length;
  const score = Number(results?.riskScore?.score || 0);

  if (highRisk >= 3) return 'Multiple high-risk clauses';
  if (highRisk > 0) return 'High-risk language detected';
  if (score >= 7) return 'Elevated overall exposure';
  return 'No critical flags';
}

function AccordionSection({
  id,
  title,
  summary,
  badge,
  isOpen,
  onToggle,
  children,
}) {
  return (
    <GlassCard className="overflow-hidden" hover={false}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
            {badge ? <Badge variant="indigo">{badge}</Badge> : null}
          </div>
          {summary ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{summary}</p> : null}
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="shrink-0 text-slate-400"
        >
          ▶
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden border-t border-slate-200 dark:border-slate-800"
          >
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </GlassCard>
  );
}

function CompactStat({ label, value, tone = 'text-slate-950 dark:text-white' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function ResultsDisplay({ results, language }) {
  const [showTranslated, setShowTranslated] = useState(language !== 'en');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [expandedClause, setExpandedClause] = useState(null);
  const [openSection, setOpenSection] = useState('heatmap');
  const [showFullSourceText, setShowFullSourceText] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const clauses = useMemo(() => mapClausesForDisplay(results.clauses), [results.clauses]);

  useEffect(() => {
    setRiskFilter('ALL');
    setExpandedClause(null);
    setOpenSection('heatmap');
    setShowFullSourceText(false);
    setShowPdfPreview(false);
  }, [results]);

  const displayContent = showTranslated && results.translated ? results.translated : results.simplified;
  const displayedLanguageCode = results.language || (language === 'same' ? results.detectedLanguage?.code : 'en') || 'en';
  const summaryPoints = useMemo(() => extractSummaryPoints(displayContent), [displayContent]);

  const riskCounts = useMemo(
    () =>
      clauses.reduce(
        (accumulator, clause) => {
          accumulator[clause.riskLevel] = (accumulator[clause.riskLevel] || 0) + 1;
          return accumulator;
        },
        { HIGH: 0, MEDIUM: 0, SAFE: 0 }
      ),
    [clauses]
  );

  const filteredClauses = useMemo(
    () => (riskFilter === 'ALL' ? clauses : clauses.filter((clause) => clause.riskLevel === riskFilter)),
    [clauses, riskFilter]
  );

  const toggleSection = (id) => {
    setOpenSection((current) => (current === id ? null : id));
  };

  const sourceText = String(results.originalText || results.sourceText || '').trim();
  const sourcePreview = sourceText.slice(0, 750);
  const criticalFlags = buildCriticalFlags(results, clauses);

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-4">
      <GlassCard className="sticky top-20 z-20 px-5 py-4 backdrop-blur-2xl" hover={false}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="indigo">{results.riskScore ? 'Analysis ready' : 'Partial analysis'}</Badge>
                <Badge>{String(displayedLanguageCode).toUpperCase()}</Badge>
                {results.detectedLanguage?.code ? <Badge>Detected {String(results.detectedLanguage.code).toUpperCase()}</Badge> : null}
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{results.filename}</h1>
              {!results.riskScore && <p role="status" className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Risk assessment is unavailable for this document.
              </p>}
              {results.saveNotice && <p role="status" className="mt-1 text-sm text-amber-700 dark:text-amber-300">{results.saveNotice}</p>}
            </div>

            {results.translated ? (
              <button
                type="button"
                onClick={() => setShowTranslated((current) => !current)}
                className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                {showTranslated ? 'Show English summary' : 'Show translated summary'}
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CompactStat label="Overall risk score" value={results.riskScore ? `${results.riskScore.score}/10` : 'N/A'} />
            <CompactStat label="High risk count" value={results.riskScore ? riskCounts.HIGH : 'N/A'} tone="text-red-600 dark:text-red-400" />
            <CompactStat label="Medium risk count" value={results.riskScore ? riskCounts.MEDIUM : 'N/A'} tone="text-amber-600 dark:text-amber-400" />
            <CompactStat label="Critical flags" value={results.riskScore ? criticalFlags : 'N/A'} tone="text-slate-950 dark:text-white" />
          </div>
        </div>
      </GlassCard>

      <AccordionSection
        id="takeaways"
        title="Document Summary"
        summary={`${summaryPoints.length} concise summary points ready for review.`}
        badge={`${summaryPoints.length} points`}
        isOpen={openSection === 'takeaways'}
        onToggle={toggleSection}
      >
        <div className="space-y-4">
          {results.riskScore ? (
            <div className="space-y-3">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${
                    results.riskScore.label === 'High'
                      ? 'from-red-500 to-orange-400'
                      : results.riskScore.label === 'Moderate'
                        ? 'from-amber-500 to-yellow-400'
                        : 'from-emerald-500 to-lime-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, (results.riskScore.score / 10) * 100))}%` }}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                  High: {results.riskScore.breakdown?.high || 0}
                </div>
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  Medium: {results.riskScore.breakdown?.medium || 0}
                </div>
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  Safe: {results.riskScore.breakdown?.safe || 0}
                </div>
              </div>
            </div>
          ) : null}

          <ul className="space-y-2">
            {summaryPoints.map((point, index) => (
              <li key={`${point}-${index}`} className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </AccordionSection>

      <AccordionSection
        id="heatmap"
        title="Clause Heatmap"
        summary={results.riskScore ? `${clauses.length} assessed clauses.` : 'No clause risk assessment is available.'}
        badge={`${clauses.length} clauses`}
        isOpen={openSection === 'heatmap'}
        onToggle={toggleSection}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {RISK_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setRiskFilter(filter)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                riskFilter === filter
                  ? 'border-cyan-500 bg-cyan-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredClauses.map((clause, index) => {
            const actualIndex = clauses.findIndex((item) => item === clause);
            const riskStyle = RISK_STYLES[clause.riskLevel] || RISK_STYLES.SAFE;
            const isExpanded = expandedClause === actualIndex;

            return (
              <article
                key={`${clause.title}-${actualIndex}`}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-cyan-200 dark:border-slate-800 dark:bg-slate-950"
              >
                <button
                  type="button"
                  onClick={() => setExpandedClause((current) => (current === actualIndex ? null : actualIndex))}
                  className="flex w-full items-start justify-between gap-4 text-left"
                >
                  <div className="min-w-0 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getBadgeVariant(clause.riskLevel)}>{riskStyle.label}</Badge>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        Clause {actualIndex + 1}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{clause.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{clause.simplified}</p>
                  </div>
                  <span className="shrink-0 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {isExpanded ? 'Hide details' : 'Expand details'}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Full analysis</p>
                          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{clause.riskReason}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Supporting clause excerpt</p>
                          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{clause.originalExcerpt || 'No source excerpt available.'}</p>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </article>
            );
          })}

          {filteredClauses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No clauses match the selected filter.
            </div>
          ) : null}
        </div>
      </AccordionSection>

      <AccordionSection
        id="source"
        title="Source View"
        summary={results.fileType === 'pdf' ? 'Compact source metadata and optional PDF page preview.' : 'Compact source metadata and extracted text preview.'}
        badge={results.fileType ? String(results.fileType).toUpperCase() : null}
        isOpen={openSection === 'source'}
        onToggle={toggleSection}
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Filename</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{results.filename}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Source type</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{results.sourceType || results.fileType || 'Unknown'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Created</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{results.createdAt ? new Date(results.createdAt).toLocaleString('en-IN') : 'Unknown'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Document length</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{sourceText ? `${sourceText.length.toLocaleString()} chars` : 'Unavailable'}</p>
            </div>
          </div>

          {sourceText ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Extracted text preview</p>
                {sourceText.length > 750 ? (
                  <button
                    type="button"
                    onClick={() => setShowFullSourceText((current) => !current)}
                    className="text-xs font-semibold text-cyan-700 transition hover:text-cyan-800 dark:text-cyan-300"
                  >
                    {showFullSourceText ? 'Show less' : 'Show more'}
                  </button>
                ) : null}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                {showFullSourceText ? sourceText : `${sourcePreview}${sourceText.length > 750 ? '...' : ''}`}
              </p>
            </div>
          ) : null}

          {results.fileType === 'pdf' && (results.fileData || results.fileUrl) ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Rendered PDF preview</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Keep this collapsed unless you need to inspect the original pages.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPdfPreview((current) => !current)}
                  className="inline-flex min-h-[2.25rem] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  {showPdfPreview ? 'Hide PDF pages' : 'View PDF pages'}
                </button>
              </div>
              {showPdfPreview ? (
                <div className="mt-4">
                  <Suspense fallback={<p className="text-sm text-slate-500 dark:text-slate-400">Loading PDF preview...</p>}>
                    <PdfRiskViewer fileData={results.fileData} fileUrl={results.fileUrl} />
                  </Suspense>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </AccordionSection>

    </div>
  );
}

export default ResultsDisplay;
