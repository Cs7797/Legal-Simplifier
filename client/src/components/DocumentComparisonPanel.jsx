import React, { useMemo, useState } from 'react';
import { compareDocuments, extractDocumentText } from '../services/api';
import Badge from './ui/Badge';
import Button from './ui/Button';
import GlassCard from './ui/GlassCard';

const GROUPS = [
  { key: 'MODIFIED', title: 'Modified' },
  { key: 'ADDED', title: 'Added' },
  { key: 'REMOVED', title: 'Removed' },
];

function ComparisonInput({ title, file, setFile, textValue, setTextValue, inputMode, setInputMode }) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Upload a file or paste text.</p>
        </div>
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm transition ${inputMode === 'file' ? 'bg-indigo-500 text-white' : 'text-slate-500 dark:text-slate-400'}`}
            onClick={() => setInputMode('file')}
          >
            File
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm transition ${inputMode === 'text' ? 'bg-indigo-500 text-white' : 'text-slate-500 dark:text-slate-400'}`}
            onClick={() => setInputMode('text')}
          >
            Text
          </button>
        </div>
      </div>

      {inputMode === 'file' ? (
        <div>
          <input
            type="file"
            accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          />
          {file && (
            <div className="mt-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
              {file.name}
            </div>
          )}
        </div>
      ) : (
        <textarea
          value={textValue}
          onChange={(event) => setTextValue(event.target.value)}
          className="min-h-[180px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          placeholder="Paste legal text here..."
        />
      )}
    </div>
  );
}

async function prepareCompareInput({ inputMode, file, textValue, fallbackName }) {
  if (inputMode === 'file') {
    const extracted = await extractDocumentText(file);
    return {
      filename: extracted.filename || fallbackName,
      text: extracted.text,
    };
  }

  return {
    filename: fallbackName,
    text: textValue.trim(),
  };
}

function getImpactVariant(impact) {
  if (impact === 'HIGH') return 'danger';
  if (impact === 'MEDIUM') return 'warning';
  return 'success';
}

function normalizeClauseKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildClauseLookup(doc) {
  return new Map((doc?.clauses || []).map((clause) => [normalizeClauseKey(clause.title), clause]));
}

function ComparisonRow({ change, clauseA, clauseB, view }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{change.type}</Badge>
        <Badge variant={getImpactVariant(change.impact)}>{change.impact} impact</Badge>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">{change.clause}</p>

      {view === 'side-by-side' && change.type === 'MODIFIED' ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Doc A</p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{clauseA?.simplified || 'No matching clause summary found.'}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Doc B</p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{clauseB?.simplified || 'No matching clause summary found.'}</p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {change.type === 'MODIFIED'
            ? 'Meaning or obligations changed between the two documents.'
            : change.type === 'ADDED'
              ? 'This clause appears in Document B but not in Document A.'
              : 'This clause appears in Document A but not in Document B.'}
        </p>
      )}
    </div>
  );
}

