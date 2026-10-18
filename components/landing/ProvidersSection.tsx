'use client';

import { useTranslations } from 'next-intl';
import { Reveal } from '@/components/ui/Reveal';

const PROVIDERS = [
  { name: 'Anthropic',     mono: 'A', tint: 'oklch(0.66 0.20 30)' },
  { name: 'OpenAI',        mono: 'O', tint: 'oklch(0.66 0.16 165)' },
  { name: 'Google',        mono: 'G', tint: 'oklch(0.72 0.18 235)' },
  { name: 'Ollama (local)', mono: 'L', tint: 'oklch(0.70 0.16 285)' },
];

export function ProvidersSection() {
  const t = useTranslations('providers');
  return (
    <section id="providers" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-eyebrow text-accent">{t('eyebrow')}</p>
          <h2 className="text-display text-display-tight mt-4 text-balance text-[36px] text-text sm:text-[56px] lg:text-[64px]">
            {t('title')}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] text-text-2 sm:text-[19px] text-body-rest">
            {t('subtitle')}
          </p>
        </Reveal>

        <Reveal
          className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-stroke bg-stroke sm:mt-20 sm:grid-cols-4"
          variant="stagger"
        >
          {PROVIDERS.map(p => (
            <ProviderTile key={p.name} {...p} />
          ))}
        </Reveal>

        <Reveal className="mt-10 text-center" variant="single">
          <p className="text-[13px] text-text-3">
            {t('note')}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function ProviderTile({ name, mono, tint }: { name: string; mono: string; tint: string }) {
  return (
    <div className="group relative isolate flex flex-col items-center gap-3 bg-bg px-6 py-10 transition-colors duration-300 hover:bg-elevated">
      <span
        aria-hidden
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-[22px] font-black transition-transform duration-300 group-hover:scale-105"
        style={{
          background: `color-mix(in srgb, ${tint} 14%, transparent)`,
          color: tint,
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tint} 28%, transparent)`,
        }}
      >
        {mono}
      </span>
      <span className="text-[14px] font-semibold text-text">{name}</span>
    </div>
  );
}
