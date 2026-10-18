'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { User } from '@supabase/supabase-js';
import type { QuotaState } from '@/lib/quota';
import { LanguagePicker } from '@/components/i18n/LanguagePicker';

interface SiteHeaderProps {
  onCtaClick?: () => void;
  onHomeClick?: () => void;
  historyCount?: number;
  onHistoryClick?: () => void;
  /** Slice A: anonymous quota chip. null while loading — chip stays hidden. */
  quota?: QuotaState | null;
  /** Slice B: signed-in user (null if signed out). */
  user?: User | null;
  /** Slice B: open the SignInModal (owned by the page). */
  onSignInClick?: () => void;
  /** Slice B: sign out — POSTs /api/auth/signout, then refreshes auth state. */
  onSignOut?: () => void;
}

/**
 * Apple-style hairline nav. Becomes solid (with blur) once scrolled past
 * a few pixels — a thin, almost-imperceptible commit to chrome rather
 * than a chunky bar.
 */
export function SiteHeader({
  onCtaClick,
  onHomeClick,
  historyCount,
  onHistoryClick,
  quota,
  user,
  onSignInClick,
  onSignOut,
}: SiteHeaderProps) {
  const t = useTranslations('header');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={[
        'sticky top-0 z-40 w-full',
        'transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled
          ? 'bg-bg/75 supports-[backdrop-filter]:bg-bg/55 backdrop-blur-xl hairline-bottom'
          : 'bg-transparent',
      ].join(' ')}
    >
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-5 sm:h-14 sm:px-8">
        <button
          type="button"
          onClick={onHomeClick}
          className="group flex items-center gap-2 text-text transition-opacity duration-200 hover:opacity-80"
          aria-label={t('brandAria')}
        >
          <Mark />
          <span className="text-[13px] font-semibold tracking-tight">
            {t('brandName')}
          </span>
        </button>

        <nav className="flex items-center gap-1 sm:gap-2">
          <a
            href="#how"
            className="hidden rounded-full px-3 py-1.5 text-[13px] text-text-2 transition-colors duration-200 hover:text-text sm:inline-block"
          >
            {t('howItWorks')}
          </a>
          {quota ? <QuotaChip quota={quota} /> : null}
          {historyCount && historyCount > 0 ? (
            <button
              onClick={onHistoryClick}
              className="rounded-full px-3 py-1.5 text-[13px] text-text-2 transition-colors duration-200 hover:text-text"
            >
              {t('history')}
              <span className="ml-1 text-text-3">{historyCount}</span>
            </button>
          ) : null}
          <LanguagePicker />
          {user ? (
            <AccountMenu user={user} onSignOut={onSignOut} />
          ) : onSignInClick ? (
            <button
              onClick={onSignInClick}
              className="rounded-full border border-stroke bg-glass px-3 py-1.5 text-[13px] font-medium text-text-2 transition-colors duration-200 hover:text-text"
            >
              {t('signIn')}
            </button>
          ) : null}
          <button
            onClick={onCtaClick}
            className="rounded-full bg-text px-3.5 py-1.5 text-[13px] font-semibold text-bg shadow-sm transition-[transform,background-color] duration-200 hover:bg-text/90 active:scale-[0.97]"
          >
            {t('tryIt')}
          </button>
        </nav>
      </div>
    </header>
  );
}

function AccountMenu({ user, onSignOut }: { user: User; onSignOut?: () => void }) {
  const t = useTranslations('header');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const email = user.email || 'Signed in';
  const initial = (email[0] || '?').toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(s => !s)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-stroke bg-glass px-1.5 py-1 text-[13px] font-medium text-text-2 transition-colors duration-200 hover:text-text"
      >
        <span
          aria-hidden
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-on-accent"
        >
          {initial}
        </span>
        <span className="hidden max-w-[140px] truncate pr-1.5 sm:inline">{email}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-stroke bg-elevated p-1.5"
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          <div className="px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-4">
              {t('signedInAs')}
            </p>
            <p className="mt-0.5 truncate text-[13px] text-text">{email}</p>
          </div>
          <div aria-hidden className="my-1 h-px bg-stroke" />
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] text-text-2 transition-colors duration-150 hover:bg-glass hover:text-text"
          >
            {t('settings')}
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSignOut?.();
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] text-text-2 transition-colors duration-150 hover:bg-glass hover:text-text"
          >
            {t('signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

function QuotaChip({ quota }: { quota: QuotaState }) {
  const t = useTranslations('header');
  // BYOK overrides the free-tier counter entirely — user is unlocked.
  if (quota.byok) {
    return (
      <span
        title={t('chipBYOKTooltip', { providers: quota.byok_providers.join(', ') })}
        className="hidden items-center gap-1.5 rounded-full border border-sev-green-stroke bg-sev-green-soft px-2.5 py-1 text-[11.5px] font-medium text-sev-green sm:inline-flex"
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sev-green" />
        {t('chipBYOK')}
      </span>
    );
  }
  if (quota.exhausted) {
    return (
      <span
        title={t('chipLimitTooltip')}
        className="hidden items-center gap-1.5 rounded-full border border-sev-yellow-stroke bg-sev-yellow-soft px-2.5 py-1 text-[11.5px] font-medium text-sev-yellow sm:inline-flex"
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sev-yellow" />
        {t('chipLimitReached')}
      </span>
    );
  }
  return (
    <span
      title={t('chipFreeTooltip', {
        remaining: quota.remaining,
        total: quota.total,
        signedIn: quota.signedIn ? 'true' : 'false',
      })}
      className="hidden items-center gap-1.5 rounded-full border border-stroke bg-glass px-2.5 py-1 text-[11.5px] font-medium text-text-2 sm:inline-flex"
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sev-green" />
      {t('chipFreeScans', { count: quota.remaining })}
    </span>
  );
}

function Mark() {
  return (
    <span
      aria-hidden
      className="relative inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent text-on-accent shadow-[0_4px_12px_-4px_var(--accent)]"
    >
      <span className="text-[12px] font-black leading-none">!</span>
    </span>
  );
}
