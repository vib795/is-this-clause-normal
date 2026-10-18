'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE, LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n/config';

/**
 * Globe-icon dropdown with all supported locales in their NATIVE names
 * (English in parens). Writing the cookie + router.refresh() re-hydrates
 * the page with the new locale's messages — no full reload required.
 */
export function LanguagePicker() {
  const router = useRouter();
  const active = useLocale() as Locale;
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

  const pick = (loc: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${loc}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setOpen(false);
    router.refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(s => !s)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('languageSwitcherAria')}
        title={t('language')}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-medium text-text-2 transition-colors duration-200 hover:text-text"
      >
        <GlobeGlyph />
        <span className="hidden sm:inline">{LOCALE_LABELS[active].native}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 max-h-80 w-56 overflow-y-auto rounded-2xl border border-stroke bg-elevated p-1.5"
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          {SUPPORTED_LOCALES.map(loc => {
            const isActive = loc === active;
            return (
              <button
                key={loc}
                role="menuitem"
                onClick={() => pick(loc)}
                className={[
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors duration-150',
                  isActive
                    ? 'bg-glass text-text'
                    : 'text-text-2 hover:bg-glass hover:text-text',
                ].join(' ')}
              >
                <span>
                  <span className="font-medium">{LOCALE_LABELS[loc].native}</span>
                  {LOCALE_LABELS[loc].native !== LOCALE_LABELS[loc].english && (
                    <span className="ml-1.5 text-[11.5px] text-text-4">
                      {LOCALE_LABELS[loc].english}
                    </span>
                  )}
                </span>
                {isActive && <CheckGlyph />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GlobeGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
