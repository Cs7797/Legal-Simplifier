import { completeWithGroq } from '../groqClient.js';
import { stripCodeFences } from "../parsing/clauseParsing.js";

// Comprehensive language mapping (74+ languages)
const LANGUAGE_NAMES = {
  // Major Global Languages
  en: "English",
  zh: "Chinese (Simplified)",
  "zh-tw": "Chinese (Traditional)",
  es: "Spanish",
  fr: "French",
  ar: "Arabic",
  pt: "Portuguese",
  ru: "Russian",
  ja: "Japanese",
  de: "German",

  // Indian Languages
  hi: "Hindi",
  bn: "Bengali",
  te: "Telugu",
  mr: "Marathi",
  ta: "Tamil",
  gu: "Gujarati",
  ur: "Urdu",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",

  // European Languages
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  el: "Greek",
  cs: "Czech",
  hu: "Hungarian",
  uk: "Ukrainian",
  bg: "Bulgarian",
  ro: "Romanian",
  hr: "Croatian",
  sr: "Serbian",
  sk: "Slovak",
  sl: "Slovenian",
  et: "Estonian",
  lv: "Latvian",
  lt: "Lithuanian",

  // Asian Languages
  ko: "Korean",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  ms: "Malay",
  tl: "Filipino",
  my: "Myanmar",
  km: "Khmer",
  lo: "Lao",
  si: "Sinhala",
  ne: "Nepali",

  // Middle Eastern & Central Asian
  fa: "Persian",
  tr: "Turkish",
  he: "Hebrew",
  az: "Azerbaijani",
  ka: "Georgian",
  hy: "Armenian",
  kk: "Kazakh",
  ky: "Kyrgyz",
  uz: "Uzbek",

  // African Languages
  sw: "Swahili",
  am: "Amharic",
  yo: "Yoruba",
  ig: "Igbo",
  ha: "Hausa",
  zu: "Zulu",
  af: "Afrikaans",
  xh: "Xhosa",
  so: "Somali",

  // Latin American
  "pt-br": "Portuguese (Brazil)",
  "es-mx": "Spanish (Mexico)",
  "es-ar": "Spanish (Argentina)",
  "es-co": "Spanish (Colombia)",
  "es-pe": "Spanish (Peru)",
  "es-ve": "Spanish (Venezuela)",
  "es-cl": "Spanish (Chile)",
  qu: "Quechua",
  gn: "Guarani",
};

function heuristicLanguageDetection(text) {
  const sample = String(text || "").slice(0, 2000);

  if (/[\u0900-\u097F]/.test(sample))
    return { code: "hi", name: LANGUAGE_NAMES.hi };
  if (/[\u0980-\u09FF]/.test(sample))
    return { code: "bn", name: LANGUAGE_NAMES.bn };
  if (/[\u0A80-\u0AFF]/.test(sample))
    return { code: "gu", name: LANGUAGE_NAMES.gu };
  if (/[\u0A00-\u0A7F]/.test(sample))
    return { code: "pa", name: LANGUAGE_NAMES.pa };
  if (/[\u0B80-\u0BFF]/.test(sample))
    return { code: "ta", name: LANGUAGE_NAMES.ta };
  if (/[\u0C00-\u0C7F]/.test(sample))
    return { code: "te", name: LANGUAGE_NAMES.te };
  if (/[\u0C80-\u0CFF]/.test(sample))
    return { code: "kn", name: LANGUAGE_NAMES.kn };
  if (/[\u0D00-\u0D7F]/.test(sample))
    return { code: "ml", name: LANGUAGE_NAMES.ml };
  if (/[\u0600-\u06FF]/.test(sample))
    return { code: "ar", name: LANGUAGE_NAMES.ar };
  if (/[\u0400-\u04FF]/.test(sample))
    return { code: "ru", name: LANGUAGE_NAMES.ru };
  if (/[\u3040-\u30FF]/.test(sample))
    return { code: "ja", name: LANGUAGE_NAMES.ja };
  if (/[\u4E00-\u9FFF]/.test(sample))
    return { code: "zh", name: LANGUAGE_NAMES.zh };
  if (/[\uAC00-\uD7AF]/.test(sample))
    return { code: "ko", name: LANGUAGE_NAMES.ko };

  return { code: "en", name: LANGUAGE_NAMES.en };
}

export function resolveOutputLanguage(mode, detectedLanguage) {
  if (mode === "same") {
    return detectedLanguage;
  }
  
  // If mode is a specific language code, use it
  if (mode && mode !== "en" && LANGUAGE_NAMES[mode]) {
    return { code: mode, name: LANGUAGE_NAMES[mode] };
  }
  
  // Default to English
  return { code: "en", name: LANGUAGE_NAMES.en };
}

export async function detectDocumentLanguage(text, groqClient) {
  const fallback = heuristicLanguageDetection(text);

  if (!groqClient) {
    return fallback;
  }

  try {
    const completion = await completeWithGroq(groqClient, {
      messages: [
        {
          role: "system",
          content: `Detect the document language. Return valid JSON only.

Schema:
{
  "code": "ISO 639-1 code such as en, es, hi, ar, zh, fr",
  "name": "language name in English"
}`,
        },
        {
          role: "user",
          content: String(text || "").slice(0, 4000),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_completion_tokens: 600,
      top_p: 1,
      stream: false,
    });

    const parsed = JSON.parse(
      stripCodeFences(completion.choices[0]?.message?.content || "{}"),
    );
    const code =
      typeof parsed?.code === "string" && parsed.code.trim()
        ? parsed.code.trim().toLowerCase()
        : fallback.code;
    const name =
      LANGUAGE_NAMES[code] || fallback.name;

    return { code, name };
  } catch (error) {
    console.error("Language detection failed:");
    return fallback;
  }
}
