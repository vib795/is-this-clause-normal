import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { DEFAULT_LOCALE, isSupportedLocale, type Locale } from './config';

/**
 * Server-side config consumed by next-intl. The locale comes from the
 * `x-locale` header set in proxy.ts (cookie-driven), with a defensive
 * fallback to English.
 */
export default getRequestConfig(async () => {
  const hdrs = await headers();
  const headerLocale = hdrs.get('x-locale');
  const locale: Locale = headerLocale && isSupportedLocale(headerLocale)
    ? headerLocale
    : DEFAULT_LOCALE;

  // Lazy-load only the active locale bundle to keep first-load JS small.
  // Falls back to English if a translation file is missing or malformed —
  // we'd rather show English than a broken page.
  let messages: Record<string, unknown>;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`../../messages/${DEFAULT_LOCALE}.json`)).default;
  }

  return { locale, messages };
});
