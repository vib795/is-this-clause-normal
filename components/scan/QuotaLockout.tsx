'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { QuotaState } from '@/lib/quota';

interface QuotaLockoutProps {
  quota: QuotaState;
  onSignInClick?: () => void;
}

/**
 * Shown in place of ContractInput when the user has exhausted their free
 * scan quota. Two copy paths: anonymous (sign-in CTA) vs signed-in (BYOK CTA).
 */
export function QuotaLockout({ quota, onSignInClick }: QuotaLockoutProps) {
  const t = useTranslations('lockout');
  const isAnon = !quota.signedIn;

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-stroke bg-elevated p-8 sm:p-10"
      style={{ boxShadow: 'var(--shadow-lg)' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-64 w-[140%] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 70%)',
        }}
      />

      <div className="flex flex-col items-center text-center">
        <span
          aria-hidden
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-stroke bg-glass text-text-2"
        >
          <LockIcon />
        </span>
        <p className="text-eyebrow mt-5 text-accent">
          {isAnon ? t('eyebrowAnon') : t('eyebrowSigned')}
        </p>
        <h2 className="mt-2 text-balance text-[26px] font-semibold tracking-tight text-text sm:text-[30px]">
          {isAnon ? t('titleAnon') : t('titleSigned')}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-text-2 text-body-rest">
          {isAnon ? t('bodyAnon') : t('bodySigned')}
        </p>

        <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          {isAnon ? (
            <>
              <button
                type="button"
                onClick={onSignInClick}
                className="rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-on-accent shadow-sm transition-[transform,opacity] duration-200 hover:opacity-90 active:scale-[0.97]"
              >
                {t('ctaSignIn')}
              </button>
              <button
                type="button"
                onClick={onSignInClick}
                className="rounded-full border border-stroke bg-glass px-5 py-2.5 text-[14px] font-medium text-text-2 transition-colors duration-200 hover:text-text"
                title={t('ctaBYOKTooltip')}
              >
                {t('ctaBYOK')}
              </button>
            </>
          ) : (
            <Link
              href="/settings"
              className="rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-on-accent shadow-sm transition-[transform,opacity] duration-200 hover:opacity-90 active:scale-[0.97]"
            >
              {t('ctaAddKey')}
            </Link>
          )}
        </div>

        <p className="mt-6 text-[12px] text-text-3">
          {isAnon
            ? t('usedSummaryAnon', { used: quota.used, total: quota.total })
            : t('usedSummarySigned', { used: quota.used, total: quota.total })}
        </p>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