function DocumentComparisonPanel() {
  const [inputModeA, setInputModeA] = useState('file');
  const [inputModeB, setInputModeB] = useState('file');
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [comparison, setComparison] = useState(null);
  const [view, setView] = useState('changes-only');

  const canCompare = useMemo(() => {
    const leftReady = inputModeA === 'file' ? Boolean(fileA) : Boolean(textA.trim());
    const rightReady = inputModeB === 'file' ? Boolean(fileB) : Boolean(textB.trim());
    return leftReady && rightReady;
  }, [fileA, fileB, inputModeA, inputModeB, textA, textB]);

  const groupedChanges = useMemo(() => {
    const changes = comparison?.changes || [];
    return GROUPS.reduce((accumulator, group) => {
      accumulator[group.key] = changes.filter((change) => change.type === group.key);
      return accumulator;
    }, {});
  }, [comparison]);

  const summaryCounts = useMemo(() => {
    const changes = comparison?.changes || [];
    return {
      total: changes.length,
      modified: changes.filter((change) => change.type === 'MODIFIED').length,
      added: changes.filter((change) => change.type === 'ADDED').length,
      removed: changes.filter((change) => change.type === 'REMOVED').length,
    };
  }, [comparison]);

  const clauseLookupA = useMemo(() => buildClauseLookup(comparison?.docA), [comparison]);
  const clauseLookupB = useMemo(() => buildClauseLookup(comparison?.docB), [comparison]);

  const handleCompare = async () => {
    if (!canCompare) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const [docA, docB] = await Promise.all([
        prepareCompareInput({ inputMode: inputModeA, file: fileA, textValue: textA, fallbackName: 'Document A' }),
        prepareCompareInput({ inputMode: inputModeB, file: fileB, textValue: textB, fallbackName: 'Document B' }),
      ]);

      const response = await compareDocuments({ docA, docB });
      setComparison(response);
    } catch (compareError) {
      setError(compareError.message || 'Unable to compare documents.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Compare</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Clause comparison workspace</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Compare two agreements, spot material clause changes, and switch between changes-only and side-by-side review.
            </p>
          </div>
          <Button onClick={handleCompare} disabled={!canCompare || processing}>
            {processing ? 'Comparing...' : 'Compare documents'}
          </Button>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <ComparisonInput
            title="Doc A"
            file={fileA}
            setFile={setFileA}
            textValue={textA}
            setTextValue={setTextA}
            inputMode={inputModeA}
            setInputMode={setInputModeA}
          />
          <ComparisonInput
            title="Doc B"
            file={fileB}
            setFile={setFileB}
            textValue={textB}
            setTextValue={setTextB}
            inputMode={inputModeB}
            setInputMode={setInputModeB}
          />
        </div>

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </GlassCard>

      {comparison && (
        <>
          <GlassCard className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Comparison summary</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Change counts across both documents</h2>
              </div>
              <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setView('changes-only')}
                  className={`rounded-xl px-3 py-2 text-sm transition ${view === 'changes-only' ? 'bg-indigo-500 text-white' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  Changes Only
                </button>
                <button
                  type="button"
                  onClick={() => setView('side-by-side')}
                  className={`rounded-xl px-3 py-2 text-sm transition ${view === 'side-by-side' ? 'bg-indigo-500 text-white' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  Side-by-Side
                </button>
              </div>
            </div>

            {comparison.comparisonStatus === 'partial' && (
              <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                This comparison is partial. Some changes may be missing.
              </p>
            )}
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Total changes', value: summaryCounts.total, variant: 'default' },
                { label: 'Modified', value: summaryCounts.modified, variant: 'warning' },
                { label: 'Added', value: summaryCounts.added, variant: 'success' },
                { label: 'Removed', value: summaryCounts.removed, variant: 'danger' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                  <Badge variant={item.variant}>{item.label}</Badge>
                  <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Changes list</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Grouped comparison results</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[comparison.docA, comparison.docB].map((doc, index) => (
                  <div key={doc.filename || index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">{doc.filename}</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {doc.riskScore ? `Risk score ${doc.riskScore.score}/10 (${doc.riskScore.label})` : 'Risk assessment unavailable'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {GROUPS.map((group) => {
                const items = groupedChanges[group.key] || [];

                return (
                  <div key={group.key} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{group.title}</h3>
                      <Badge>{items.length}</Badge>
                    </div>

                    {items.length > 0 ? (
                      items.map((change, index) => {
                        const clauseKey = normalizeClauseKey(change.clause);
                        return (
                          <ComparisonRow
                            key={`${group.key}-${change.clause}-${index}`}
                            change={change}
                            clauseA={clauseLookupA.get(clauseKey)}
                            clauseB={clauseLookupB.get(clauseKey)}
                            view={view}
                          />
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        No {group.title.toLowerCase()} clauses found.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}

export default DocumentComparisonPanel;
