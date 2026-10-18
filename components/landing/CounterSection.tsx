'use client';

import { useTranslations } from 'next-intl';
import { Reveal } from '@/components/ui/Reveal';

export function CounterSection() {
  const t = useTranslations('counter');
  return (
    <section
      id="counter"
      className="relative isolate overflow-hidden py-28 sm:py-36"
      style={{
        background:
          'radial-gradient(80% 60% at 50% 100%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 60%), var(--bg-elevated)',
      }}
    >
      <div className="grain absolute inset-0" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16">
        <Reveal>
          <p className="text-eyebrow text-accent">{t('eyebrow')}</p>
          <h2 className="text-display text-display-tight mt-4 text-balance text-[36px] text-text sm:text-[56px] lg:text-[64px]">
            {t('titlePrefix')}
            <em className="not-italic text-accent">{t('titleEmphasis')}</em>
            {t('titleSuffix')}
          </h2>
          <p className="mt-5 max-w-xl text-[17px] text-text-2 sm:text-[19px] text-body-rest">
            {t('subtitle')}
          </p>

          <ul className="mt-8 space-y-3 text-[14.5px] text-text-2">
            <Bullet>{t('bullet1')}</Bullet>
            <Bullet>{t('bullet2')}</Bullet>
            <Bullet>{t('bullet3')}</Bullet>
            <Bullet>{t('bullet4')}</Bullet>
          </ul>
        </Reveal>

        <Reveal threshold={0.05}>
          <DiffVisual />
        </Reveal>
      </div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-[7px] inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent"
      />
      <span>{children}</span>
    </li>
  );
}

function DiffVisual() {
  const t = useTranslations('counter');
  return (
    <div
      className="relative overflow-hidden rounded-[22px] border border-stroke bg-bg"
      style={{ boxShadow: 'var(--shadow-lg)' }}
    >
      <div className="flex items-center justify-between border-b border-stroke px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-semibold text-text-3">{t('diffTitle')}</span>
          <span className="rounded-full bg-glass px-2 py-[1px] text-[10px] font-semibold text-text-3">
            {t('diffVersion')}
          </span>
        </div>
        <span className="text-[11px] font-mono text-text-3">{t('diffFilename')}</span>
      </div>

      <div className="px-5 py-6 font-mono text-[12px] leading-[1.85] text-text-2">
        <DiffLine type="context">3. INTELLECTUAL PROPERTY</DiffLine>
        <DiffLine type="removed">
          All prior work, including pre-existing materials, is assigned to Client.
        </DiffLine>
        <DiffLine type="added">
          Pre-existing materials remain Contractor&apos;s property; Client receives a
          perpetual license for project use only.
        </DiffLine>
        <DiffLine type="context">&nbsp;</DiffLine>
        <DiffLine type="context">4. NON-COMPETE</DiffLine>
        <DiffLine type="removed">
          Worldwide, 24-month exclusivity with no compensation.
        </DiffLine>
        <DiffLine type="added">
          No exclusivity. Non-solicit limited to active accounts, 12 months.
        </DiffLine>
      </div>
    </div>
  );
}

function DiffLine({
  type,
  children,
}: {
  type: 'context' | 'added' | 'removed';
  children: React.ReactNode;
}) {
  if (type === 'context') {
    return (
      <div className="-mx-5 border-l-2 border-transparent px-5 text-text-3">{children}</div>
    );
  }
  const isAdd = type === 'added';
  return (
    <div
      className="-mx-5 px-5 py-[3px]"
      style={{
        backgroundColor: isAdd ? 'var(--severity-green-soft)' : 'var(--severity-red-soft)',
        color: isAdd ? 'var(--severity-green)' : 'var(--severity-red)',
        borderLeft: `2px solid ${isAdd ? 'var(--severity-green)' : 'var(--severity-red)'}`,
      }}
    >
      <span className="mr-2 select-none opacity-70">{isAdd ? '+' : '−'}</span>
      {children}
    </div>
  );
}
