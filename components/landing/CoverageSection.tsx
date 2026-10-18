'use client';

import { useTranslations } from 'next-intl';
import { Reveal } from '@/components/ui/Reveal';
import { CATEGORY_LABELS } from '@/lib/types';

export function CoverageSection() {
  const t = useTranslations('coverage');
  const tCat = useTranslations('coverage.categories');
  return (
    <section id="how" className="relative isolate py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="max-w-3xl">
          <p className="text-eyebrow text-accent">{t('eyebrow')}</p>
          <h2 className="text-display text-display-tight mt-4 text-balance text-[36px] text-text sm:text-[56px] lg:text-[64px]">
            {t('title')}
          </h2>
          <p className="mt-5 max-w-2xl text-[17px] text-text-2 sm:text-[19px] text-body-rest">
            {t('subtitle')}
          </p>
        </Reveal>

        <Reveal
          className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-stroke bg-stroke sm:mt-20 sm:grid-cols-2 lg:grid-cols-3"
          variant="stagger"
        >
          {(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map(key => (
            <CategoryCard
              key={key}
              title={tCat(`${key}.title`)}
              note={tCat(`${key}.note`)}
              symbol={categorySymbol(key)}
            />
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function CategoryCard({
  title,
  note,
  symbol,
}: {
  title: string;
  note: string;
  symbol: string;
}) {
  return (
    <div className="group relative isolate bg-bg p-6 transition-colors duration-300 hover:bg-elevated sm:p-8">
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform duration-300 group-hover:scale-105"
        >
          <span className="text-[15px] font-semibold">{symbol}</span>
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-tight text-text">{title}</h3>
          <p className="mt-1.5 text-[13.5px] leading-6 text-text-3">{note}</p>
        </div>
      </div>
    </div>
  );
}

function categorySymbol(key: keyof typeof CATEGORY_LABELS): string {
  switch (key) {
    case 'payment': return '$';
    case 'ip': return '◆';
    case 'restrictions': return '⊘';
    case 'scope': return '▤';
    case 'termination': return '⇥';
    case 'liability': return '⚖';
    case 'dispute': return '§';
    case 'data_privacy': return '◉';
    case 'exclusivity': return '◐';
  }
}
