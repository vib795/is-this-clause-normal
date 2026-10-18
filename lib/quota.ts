import type { NextRequest } from 'next/server';

/**
 * Free-scan quotas. Anon users get 1 free scan via an HttpOnly cookie counter.
 * Signed-in users (Slice B) will get 2 more on top, tracked in Supabase.
 * Past that, BYOK is required (Slice C).
 *
 * The cookie counter is intentionally bypassable (clearing cookies resets it) —
 * Slice D adds an Upstash Redis IP throttle to prevent trivial abuse.
 */
export const ANON_FREE_SCANS = 1;
export const SIGNED_FREE_SCANS = 2;

export const ANON_COOKIE = 'clause_anon_quota';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface QuotaState {
  /** Free scans remaining for this user. */
  remaining: number;
  /** Total free scans allowed (anon = 1, signed = 2). */
  total: number;
  /** How many free scans have been consumed. */
  used: number;
  /** True when remaining === 0 AND user has no BYOK keys. */
  exhausted: boolean;
  /** True when the request comes from a signed-in user. */
  signedIn: boolean;
  /** True when the user has at least one BYOK key on file. */
  byok: boolean;
  /** Which providers the user has BYOK keys for — drives per-provider UI. */
  byok_providers: ('anthropic' | 'openai' | 'google')[];
}

/**
 * Read the anon cookie count from an incoming request. Falls back to 0 when
 * the cookie is missing or malformed. Never throws.
 */
export function readAnonCount(request: NextRequest): number {
  const raw = request.cookies.get(ANON_COOKIE)?.value;
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Build the `Set-Cookie` header value for incrementing the anon counter.
 * Caller is responsible for attaching this to the response.
 */
export function buildAnonCookieHeader(nextCount: number): string {
  return [
    `${ANON_COOKIE}=${nextCount}`,
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
    'HttpOnly',
    // Secure only in production — local http dev would drop the cookie otherwise.
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}

/**
 * Compute the quota state for an anonymous request. Slice B adds a signed-in
 * variant below; both return the same shape so the UI is agnostic.
 */
export function computeAnonQuotaState(usedCount: number): QuotaState {
  const used = Math.min(usedCount, ANON_FREE_SCANS);
  const remaining = Math.max(0, ANON_FREE_SCANS - usedCount);
  return {
    remaining,
    total: ANON_FREE_SCANS,
    used,
    exhausted: remaining === 0,
    signedIn: false,
    byok: false,
    byok_providers: [],
  };
}

export interface SignedInQuotaInput {
  /** Free (non-BYOK) scans already logged for this user. */
  usedCount: number;
  /**
   * Providers the user has BYOK keys for. The user is "unlocked" as soon
   * as they have at least one; per-scan we still check the specific
   * provider in the analyze route.
   */
  byokProviders?: QuotaState['byok_providers'];
  /** @deprecated kept for back-compat — prefer byokProviders. */
  hasByokKey?: boolean;
}

/**
 * Compute the quota state for a signed-in request. When the user has any
 * BYOK key on file they can scan past the free ceiling on their own dime —
 * `exhausted` stays false in that case.
 */
export function computeSignedInQuotaState({
  usedCount,
  byokProviders,
  hasByokKey,
}: SignedInQuotaInput): QuotaState {
  const byokList = byokProviders ?? (hasByokKey ? ['anthropic'] : []);
  const anyByok = byokList.length > 0;
  const used = Math.min(usedCount, SIGNED_FREE_SCANS);
  const remaining = Math.max(0, SIGNED_FREE_SCANS - usedCount);
  return {
    remaining,
    total: SIGNED_FREE_SCANS,
    used,
    exhausted: remaining === 0 && !anyByok,
    signedIn: true,
    byok: anyByok,
    byok_providers: byokList,
  };
}

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
