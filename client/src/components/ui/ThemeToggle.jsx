import React from 'react';

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  const nextThemeLabel = isDark ? 'Light mode' : 'Dark mode';

  return (
    <button
      type="button"
      onClick={onToggle}
      className="control-surface inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-sm font-medium hover:border-indigo-200 hover:text-indigo-600 dark:hover:border-indigo-400/30 dark:hover:text-white"
      aria-label={`Switch to ${nextThemeLabel.toLowerCase()}`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10">
        {isDark ? (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.5M12 18.5V21M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M3 12h2.5M18.5 12H21M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77M15.5 12a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" />
          </svg>
        )}
      </span>
      <span>{nextThemeLabel}</span>
    </button>
  );
}

export default ThemeToggle;
