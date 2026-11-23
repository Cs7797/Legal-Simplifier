import React, { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import GlassCard from './ui/GlassCard';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function base64ToUint8Array(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function PdfRiskViewer({ fileData, fileUrl }) {
  const [pages, setPages] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let loadingTask;
    let renderTask;

    async function loadPdf() {
      if (!fileData && !fileUrl) {
        setPages([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        loadingTask = pdfjsLib.getDocument(
          fileData ? { data: base64ToUint8Array(fileData) } : { url: fileUrl }
        );
        const pdfDocument = await loadingTask.promise;
        const renderedPages = [];

        for (let pageIndex = 1; pageIndex <= Math.min(pdfDocument.numPages, 10) && !cancelled; pageIndex += 1) {
          const page = await pdfDocument.getPage(pageIndex);
          const viewport = page.getViewport({ scale: 1.25 });
          const canvas = window.document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          renderTask = page.render({ canvas, viewport });
          await renderTask.promise;

          renderedPages.push({
            number: pageIndex,
            image: canvas.toDataURL('image/png'),
            width: viewport.width,
          });
        }

        if (!cancelled) {
          setPages(renderedPages);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to render the original PDF preview.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
      renderTask?.cancel();
      void loadingTask?.destroy().catch(() => {});
    };
  }, [fileData, fileUrl]);

  if (!fileData && !fileUrl) {
    return null;
  }

  return (
    <GlassCard className="p-5">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Source preview</p>
        <h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Original PDF</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Preview shows up to the first 10 pages.
        </p>
      </div>

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Rendering PDF pages...</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="space-y-5">
        {pages.map((page) => (
          <div key={page.number} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Page {page.number}
            </div>
            <div className="overflow-x-auto p-4">
              <img src={page.image} alt={`PDF page ${page.number}`} className="block max-w-full rounded-xl shadow-sm" style={{ width: page.width }} />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export default PdfRiskViewer;
