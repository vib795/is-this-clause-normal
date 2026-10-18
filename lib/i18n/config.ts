/**
 * Supported UI locales for the app.
 *
 *   • 5 non-Indic: English (default), Spanish, French, German, Portuguese
 *     — LLMs (Claude/GPT/Gemini) can output analysis JSON directly in these
 *       via a prompt-side instruction; no Sarvam needed.
 *
 *   • 11 Indic (via Sarvam): Hindi, Bengali, Tamil, Telugu, Kannada,
 *     Malayalam, Marathi, Gujarati, Punjabi, Odia, Assamese
 *     — Analysis runs in English on the LLM, then translated back via Sarvam.
 *
 *   • Urdu is excluded for Phase 1 because it requires RTL layout.
 *
 * Locale codes are IETF-ish short forms (`en`, `hi`). For Sarvam calls we
 * map to the regional codes Sarvam uses (`hi-IN` etc) via SARVAM_LOCALE_MAP.
 */

export const SUPPORTED_LOCALES = [
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'hi',
  'bn',
  'ta',
  'te',
  'kn',
  'ml',
  'mr',
  'gu',
  'pa',
  'or',
  'as',
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_COOKIE = 'clause_locale';

/** Native + English label for the picker. Native first — that's what a Hindi
 *  speaker scans for in a long dropdown. */
export const LOCALE_LABELS: Record<Locale, { native: string; english: string }> = {
  en: { native: 'English',     english: 'English' },
  es: { native: 'Español',     english: 'Spanish' },
  fr: { native: 'Français',    english: 'French' },
  de: { native: 'Deutsch',     english: 'German' },
  pt: { native: 'Português',   english: 'Portuguese' },
  hi: { native: 'हिन्दी',         english: 'Hindi' },
  bn: { native: 'বাংলা',         english: 'Bengali' },
  ta: { native: 'தமிழ்',         english: 'Tamil' },
  te: { native: 'తెలుగు',         english: 'Telugu' },
  kn: { native: 'ಕನ್ನಡ',           english: 'Kannada' },
  ml: { native: 'മലയാളം',       english: 'Malayalam' },
  mr: { native: 'मराठी',         english: 'Marathi' },
  gu: { native: 'ગુજરાતી',       english: 'Gujarati' },
  pa: { native: 'ਪੰਜਾਬੀ',         english: 'Punjabi' },
  or: { native: 'ଓଡ଼ିଆ',          english: 'Odia' },
  as: { native: 'অসমীয়া',       english: 'Assamese' },
};

/**
 * Map IETF short locale → Sarvam regional code. Only the 11 Indic locales
 * have entries; non-Indic locales return undefined and use the LLM-direct
 * output path instead.
 */
export const SARVAM_LOCALE_MAP: Partial<Record<Locale, string>> = {
  hi: 'hi-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  or: 'od-IN', // Sarvam uses "od" not "or"
  as: 'as-IN',
};

export function isIndicLocale(locale: Locale): boolean {
  return locale in SARVAM_LOCALE_MAP;
}

export function isSupportedLocale(s: string): s is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(s);
}

/**
 * Pick the best supported locale from a comma-separated Accept-Language
 * header. Falls back to DEFAULT_LOCALE if no match. Honors q-weights.
 */
export function bestLocaleFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const parts = header
    .split(',')
    .map(s => s.trim())
    .map(s => {
      const [tag, ...params] = s.split(';');
      const qParam = params.find(p => p.trim().startsWith('q='));
      const q = qParam ? parseFloat(qParam.split('=')[1]) || 0 : 1;
      return { tag: tag.trim().toLowerCase(), q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of parts) {
    // Try exact short form first (e.g. "en-US" → "en"), then full
    const primary = tag.split('-')[0];
    if (isSupportedLocale(primary)) return primary;
    if (isSupportedLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}
