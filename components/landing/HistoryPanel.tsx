'use client';

import { useLocale, useTranslations } from 'next-intl';
import { AnalysisResult, RISK_CONFIG } from '@/lib/types';

interface HistoryEntry {
  id: string;
  result: AnalysisResult;
  savedAt: string;
}

interface HistoryPanelProps {
  history: HistoryEntry[];
  onSelect: (result: AnalysisResult) => void;
  onClear: () => void;
}

export function HistoryPanel({ history, onSelect, onClear }: HistoryPanelProps) {
  const t = useTranslations('history');
  const tRisk = useTranslations('riskLevels');
  const locale = useLocale();
  if (history.length === 0) return null;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  return (
    <div
      className="overflow-hidden rounded-3xl border border-stroke bg-elevated"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <div className="flex items-center justify-between border-b border-stroke px-5 py-3.5">
        <div>
          <h3 className="text-eyebrow text-text-3">{t('title')}</h3>
          <p className="mt-0.5 text-[12px] text-text-3">{t('subtitle')}</p>
        </div>
        <button
          onClick={onClear}
          className="rounded-full px-3 py-1 text-[12px] text-text-3 transition-colors duration-200 hover:text-text"
        >
          {t('clearAll')}
        </button>
      </div>
      <ul>
        {history.map(entry => {
          const cfg = RISK_CONFIG[entry.result.overall_risk];
          const redFlags = entry.result.findings.filter(f => f.severity === 'red').length;
          return (
            <li key={entry.id}>
              <button
                onClick={() => onSelect(entry.result)}
                className="group flex w-full items-center justify-between gap-4 border-b border-stroke px-5 py-4 text-left transition-colors duration-200 last:border-b-0 hover:bg-glass"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[12.5px] text-text-2">
                    {entry.result.contract_snippet}…
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-text-3">
                    <span>{formatDate(entry.savedAt)}</span>
                    <span aria-hidden>·</span>
                    <span className={cfg.color}>{tRisk(`${entry.result.overall_risk}.label`)}</span>
                    {redFlags > 0 && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="text-sev-red">{t('redFlags', { count: redFlags })}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`flex-shrink-0 text-[18px] font-bold tracking-tight ${cfg.color}`}>
                  {entry.result.risk_score}
                  <span className="text-text-4">/10</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
