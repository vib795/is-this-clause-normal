import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase auth session on every request and propagates the
 * new cookies into both the incoming request (for downstream handlers in
 * this hop) and the outgoing response (for the browser).
 *
 * IMPORTANT: don't read user data from this client and pass it downstream —
 * always re-create the server client in the route handler. This helper is
 * about cookie hygiene, nothing more.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // If Supabase isn't configured (no env vars), bypass auth entirely. This
  // keeps the app functional during Slice A → B handoff before the user
  // pastes their keys.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Touching getUser() forces a session refresh if the access token is
  // expired — that's the whole point of this middleware.
  await supabase.auth.getUser();

  return supabaseResponse;
}
