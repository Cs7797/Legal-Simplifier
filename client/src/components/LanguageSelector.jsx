import React, { useState } from 'react';
import GlassCard from './ui/GlassCard';

// 74+ Languages supported by the translation service
const OPTIONS = [
  // Major Global Languages
  { value: 'en', title: 'English', region: 'Global' },
  { value: 'zh', title: 'Chinese (Simplified)', region: 'Asia' },
  { value: 'zh-tw', title: 'Chinese (Traditional)', region: 'Asia' },
  { value: 'es', title: 'Spanish', region: 'Global' },
  { value: 'fr', title: 'French', region: 'Global' },
  { value: 'ar', title: 'Arabic', region: 'Middle East' },
  { value: 'pt', title: 'Portuguese', region: 'Global' },
  { value: 'ru', title: 'Russian', region: 'Europe' },
  { value: 'ja', title: 'Japanese', region: 'Asia' },
  { value: 'de', title: 'German', region: 'Europe' },
  
  // Indian Languages
  { value: 'hi', title: 'Hindi', region: 'South Asia' },
  { value: 'bn', title: 'Bengali', region: 'South Asia' },
  { value: 'te', title: 'Telugu', region: 'South Asia' },
  { value: 'mr', title: 'Marathi', region: 'South Asia' },
  { value: 'ta', title: 'Tamil', region: 'South Asia' },
  { value: 'gu', title: 'Gujarati', region: 'South Asia' },
  { value: 'ur', title: 'Urdu', region: 'South Asia' },
  { value: 'kn', title: 'Kannada', region: 'South Asia' },
  { value: 'ml', title: 'Malayalam', region: 'South Asia' },
  { value: 'pa', title: 'Punjabi', region: 'South Asia' },
  
  // European Languages
  { value: 'it', title: 'Italian', region: 'Europe' },
  { value: 'nl', title: 'Dutch', region: 'Europe' },
  { value: 'pl', title: 'Polish', region: 'Europe' },
  { value: 'sv', title: 'Swedish', region: 'Europe' },
  { value: 'no', title: 'Norwegian', region: 'Europe' },
  { value: 'da', title: 'Danish', region: 'Europe' },
  { value: 'fi', title: 'Finnish', region: 'Europe' },
  { value: 'el', title: 'Greek', region: 'Europe' },
  { value: 'cs', title: 'Czech', region: 'Europe' },
  { value: 'hu', title: 'Hungarian', region: 'Europe' },
  { value: 'uk', title: 'Ukrainian', region: 'Europe' },
  { value: 'bg', title: 'Bulgarian', region: 'Europe' },
  { value: 'ro', title: 'Romanian', region: 'Europe' },
  { value: 'hr', title: 'Croatian', region: 'Europe' },
  { value: 'sr', title: 'Serbian', region: 'Europe' },
  { value: 'sk', title: 'Slovak', region: 'Europe' },
  { value: 'sl', title: 'Slovenian', region: 'Europe' },
  { value: 'et', title: 'Estonian', region: 'Europe' },
  { value: 'lv', title: 'Latvian', region: 'Europe' },
  { value: 'lt', title: 'Lithuanian', region: 'Europe' },
  
  // Asian Languages
  { value: 'ko', title: 'Korean', region: 'Asia' },
  { value: 'th', title: 'Thai', region: 'Asia' },
  { value: 'vi', title: 'Vietnamese', region: 'Asia' },
  { value: 'id', title: 'Indonesian', region: 'Asia' },
  { value: 'ms', title: 'Malay', region: 'Asia' },
  { value: 'tl', title: 'Filipino', region: 'Asia' },
  { value: 'my', title: 'Myanmar', region: 'Asia' },
  { value: 'km', title: 'Khmer', region: 'Asia' },
  { value: 'lo', title: 'Lao', region: 'Asia' },
  { value: 'si', title: 'Sinhala', region: 'South Asia' },
  { value: 'ne', title: 'Nepali', region: 'South Asia' },
  
  // Middle Eastern & Central Asian
  { value: 'fa', title: 'Persian', region: 'Middle East' },
  { value: 'tr', title: 'Turkish', region: 'Middle East' },
  { value: 'he', title: 'Hebrew', region: 'Middle East' },
  { value: 'az', title: 'Azerbaijani', region: 'Central Asia' },
  { value: 'ka', title: 'Georgian', region: 'Central Asia' },
  { value: 'hy', title: 'Armenian', region: 'Central Asia' },
  { value: 'kk', title: 'Kazakh', region: 'Central Asia' },
  { value: 'ky', title: 'Kyrgyz', region: 'Central Asia' },
  { value: 'uz', title: 'Uzbek', region: 'Central Asia' },
  
  // African Languages
  { value: 'sw', title: 'Swahili', region: 'Africa' },
  { value: 'am', title: 'Amharic', region: 'Africa' },
  { value: 'yo', title: 'Yoruba', region: 'Africa' },
  { value: 'ig', title: 'Igbo', region: 'Africa' },
  { value: 'ha', title: 'Hausa', region: 'Africa' },
  { value: 'zu', title: 'Zulu', region: 'Africa' },
  { value: 'af', title: 'Afrikaans', region: 'Africa' },
  { value: 'xh', title: 'Xhosa', region: 'Africa' },
  { value: 'so', title: 'Somali', region: 'Africa' },
  
  // Latin American
  { value: 'pt-br', title: 'Portuguese (Brazil)', region: 'Americas' },
  { value: 'es-mx', title: 'Spanish (Mexico)', region: 'Americas' },
  { value: 'es-ar', title: 'Spanish (Argentina)', region: 'Americas' },
  { value: 'es-co', title: 'Spanish (Colombia)', region: 'Americas' },
  { value: 'es-pe', title: 'Spanish (Peru)', region: 'Americas' },
  { value: 'es-ve', title: 'Spanish (Venezuela)', region: 'Americas' },
  { value: 'es-cl', title: 'Spanish (Chile)', region: 'Americas' },
  { value: 'qu', title: 'Quechua', region: 'Americas' },
  { value: 'gn', title: 'Guarani', region: 'Americas' },
];

