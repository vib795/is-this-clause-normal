import { NextRequest, NextResponse } from 'next/server';
import {
  computeAnonQuotaState,
  computeSignedInQuotaState,
  isSupabaseConfigured,
  readAnonCount,
} from '@/lib/quota';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/quota → current quota state for the caller.
 *
 *   • Signed-in: counts non-BYOK scan rows in Supabase.
 *   • Signed-out (or Supabase not configured): counts the anon cookie.
 *
 * Slice C will pass `hasByokKey` from a SELECT on byok_keys; for now any
 * signed-in user is treated as not-yet-BYOK.
 */
export async function GET(request: NextRequest) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const [{ count }, { data: byokRows }] = await Promise.all([
          supabase
            .from('scans')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('byok', false),
          supabase
            .from('byok_keys')
            .select('provider')
            .eq('user_id', user.id),
        ]);

        const byokProviders = (byokRows ?? [])
          .map(r => r.provider as 'anthropic' | 'openai' | 'google')
          .filter(p => p === 'anthropic' || p === 'openai' || p === 'google');

        return NextResponse.json(
          computeSignedInQuotaState({
            usedCount: count ?? 0,
            byokProviders,
          }),
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }
    } catch (err) {
      // Supabase reachable issues shouldn't break the anon path.
      console.error('Quota: supabase lookup failed, falling back to anon', err);
    }
  }

  const used = readAnonCount(request);
  return NextResponse.json(computeAnonQuotaState(used), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
