import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ContextChatPanel from '../components/ContextChatPanel';
import DocumentComparisonPanel from '../components/DocumentComparisonPanel';
import FileUpload from '../components/FileUpload';
import LanguageSelector from '../components/LanguageSelector';
import ProcessingStatus from '../components/ProcessingStatus';
import ResultsDisplay from '../components/ResultsDisplay';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import { processDocument, processPastedText, fetchReportPdfBlob, downloadReportPdf } from '../services/api';

function DocumentAnalyzerPage({
  initialRecord,
  onAnalysisSaved,
  user,
  history = [],
  onOpenDocument,
  onDeleteDocument,
}) {
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [inputMode, setInputMode] = useState('file');
  const [outputLanguage, setOutputLanguage] = useState('en');
  const [mode, setMode] = useState('analyze');
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState(initialRecord || null);
  const [error, setError] = useState('');
  const [downloadingType, setDownloadingType] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [showRiskFreeDialog, setShowRiskFreeDialog] = useState(false);
  const [reportPreview, setReportPreview] = useState(null);

  useEffect(() => {
    setResults(initialRecord || null);
    if (initialRecord) {
      setOutputLanguage(initialRecord.outputLanguageMode || 'en');
      setFile(null);
      setPastedText(initialRecord.sourceText || '');
      setInputMode(initialRecord.sourceType === 'text' ? 'text' : 'file');
      setError('');
      setProcessing(false);
      setCurrentStep('');
    }
  }, [initialRecord]);

  useEffect(() => {
    return () => {
      if (reportPreview?.url) {
        window.URL.revokeObjectURL(reportPreview.url);
      }
    };
  }, [reportPreview]);

  const activeDocument = processing ? null : results;
  const readyToAnalyze = (inputMode === 'file' && file) || (inputMode === 'text' && pastedText.trim());
  const recentHistory = useMemo(() => history.slice(0, 8), [history]);

  const handleProcess = async () => {
    if (inputMode === 'file' && !file) return;
    if (inputMode === 'text' && !pastedText.trim()) return;

    setProcessing(true);
    setError('');
    setResults(null);

    try {
      const userId = user?.id || null;
      const result =
        inputMode === 'text'
          ? await processPastedText(pastedText.trim(), outputLanguage, setCurrentStep, userId)
          : await processDocument(file, outputLanguage, setCurrentStep, userId);

      setResults(result);
      onAnalysisSaved(result);
    } catch (err) {
      setError(err.message || 'An error occurred while processing the document.');
    } finally {
      setProcessing(false);
      setCurrentStep('');
    }
  };

  const handleReset = () => {
    setFile(null);
    setPastedText('');
    setInputMode('file');
    setResults(null);
    setError('');
    setProcessing(false);
    setCurrentStep('');
  };

  const handleDownload = async (type) => {
    setDownloadError('');
    setDownloadingType(type);
    try {
      await downloadReportPdf(type, results);
    } catch (error) {
      setDownloadError(error.message);
    } finally {
      setDownloadingType('');
    }
  };

  const handleRiskFreeVersion = async () => {
    setShowRiskFreeDialog(false);
    if (!results) return;

    setDownloadError('');
    setDownloadingType('riskfree');

    try {
      const blob = await fetchReportPdfBlob('riskfree', results);
      const url = window.URL.createObjectURL(blob);
      setReportPreview({
        type: 'riskfree',
        title: `${results.filename || 'Document'} - Draft for Review`,
        url,
        filename: `${results.filename || 'legal-simplifier-report'}-draft.pdf`,
      });
    } catch (err) {
      setDownloadError(err.message || 'Unable to generate the report preview.');
    } finally {
      setDownloadingType('');
    }
  };

  const closeReportPreview = () => {
    if (reportPreview?.url) {
      window.URL.revokeObjectURL(reportPreview.url);
    }
    setReportPreview(null);
  };

  const handleDownloadPreviewedReport = () => {
    if (!reportPreview?.url) return;
    const link = document.createElement('a');
    link.href = reportPreview.url;
    link.download = reportPreview.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user) {
    return (
      <section className="py-6">
        <GlassCard className="mx-auto max-w-3xl p-8 text-center">
          <Badge variant="indigo">Secure workspace</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Sign in to access the analyzer</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Uploads, saved history, AI chat, and document reviews live inside your authenticated workspace.
          </p>
          <div className="mt-6">
            <Button as="a" href="#/login?redirect=%23%2Fanalyze&reason=auth">
              Go to login
            </Button>
          </div>
        </GlassCard>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <GlassCard className="relative overflow-hidden p-6 lg:p-7" hover={false}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_26%),radial-gradient(circle_at_85%_20%,rgba(99,102,241,0.14),transparent_22%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Badge variant="indigo">Live analysis workspace</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
              Analyze faster with a more cinematic legal review flow
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Keep the existing upload, compare, history, and assistant features, but present them like a high-end AI system with visible processing and explainable outputs.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
            {[
              { label: 'Inputs', value: 'File + Text' },
              { label: 'Outputs', value: 'Risk + Summary' },
              { label: 'Assistant', value: 'Context-aware' },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-white/60 px-4 py-4 backdrop-blur-xl dark:bg-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-2">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            {
              value: 'analyze',
              title: 'Analyze',
              description: 'Upload document and review risk, clauses, and advice.',
            },
            {
              value: 'compare',
              title: 'Compare',
              description: 'Compare two documents and inspect clause changes.',
            },
          ].map((tab) => (
            <motion.button
              key={tab.value}
              type="button"
              onClick={() => setMode(tab.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className={`rounded-[20px] px-4 py-4 text-left transition ${
                mode === tab.value
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-transparent text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              <div className="text-sm font-semibold">{tab.title}</div>
              <div className={`mt-1 text-sm ${mode === tab.value ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {tab.description}
              </div>
            </motion.button>
          ))}
        </div>
      </GlassCard>

      <AnimatePresence mode="wait">
        {mode === 'analyze' ? (
        <motion.div
          key="analyze"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: 'easeInOut' }}
          className="mx-auto w-full max-w-[1100px] space-y-5"
        >
          <div className="space-y-5">
            <FileUpload
              onFileSelect={setFile}
              selectedFile={file}
              textValue={pastedText}
              onTextChange={setPastedText}
              inputMode={inputMode}
              onInputModeChange={setInputMode}
            />
            <LanguageSelector value={outputLanguage} onChange={setOutputLanguage} />

            <GlassCard className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Run analysis</h2>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <Button onClick={handleProcess} disabled={!readyToAnalyze || processing}>
                  {processing ? 'Analyzing...' : inputMode === 'text' ? 'Analyze text' : 'Analyze document'}
                </Button>
                <Button variant="secondary" onClick={handleReset}>
                  New analysis
                </Button>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Recent analyses</h2>
                </div>
                <Badge>{history.length}</Badge>
              </div>
              <div className="space-y-3">
                {recentHistory.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Your workspace history will appear here after the first analysis.
                  </div>
                ) : (
                  recentHistory.map((record) => (
                    <div key={record.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                      <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{record.filename}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{record.preview || 'Saved analysis'}</p>
                      <div className="mt-3 flex gap-2">
                        <Button variant="secondary" className="flex-1" onClick={() => onOpenDocument(record.id)}>
                          Open
                        </Button>
                        <Button variant="ghost" className="px-3" onClick={() => onDeleteDocument(record.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>

          <div className="min-w-0">
            {processing && <ProcessingStatus currentStep={currentStep} />}

            {!processing && error && (
              <GlassCard className="p-6">
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Something went wrong</h2>
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
                <div className="mt-4">
                  <Button onClick={handleReset}>Start over</Button>
                </div>
              </GlassCard>
            )}

            {!processing && !error && results && (
              <ResultsDisplay results={results} language={outputLanguage} onReset={handleReset} />
            )}

            {!processing && !error && !results && (
              <GlassCard className="p-8">
                <h2 className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">Start with a file or pasted text</h2>
                <div className="mt-6 grid gap-3 md:grid-cols-1">
                  {[
                    'Structured summary',
                    'Risk-filtered clause',
                    'Actionable advice',
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      {item}
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <ContextChatPanel
                activeDocument={activeDocument}
                threadId={activeDocument ? `document-${activeDocument.docId || activeDocument.id}` : 'general-assistant'}
                starters={
                  activeDocument
                    ? ['Explain clause 5', 'What is the top risk here?', 'Summarize this for a non-lawyer']
                    : ['What does indemnity mean?', 'How do termination clauses work?', 'What should I check before signing?']
                }
              />

              {results && (
                <GlassCard className="mt-4 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Analysis actions</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => handleDownload('summary')} disabled={Boolean(downloadingType)}>
                      {downloadingType === 'summary' ? 'Generating…' : 'Summary PDF'}
                    </Button>
                    <Button variant="secondary" onClick={() => handleDownload('risk')} disabled={Boolean(downloadingType) || !results.riskScore}>
                      {downloadingType === 'risk' ? 'Generating…' : 'Risk report PDF'}
                    </Button>
                  </div>
                  <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Revised draft</p>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      Generate suggested revisions for review.
                    </p>
                    <Button className="mt-4 w-full" onClick={() => setShowRiskFreeDialog(true)} disabled={Boolean(downloadingType)}>
                      {downloadingType === 'riskfree' ? 'Generating…' : 'Generate draft PDF'}
                    </Button>
                    <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Review the draft in the preview before downloading.
                    </p>
                  </div>
                  {downloadError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{downloadError}</p>}
                </GlassCard>
              )}

              {showRiskFreeDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                  <div className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">Generate draft PDF</h2>
                    <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      The draft can change the agreement’s meaning. Review the wording with a qualified lawyer before using it.
                    </p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <Button variant="secondary" onClick={() => setShowRiskFreeDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleRiskFreeVersion} disabled={Boolean(downloadingType)}>
                        Generate draft PDF
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="compare"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: 'easeInOut' }}
        >
          <DocumentComparisonPanel />
        </motion.div>
      )}
      </AnimatePresence>

      {reportPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">PDF preview</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{reportPreview.title}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={closeReportPreview}>Close</Button>
                <Button onClick={handleDownloadPreviewedReport}>Download PDF</Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-slate-100 p-3 dark:bg-slate-900">
              <iframe
                title={reportPreview.title}
                src={reportPreview.url}
                className="h-full w-full rounded-2xl border border-slate-200 bg-white dark:border-slate-800"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default DocumentAnalyzerPage;
