import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/callback?code=...
 *
 * Final hop for both magic-link sign-in (Supabase emails this URL to the
 * user) and OAuth (Supabase redirects here after the provider callback).
 * Exchanges the auth code for a session and bounces back to the origin.
 *
 * `next` param controls where to land after sign-in — defaults to `/`.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocal = process.env.NODE_ENV === 'development';
      if (isLocal) {
        return NextResponse.redirect(`${url.origin}${next}`);
      }
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${url.origin}${next}`);
    }
  }

  // Auth failed or no code present — back to home with an error flag the
  // client can surface in a toast.
  return NextResponse.redirect(`${url.origin}/?auth_error=1`);
}
