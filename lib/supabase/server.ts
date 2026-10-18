import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

/**
 * Supabase client for route handlers and server components.
 *
 * Two auth transports:
 *   • Web: session cookies (default). Refreshed cookies are written back
 *     when the calling context allows mutation; in strict server-component
 *     contexts the `set` calls throw and the middleware handles refresh.
 *   • Native apps (iOS): `Authorization: Bearer <access_token>`. The token
 *     is forwarded to PostgREST so RLS applies, and `auth.getUser()` is
 *     bound to it so existing routes work unchanged. Stateless — no cookie
 *     refresh; the app refreshes its own session via supabase-swift.
 */
export async function createClient() {
  const headerStore = await headers();
  const authHeader = headerStore.get('authorization') ?? '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (bearer) {
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: { getAll: () => [], setAll: () => {} },
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      }
    );
    // Routes call `auth.getUser()` with no args, which only consults the
    // cookie session. Bind it to the bearer so the token is validated
    // against the auth server on every call.
    const getUser = client.auth.getUser.bind(client.auth);
    client.auth.getUser = (jwt?: string) => getUser(jwt ?? bearer);
    return client;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a server component — middleware handles refresh.
          }
        },
      },
    }
  );
}
