'use client';

import { useTranslations } from 'next-intl';
import { Reveal } from '@/components/ui/Reveal';
import { HeroContractDemo } from './HeroContractDemo';

interface HeroProps {
  onPrimaryClick: () => void;
}

export function Hero({ onPrimaryClick }: HeroProps) {
  const t = useTranslations('hero');
  return (
    <section id="top" className="relative isolate overflow-hidden hero-mesh">
      <div className="grain absolute inset-0" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-center px-5 pb-20 pt-24 sm:px-8 sm:pt-32 lg:pb-28 lg:pt-36">
        <Reveal className="w-full text-center" variant="single">
          <Eyebrow label={t('eyebrow')} />

          <h1 className="text-display mx-auto mt-6 max-w-4xl text-balance text-[44px] text-text sm:text-[64px] lg:text-[84px]">
            {t('title')}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-[17px] text-text-2 sm:text-[20px] text-body-rest">
            {t('subtitle')}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={onPrimaryClick}
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-[15px] font-semibold text-on-accent shadow-[var(--shadow-accent)] transition-[transform,background-color] duration-200 hover:bg-accent-hover active:scale-[0.98]"
            >
              {t('ctaPrimary')}
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              >
                ↓
              </span>
            </button>
            <a
              href="#how"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-3 text-[15px] font-medium text-text-2 transition-colors duration-200 hover:text-text"
            >
              {t('ctaSecondary')}
            </a>
          </div>
        </Reveal>

        <Reveal className="mt-16 w-full sm:mt-20" variant="single" threshold={0.05}>
          <HeroContractDemo />
        </Reveal>

        <Reveal className="mt-20 flex flex-col items-center gap-3 sm:mt-24" variant="single">
          <p className="text-eyebrow text-text-3">{t('scrollLabel')}</p>
          <span aria-hidden className="block h-10 w-px bg-stroke-strong" />
        </Reveal>
      </div>
    </section>
  );
}

function Eyebrow({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-accent-stroke bg-accent-soft px-3 py-1 text-[12px] font-semibold tracking-wide text-accent">
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
        style={{ animation: 'pulse 1.6s var(--ease-in-out-spring) infinite' }}
      />
      {label}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
