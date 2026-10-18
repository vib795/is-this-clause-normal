import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  LOCALE_COOKIE,
  bestLocaleFromAcceptLanguage,
  isSupportedLocale,
} from '@/lib/i18n/config';

/**
 * Next.js 16 "proxy" (replaces "middleware"). Runs two side-effects:
 *
 *   1. Supabase session refresh — see lib/supabase/middleware.ts.
 *   2. Locale detection — reads the `clause_locale` cookie (preferred) or
 *      falls back to Accept-Language; persists detection so subsequent
 *      requests skip parsing. The chosen locale rides along on a custom
 *      `x-locale` header that next-intl reads on the server side.
 */
export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  // Decide locale: cookie wins; otherwise sniff Accept-Language; otherwise default.
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    cookieLocale && isSupportedLocale(cookieLocale)
      ? cookieLocale
      : bestLocaleFromAcceptLanguage(request.headers.get('accept-language'));

  // Forward to handlers (next-intl reads this header in i18n/request.ts).
  response.headers.set('x-locale', locale);

  // Persist auto-detected choice so we don't re-parse Accept-Language every
  // request. User-initiated changes happen in the picker (sets the same cookie).
  if (cookieLocale !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (build assets)
     * - _next/image (image optimization)
     * - favicon, robots, sitemap
     * - .png/.jpg/.svg/.ico/.webp files (static assets)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
  ],
};
