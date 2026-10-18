'use client';

import { useTranslations } from 'next-intl';
import { CATEGORY_LABELS } from '@/lib/types';
import { SARVAM_LANGUAGES } from '@/lib/sarvam-languages';

const STEP_KEYS = Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[];

export type AnalyzingPhase = 'analyzing' | 'translating' | 'finalizing';
export type AnalyzingSection = 'findings' | 'missing_clauses' | null;

interface AnalyzingStateProps {
  /** Categories the model has touched (any occurrence). */
  completedCategories: Set<string>;
  /** The category the model is actively writing right now (most-recent emit). */
  currentCategory: string | null;
  /** Backend lifecycle phase. */
  phase: AnalyzingPhase;
  /** Subsection within the analyzing phase. */
  section: AnalyzingSection;
  /** Live findings / missing counts from the stream. */
  findingsCount: number;
  missingCount: number;
  /** Indic language code if set — drives the translation copy. */
  languageCode?: string;
}

/**
 * Honest, multi-signal progress display:
 *   • Top: indeterminate barber-pole bar — animates whenever bytes are flowing.
 *   • Header: phase-appropriate heading + subhead.
 *   • Counter chip: live finding / missing counts (ticks up).
 *   • List: each category in one of three states —
 *       pending (dim grey ring), active (spinning ring), done (green check).
 */
export function AnalyzingState({
  completedCategories,
  currentCategory,
  phase,
  section,
  findingsCount,
  missingCount,
  languageCode,
}: AnalyzingStateProps) {
  const t = useTranslations('analyzing');
  const tCat = useTranslations('coverage.categories');
  const past = phase !== 'analyzing';
  const inMissingOrLater = past || section === 'missing_clauses';

  const stepState = (key: string): 'done' | 'active' | 'pending' => {
    if (inMissingOrLater) return completedCategories.has(key) || past ? 'done' : 'done';
    if (currentCategory === key) return 'active';
    if (completedCategories.has(key) && currentCategory !== key) return 'done';
    return 'pending';
  };

  const heading =
    phase === 'analyzing'
      ? findingsCount > 0
        ? section === 'missing_clauses'
          ? t('headingMissing')
          : t('headingAnalyzing')
        : t('headingReading')
      : phase === 'translating'
      ? t('headingTranslating', {
          language: SARVAM_LANGUAGES[languageCode || ''] || 'your language',
        })
      : t('headingFinalizing');

  const subhead =
    phase === 'analyzing'
      ? section === 'missing_clauses'
        ? t('subMissing')
        : t('subAnalyzing')
      : phase === 'translating'
      ? t('subTranslating')
      : t('subFinalizing');

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        className="relative overflow-hidden rounded-3xl border border-stroke bg-elevated p-8 sm:p-10"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Top indeterminate bar — visible motion while the stream is alive. */}
        <IndeterminateBar active={phase === 'analyzing' || phase === 'translating'} />

        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-64 w-[140%] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
          style={{
            background:
              'radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 70%)',
          }}
        />

        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="relative inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-accent text-on-accent"
            style={{
              boxShadow: '0 8px 24px -8px var(--accent)',
              animation: 'breathe 2.6s var(--ease-in-out-spring) infinite',
            }}
          >
            <span className="h-2 w-2 rounded-full bg-on-accent" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[20px] font-semibold tracking-tight text-text sm:text-[22px]">
                {heading}
              </h2>
              {(findingsCount > 0 || missingCount > 0) && (
                <span className="rounded-full border border-stroke bg-glass px-2.5 py-[2px] text-[11.5px] font-medium text-text-2 tabular-nums">
                  {t('counts', {
                    findings: findingsCount,
                    missing: missingCount,
                    both: findingsCount > 0 && missingCount > 0 ? 'true' : 'false',
                  })}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[13.5px] text-text-3">{subhead}</p>
          </div>
        </div>

        <ol className="mt-8 space-y-2">
          {STEP_KEYS.map(key => {
            const state = stepState(key);
            return (
              <li
                key={key}
                className={[
                  'flex items-center gap-3 rounded-xl border px-3 py-2 transition-[background-color,border-color] duration-500',
                  state === 'active'
                    ? 'border-stroke-strong bg-glass'
                    : 'border-stroke bg-transparent',
                ].join(' ')}
              >
                <StateDot state={state} />
                <span
                  className={[
                    'text-[14px] transition-colors duration-300',
                    state === 'done'
                      ? 'text-text-2'
                      : state === 'active'
                      ? 'text-text'
                      : 'text-text-4',
                  ].join(' ')}
                >
                  {tCat(`${key}.title`)}
                </span>
              </li>
            );
          })}
        </ol>

        <p className="mt-6 text-[12px] text-text-3">
          {phase === 'analyzing' ? t('footerLive') : t('footerAlmost')}
        </p>

        <style jsx>{`
          @keyframes breathe {
            0%, 100% { transform: scale(1); box-shadow: 0 8px 24px -8px var(--accent); }
            50%      { transform: scale(1.04); box-shadow: 0 14px 36px -10px var(--accent); }
          }
        `}</style>
      </div>
    </div>
  );
}

function IndeterminateBar({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden"
      style={{ background: 'var(--bg-glass)' }}
    >
      <span
        className="absolute inset-y-0 block"
        style={{
          width: '38%',
          background:
            'linear-gradient(90deg, transparent, var(--accent), transparent)',
          animation: active ? 'slide 1.4s var(--ease-in-out-spring) infinite' : 'none',
          opacity: active ? 1 : 0,
        }}
      />
      <style jsx>{`
        @keyframes slide {
          0%   { transform: translateX(-110%); }
          100% { transform: translateX(360%); }
        }
      `}</style>
    </div>
  );
}

function StateDot({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'done') {
    return (
      <span
        aria-hidden
        className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-on-accent transition-[background-color] duration-300"
        style={{ background: 'var(--severity-green)' }}
      >
        <span className="text-[10px] font-bold leading-none">✓</span>
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span
        aria-hidden
        className="relative inline-flex h-5 w-5 flex-shrink-0 items-center justify-center"
      >
        <span
          className="absolute inset-0 rounded-full border-2 border-accent border-t-transparent"
          style={{ animation: 'spin 0.9s linear infinite' }}
        />
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="inline-block h-5 w-5 flex-shrink-0 rounded-full border-2 border-stroke transition-colors duration-300"
    />
  );
}
