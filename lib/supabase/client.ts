'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for use in client components. Reads from the cookies
 * managed by the middleware so auth state stays in sync across tabs.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
