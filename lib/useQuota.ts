'use client';

import { useCallback, useEffect, useState } from 'react';
import type { QuotaState } from '@/lib/quota';

interface UseQuotaResult {
  quota: QuotaState | null;
  refetch: () => Promise<void>;
}

/**
 * Reads /api/quota and exposes a refetch() for the page to call after a
 * successful scan, an exhausted-quota error, or sign-in/out (Slice B).
 * Returns null while loading so the header chip doesn't flash a placeholder.
 */
export function useQuota(): UseQuotaResult {
  const [quota, setQuota] = useState<QuotaState | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/quota', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as QuotaState;
      setQuota(data);
    } catch {
      // Soft-fail — quota chip just stays in its last-known state.
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { quota, refetch };
}
