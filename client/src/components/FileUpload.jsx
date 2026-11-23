import React, { useRef, useState } from 'react';
import Badge from './ui/Badge';
import Button from './ui/Button';
import GlassCard from './ui/GlassCard';

function FileUpload({ onFileSelect, selectedFile, textValue, onTextChange, inputMode, onInputModeChange }) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelection = (file) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Please select a PDF, DOCX, TXT, or image file (JPG/PNG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    onFileSelect(file);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, index)).toFixed(2))} ${sizes[index]}`;
  };

  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Input</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
            {inputMode === 'text' ? 'Paste legal text' : 'Upload a document'}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {inputMode === 'text' ? 'Paste a clause, contract, or full agreement.' : 'PDF, DOCX, TXT, JPG, or PNG up to 10MB.'}
          </p>
        </div>
        <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              inputMode === 'file'
                ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}
            onClick={() => onInputModeChange('file')}
          >
            File
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              inputMode === 'text'
                ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}
            onClick={() => onInputModeChange('text')}
          >
            Text
          </button>
        </div>
      </div>

      {inputMode === 'text' ? (
        <textarea
          className="min-h-[240px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-500"
          value={textValue}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Paste your legal text here..."
        />
      ) : (
        <div
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 transition ${
            selectedFile
              ? 'border-indigo-200 bg-indigo-50/60 dark:border-indigo-500/20 dark:bg-indigo-500/10'
              : isDragOver
                ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10'
                : 'border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-900/80'
          }`}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragOver(false);
            const files = event.dataTransfer.files;
            if (files.length > 0) {
              handleFileSelection(files[0]);
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragOver(false);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
            onChange={(event) => {
              const files = event.target.files;
              if (files.length > 0) {
                handleFileSelection(files[0]);
              }
            }}
          />

          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-sm font-semibold text-white">
                  DOC
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{selectedFile.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  onFileSelect(null);
                }}
              >
                Remove file
              </Button>
            </div>
          ) : (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-300">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-slate-950 dark:text-white">Drop a legal document here</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Or click to browse your files.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {['PDF or DOCX', 'TXT or image', 'Max 10MB', 'Fast AI extraction'].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

export default FileUpload;
