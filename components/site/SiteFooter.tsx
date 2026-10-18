'use client';

import { useTranslations } from 'next-intl';

export function SiteFooter() {
  const t = useTranslations('footer');
  return (
    <footer className="mt-24 border-t border-stroke">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] bg-accent text-on-accent"
              >
                <span className="text-[10px] font-black leading-none">!</span>
              </span>
              <span className="text-[13px] font-semibold tracking-tight text-text">
                Is This Clause Normal?
              </span>
            </div>
            <p className="mt-3 max-w-xs text-[13px] leading-6 text-text-3">
              {t('tagline')}
            </p>
          </div>

          <FooterCol
            title={t('columnProduct')}
            links={[
              { label: t('linkHowItWorks'), href: '#how' },
              { label: t('linkCoverage'), href: '#coverage' },
              { label: t('linkCounterAgreement'), href: '#counter' },
              { label: t('linkProviders'), href: '#providers' },
            ]}
          />
          <FooterCol
            title={t('columnUseIt')}
            links={[
              { label: t('linkStartScan'), href: '#scan' },
              { label: t('linkHistory'), href: '#scan' },
            ]}
          />
          <FooterCol
            title={t('columnLegal')}
            links={[
              { label: t('linkNotLegalAdvice'), href: '#disclaimer' },
              { label: t('linkHowTextUsed'), href: '#disclaimer' },
            ]}
          />
        </div>

        <div
          id="disclaimer"
          className="mt-12 border-t border-stroke pt-8 text-[12px] leading-6 text-text-3"
        >
          <p>
            <strong className="font-semibold text-text-2">{t('disclaimerTitle')}</strong>{' '}
            {t('disclaimerBody')}
          </p>
          <p className="mt-4 text-text-4">
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="text-eyebrow text-text-3">{title}</h4>
      <ul className="mt-4 space-y-2.5">
        {links.map(l => (
          <li key={l.label}>
            <a
              href={l.href}
              className="text-[13px] text-text-2 transition-colors duration-200 hover:text-text"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