function LanguageSelector({ value, onChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRegion, setExpandedRegion] = useState('Global');

  // Group languages by region
  const groupedLanguages = OPTIONS.reduce((acc, lang) => {
    if (!acc[lang.region]) {
      acc[lang.region] = [];
    }
    acc[lang.region].push(lang);
    return acc;
  }, {});

  // Sort regions for consistent display
  const sortedRegions = Object.keys(groupedLanguages).sort();

  // Filter languages based on search
  const filteredLanguages = OPTIONS.filter(
    (lang) =>
      lang.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lang.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <GlassCard className="p-5">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Smart mode
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Output language</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">74+ languages supported</p>
      </div>

      {/* Search input */}
      <input
        type="text"
        placeholder="Search languages..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 transition hover:border-indigo-200 focus:border-indigo-400 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-indigo-600"
      />

      {/* Language list with scrollable container */}
      <div className="max-h-[400px] space-y-2 overflow-y-auto pr-2">
        {searchTerm ? (
          // Search results view
          <div className="space-y-1">
            {filteredLanguages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No languages found
              </div>
            ) : (
              filteredLanguages.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setSearchTerm('');
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    value === option.value
                      ? 'border-indigo-200 bg-indigo-50 font-medium text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900'
                  }`}
                >
                  {option.title}
                  <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                    ({option.value})
                  </span>
                </button>
              ))
            )}
          </div>
        ) : (
          // Grouped by region view
          sortedRegions.map((region) => (
            <div key={region}>
              <button
                type="button"
                onClick={() =>
                  setExpandedRegion(expandedRegion === region ? null : region)
                }
                className="w-full rounded-lg bg-slate-100 px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {region} ({groupedLanguages[region].length})
                <span className="float-right">{expandedRegion === region ? '▼' : '▶'}</span>
              </button>

              {expandedRegion === region && (
                <div className="space-y-1 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
                  {groupedLanguages[region].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onChange(option.value)}
                      className={`w-full rounded-lg border px-2 py-2 text-left text-sm transition ${
                        value === option.value
                          ? 'border-indigo-200 bg-indigo-50 font-medium text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900'
                      }`}
                    >
                      {option.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
}

export default LanguageSelector;
