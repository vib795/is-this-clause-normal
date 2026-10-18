'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Finding, SEVERITY_CONFIG, NEGOTIABILITY_CONFIG } from '@/lib/types';

interface FindingCardProps {
  finding: Finding;
  index: number;
}

export default function FindingCard({ finding }: FindingCardProps) {
  const t = useTranslations('findingCard');
  const tSev = useTranslations('severity');
  const tCat = useTranslations('categories');
  const tNeg = useTranslations('negotiability');
  const [expanded, setExpanded] = useState(finding.severity === 'red');
  const [copied, setCopied] = useState(false);
  const config = SEVERITY_CONFIG[finding.severity];
  const negConfig = finding.negotiability ? NEGOTIABILITY_CONFIG[finding.negotiability] : null;

  const copyFix = () => {
    navigator.clipboard.writeText(finding.suggested_fix);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article
      className={[
        'overflow-hidden rounded-2xl border bg-elevated transition-colors duration-200',
        config.border,
      ].join(' ')}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="group flex w-full items-start gap-3 p-4 text-left transition-colors duration-200 hover:bg-glass sm:p-5"
        aria-expanded={expanded}
      >
        <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${config.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-[1px] text-[11px] font-semibold ${config.badge}`}>
              {tSev(finding.severity)}
            </span>
            <span className="rounded-full bg-glass px-2 py-[1px] text-[11px] text-text-3">
              {tCat(finding.category)}
            </span>
          </div>
          <h3 className={`text-[15px] font-semibold tracking-tight ${config.color}`}>{finding.title}</h3>
          {!expanded && (
            <p className="mt-1 line-clamp-1 font-mono text-[12px] text-text-3">
              &ldquo;{finding.clause_text}&rdquo;
            </p>
          )}
        </div>
        <span
          aria-hidden
          className={`mt-1.5 text-[12px] text-text-3 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        >
          ⌄
        </span>
      </button>

      {expanded && (
        <div className="border-t border-stroke px-4 pb-5 pt-4 sm:px-5">
          <Section label={t('clauseInContract')}>
            <blockquote className="rounded-xl border-l-2 border-stroke-strong bg-bg p-3.5 font-mono text-[13px] italic leading-relaxed text-text-2">
              &ldquo;{finding.clause_text}&rdquo;
            </blockquote>
          </Section>

          {finding.severity !== 'green' && (
            <>
              <Section label={t('whyThisMatters')}>
                <p className="text-[14px] leading-relaxed text-text">{finding.why_risky}</p>
              </Section>
              <Section label={t('industryNorm')}>
                <p className="text-[14px] leading-relaxed text-text-2">{finding.industry_standard}</p>
              </Section>
              <Section
                label={t('suggestedLanguage')}
                trailing={
                  negConfig && (
                    <span className={`rounded-full px-2 py-[1px] text-[11px] ${negConfig.badge}`}>
                      {tNeg(finding.negotiability)}
                    </span>
                  )
                }
              >
                <div className="rounded-xl border border-stroke bg-bg p-3.5 font-mono text-[13px] leading-relaxed text-text">
                  {finding.suggested_fix}
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={copyFix}
                    className="rounded-full px-3 py-1 text-[12px] text-text-3 transition-colors duration-200 hover:text-text"
                  >
                    {copied ? t('copied') : t('copySuggested')}
                  </button>
                </div>
              </Section>
            </>
          )}

          {finding.severity === 'green' && (
            <Section label={t('whyThisIsFine')}>
              <p className="text-[14px] leading-relaxed text-text">{finding.why_risky}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-text-2">{finding.industry_standard}</p>
            </Section>
          )}
        </div>
      )}
    </article>
  );
}

function Section({
  label,
  trailing,
  children,
}: {
  label: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-eyebrow text-text-3">{label}</p>
        {trailing}
      </div>
      {children}
    </div>
  );
}
