'use client';

import { useState, useEffect, useMemo } from 'react';
import { diffLines } from 'diff';
import { useTranslations } from 'next-intl';
import { AnalysisResult, MissingClause, RISK_CONFIG, SEVERITY_CONFIG } from '@/lib/types';
import FindingCard from './FindingCard';

interface AnalysisResultsProps {
  result: AnalysisResult;
  onReset: () => void;
}

interface ChangeSummaryItem {
  section: string;
  change_type: 'modified' | 'added' | 'removed';
  rationale: string;
}

interface ProviderOption {
  id: string;
  label: string;
  default_model: string;
  models: string[];
  capabilities: { vision: boolean; native_pdf: boolean };
  configured: boolean;
}

// ────────────────────────────────────────────────────────────────────────────

export default function AnalysisResults({ result, onReset }: AnalysisResultsProps) {
  const t = useTranslations('results');
  const redCount = result.findings.filter(f => f.severity === 'red').length;
  const yellowCount = result.findings.filter(f => f.severity === 'yellow').length;
  const greenCount = result.findings.filter(f => f.severity === 'green').length;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <RiskHero
        result={result}
        redCount={redCount}
        yellowCount={yellowCount}
        greenCount={greenCount}
      />

      <CounterAgreementSection result={result} />

      {result.findings.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            kicker={t('findingsKicker')}
            title={t('findingsTitle', { count: result.findings.length })}
          />
          <div className="space-y-3">
            {result.findings.map((finding, i) => (
              <FindingCard key={finding.id} finding={finding} index={i} />
            ))}
          </div>
        </section>
      )}

      {result.missing_clauses && result.missing_clauses.length > 0 && (
        <section className="space-y-3">
          <SectionHeader
            kicker={t('missingKicker')}
            title={t('missingTitle', { count: result.missing_clauses.length })}
            tone="blue"
          />
          <div className="space-y-3">
            {result.missing_clauses.map(clause => (
              <MissingClauseCard key={clause.id} clause={clause} />
            ))}
          </div>
        </section>
      )}

      <footer className="pb-8 pt-6 text-center">
        <p className="text-[12px] text-text-3">{t('footerDisclaimer')}</p>
        <button
          onClick={onReset}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-stroke px-4 py-2 text-[13px] text-text-2 transition-[background-color,color] duration-200 hover:bg-glass hover:text-text"
        >
          {t('scanAnother')}
        </button>
      </footer>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Risk hero — the headline card at the top of any result
// ────────────────────────────────────────────────────────────────────────────

function RiskHero({
  result, redCount, yellowCount, greenCount,
}: {
  result: AnalysisResult;
  redCount: number;
  yellowCount: number;
  greenCount: number;
}) {
  const t = useTranslations('results');
  const tRisk = useTranslations('riskLevels');
  const tType = useTranslations('contractTypes');
  const riskColor = RISK_CONFIG[result.overall_risk].color;
  const pct = (result.risk_score / 10) * 100;
  const barColor =
    result.risk_score <= 3 ? 'var(--severity-green)'
    : result.risk_score <= 5 ? 'var(--severity-yellow)'
    : result.risk_score <= 7 ? 'var(--severity-orange)'
    : 'var(--severity-red)';

  const contractTypeLabel = result.contract_type ? tType(result.contract_type) : null;

  return (
    <section
      className="overflow-hidden rounded-3xl border border-stroke bg-elevated"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      {/* Top band — risk label + score */}
      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-start sm:p-8">
        <div>
          <p className="text-eyebrow text-text-3">{t('overallEyebrow')}</p>
          <h1 className={`text-display text-display-tight mt-2 text-[32px] sm:text-[42px] ${riskColor}`}>
            {tRisk(`${result.overall_risk}.label`)}
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-text-2">
            {tRisk(`${result.overall_risk}.description`)}
          </p>
          <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-text-2">{result.summary}</p>

          {(contractTypeLabel || result.jurisdiction || (result.provider && result.model)) && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {contractTypeLabel && <Chip>{contractTypeLabel}</Chip>}
              {result.jurisdiction && result.jurisdiction !== 'Unknown' && (
                <Chip>{result.jurisdiction}</Chip>
              )}
              {result.provider && result.model && (
                <Chip mono>{t('providerModel', { provider: result.provider, model: result.model })}</Chip>
              )}
            </div>
          )}
        </div>

        {/* Score arc */}
        <div className="flex items-center justify-center sm:justify-end">
          <ScoreRing score={result.risk_score} color={barColor} />
        </div>
      </div>

      {/* Bar */}
      <div className="px-6 pb-6 sm:px-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-eyebrow text-text-3">{t('riskScoreEyebrow')}</span>
          <span className={`text-[13px] font-semibold ${riskColor}`}>
            {t('riskScoreOf10', { score: result.risk_score })}
          </span>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-glass">
          <div
            className="h-full rounded-full transition-[width] duration-1000"
            style={{ width: `${pct}%`, background: barColor, transitionTimingFunction: 'var(--ease-out-spring)' }}
          />
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 border-t border-stroke">
        <CountCell n={redCount}    label={t('countDealBreakers')} config={SEVERITY_CONFIG.red} />
        <CountCell n={yellowCount} label={t('countNegotiate')}    config={SEVERITY_CONFIG.yellow} border />
        <CountCell n={greenCount}  label={t('countAcceptable')}   config={SEVERITY_CONFIG.green} />
      </div>

      {/* Recommendation */}
      <div className="border-t border-stroke bg-glass px-6 py-5 sm:px-8">
        <p className="text-eyebrow text-text-3">{t('recommendationEyebrow')}</p>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-text">{result.recommendation}</p>
      </div>
    </section>
  );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const size = 116;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 10) * c;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="var(--stroke-subtle)" strokeWidth={stroke} fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1.1s var(--ease-out-spring)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-bold tracking-tight text-text">{score}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-3">/ 10</span>
      </div>
    </div>
  );
}

function CountCell({
  n, label, config, border,
}: {
  n: number;
  label: string;
  config: { color: string; bg: string };
  border?: boolean;
}) {
  return (
    <div className={`px-4 py-5 text-center ${border ? 'border-x border-stroke' : ''}`}>
      <div className={`text-[28px] font-bold tracking-tight ${config.color}`}>{n}</div>
      <div className="mt-0.5 text-[12px] font-medium text-text-2">{label}</div>
    </div>
  );
}

function Chip({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span
      className={[
        'rounded-full border border-stroke bg-glass px-2.5 py-1 text-[11.5px] text-text-2',
        mono ? 'font-mono' : '',
      ].join(' ')}
    >
      {children}
    </span>
  );
}

function SectionHeader({
  kicker, title, tone = 'default',
}: {
  kicker: string;
  title: string;
  tone?: 'default' | 'blue';
}) {
  return (
    <div className="px-1">
      <p className={`text-eyebrow ${tone === 'blue' ? 'text-sev-blue' : 'text-text-3'}`}>{kicker}</p>
      <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-text">{title}</h2>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Missing clauses
// ────────────────────────────────────────────────────────────────────────────

function MissingClauseCard({ clause }: { clause: MissingClause }) {
  const t = useTranslations('missingClause');
  return (
    <article
      className="overflow-hidden rounded-2xl border bg-elevated"
      style={{ borderColor: 'var(--severity-blue-stroke)' }}
    >
      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-1.5 inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full bg-sev-blue" />
          <div>
            <h4 className="text-[15px] font-semibold tracking-tight text-sev-blue">{clause.title}</h4>
            <p className="mt-2 text-[14px] leading-relaxed text-text">{clause.why_important}</p>
          </div>
        </div>
        <div className="pl-[22px]">
          <p className="text-eyebrow text-text-3">{t('suggestedStarterEyebrow')}</p>
          <div className="mt-1.5 rounded-xl border border-stroke bg-bg p-3.5 font-mono text-[13px] leading-relaxed text-text">
            {clause.suggested_language}
          </div>
        </div>
      </div>
    </article>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Counter-agreement section
// ────────────────────────────────────────────────────────────────────────────

interface DraftState {
  revisedText: string;
  changeSummary: ChangeSummaryItem[];
  draftedBy: { provider: string; model: string };
}

function CounterAgreementSection({ result }: { result: AnalysisResult }) {
  const t = useTranslations('counterAgreement');
  const savedOriginal = (result.contract_text || '').trim();
  const [pastedOriginal, setPastedOriginal] = useState<string>('');
  const [pasteDraft, setPasteDraft] = useState<string>('');
  const [fallbackMode, setFallbackMode] = useState<'idle' | 'paste' | 'upload'>('idle');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const contractText = savedOriginal || pastedOriginal;
  const hasOriginal = contractText.length > 0;

  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [providerId, setProviderId] = useState<string>(result.provider || '');
  const [modelId, setModelId] = useState<string>(result.model || '');
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState<'draft' | 'revised-pdf' | 'redline-pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'revised' | 'redline'>('revised');

  useEffect(() => {
    fetch('/api/providers')
      .then(r => r.json())
      .then((data: { providers: ProviderOption[] }) => {
        const list = data.providers || [];
        setProviders(list);
        if (!providerId) {
          const fallback = list.find(p => p.configured) || list[0];
          if (fallback) {
            setProviderId(fallback.id);
            setModelId(fallback.default_model);
          }
        }
      })
      .catch(() => { /* keep defaults */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentProvider = providers.find(p => p.id === providerId);
  const draftStale = draft && (draft.draftedBy.provider !== providerId || draft.draftedBy.model !== modelId);

  const handleProviderChange = (id: string) => {
    setProviderId(id);
    const p = providers.find(x => x.id === id);
    if (p) setModelId(p.default_model);
  };

  const generateDraft = async () => {
    if (!hasOriginal) return;
    setLoading('draft');
    setError(null);
    try {
      const res = await fetch('/api/counter-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_text: contractText,
          analysis: result,
          provider: providerId,
          model: modelId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('errorGenerate'));
        return;
      }
      setDraft({
        revisedText: data.revised_text,
        changeSummary: data.change_summary || [],
        draftedBy: { provider: data.provider || providerId, model: data.model || modelId },
      });
      setActiveTab('revised');
    } catch {
      setError(t('errorNetworkGenerate'));
    } finally {
      setLoading(null);
    }
  };

  const downloadPdf = async (variant: 'revised' | 'redline') => {
    if (!draft) return;
    setError(null);
    setLoading(variant === 'revised' ? 'revised-pdf' : 'redline-pdf');
    try {
      const res = await fetch('/api/counter-agreement/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant,
          original_text: contractText,
          revised_text: draft.revisedText,
          generated_by: `${draft.draftedBy.provider} · ${draft.draftedBy.model}`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t('errorPdf'));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = variant === 'redline' ? 'counter-agreement-redline.pdf' : 'counter-agreement.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(t('errorNetworkPdf'));
    } finally {
      setLoading(null);
    }
  };

  if (!hasOriginal) {
    return (
      <CounterFallback
        fallbackMode={fallbackMode}
        setFallbackMode={setFallbackMode}
        pasteDraft={pasteDraft}
        setPasteDraft={setPasteDraft}
        onPasteUnlock={(txt) => { setPastedOriginal(txt); setFallbackMode('idle'); }}
        extracting={extracting}
        extractError={extractError}
        onFile={async (f) => {
          setExtractError(null);
          setExtracting(true);
          try {
            const fd = new FormData();
            fd.append('file', f);
            const res = await fetch('/api/extract', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) {
              setExtractError(data.error || t('fallbackErrorExtract'));
              return;
            }
            const txt: string = (data.text || '').trim();
            if (txt.length < 50) {
              setExtractError(t('fallbackErrorTooShort'));
              return;
            }
            setPastedOriginal(txt);
            setFallbackMode('idle');
          } catch {
            setExtractError(t('fallbackErrorNetwork'));
          } finally {
            setExtracting(false);
          }
        }}
      />
    );
  }

  return (
    <section
      id="counter"
      className="overflow-hidden rounded-3xl border border-stroke bg-elevated"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <div className="space-y-6 p-6 sm:p-8">
        <div>
          <p className="text-eyebrow text-accent">{t('eyebrow')}</p>
          <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-text sm:text-[26px]">
            {t('title')}
          </h2>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-text-2">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldSelect
            label={t('fieldProviderLabel')}
            value={providerId}
            onChange={handleProviderChange}
            disabled={loading !== null}
            options={providers.length === 0
              ? [{ value: '', label: t('providerLoading'), disabled: true }]
              : providers.map(p => ({
                  value: p.id,
                  label: `${p.label}${!p.configured ? ` ${t('providerNotConfiguredSuffix')}` : ''}`,
                  disabled: !p.configured,
                }))
            }
          />
          <FieldSelect
            label={t('fieldModelLabel')}
            value={modelId}
            onChange={setModelId}
            disabled={loading !== null}
            options={(currentProvider?.models || []).map(m => ({ value: m, label: m }))}
          />
        </div>
        <p className="text-[12px] text-text-3">{t('modelHelp')}</p>

        {!draft && (
          <button
            onClick={generateDraft}
            disabled={loading !== null || !providerId || !modelId}
            className={[
              'inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[14.5px] font-semibold transition-[background-color,transform,color] duration-200',
              loading === 'draft'
                ? 'bg-glass text-text-3 cursor-wait'
                : 'bg-accent text-on-accent shadow-[var(--shadow-accent)] hover:bg-accent-hover active:scale-[0.98] disabled:bg-glass disabled:text-text-3 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {loading === 'draft' ? (
              <><Spinner /> {t('drafting')}</>
            ) : (
              t('draftCta', { model: modelId || t('draftCtaFallbackModel') })
            )}
          </button>
        )}

        {draft && draftStale && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sev-yellow-stroke bg-sev-yellow-soft px-4 py-3">
            <span className="text-[12.5px] text-sev-yellow">
              {t('drafterChanged')}{' '}
              <span className="font-mono">{draft.draftedBy.provider} · {draft.draftedBy.model}</span>.
            </span>
            <button
              onClick={generateDraft}
              disabled={loading !== null}
              className="rounded-full px-3 py-1 text-[12.5px] font-semibold text-sev-yellow underline underline-offset-2 transition-colors duration-200 hover:text-text disabled:opacity-50"
            >
              {loading === 'draft' ? t('redrafting') : t('redraft')}
            </button>
          </div>
        )}

        {draft && (
          <div className="space-y-4">
            {draft.changeSummary.length > 0 && (
              <details className="overflow-hidden rounded-2xl border border-stroke bg-bg" open>
                <summary className="cursor-pointer px-4 py-3 text-eyebrow text-text-3 hover:bg-glass">
                  {t('changesProposed', { count: draft.changeSummary.length })}
                </summary>
                <ul className="space-y-1.5 border-t border-stroke px-4 py-3">
                  {draft.changeSummary.map((c, i) => {
                    const color =
                      c.change_type === 'added' ? 'text-sev-green'
                      : c.change_type === 'removed' ? 'text-sev-red'
                      : 'text-sev-yellow';
                    const typeLabel =
                      c.change_type === 'added' ? t('changeAdded')
                      : c.change_type === 'removed' ? t('changeRemoved')
                      : t('changeModified');
                    return (
                      <li key={i} className="text-[12.5px] leading-relaxed text-text-2">
                        <span className={`font-mono font-semibold ${color}`}>[{typeLabel}]</span>{' '}
                        <span className="text-text">{c.section}</span> — {c.rationale}
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex gap-1 rounded-full bg-glass p-1">
                <TabButton active={activeTab === 'revised'} onClick={() => setActiveTab('revised')}>
                  {t('tabRevised')}
                </TabButton>
                <TabButton active={activeTab === 'redline'} onClick={() => setActiveTab('redline')}>
                  {t('tabRedline')}
                </TabButton>
              </div>
              <button
                onClick={() => downloadPdf(activeTab)}
                disabled={loading !== null}
                className="inline-flex items-center gap-1.5 rounded-full bg-text px-3.5 py-1.5 text-[12.5px] font-semibold text-bg transition-[background-color,transform] duration-200 hover:bg-text/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {(loading === 'revised-pdf' && activeTab === 'revised') ||
                 (loading === 'redline-pdf' && activeTab === 'redline') ? (
                  <><Spinner small /> {t('renderingPdf')}</>
                ) : (
                  activeTab === 'redline' ? t('downloadRedline') : t('downloadRevised')
                )}
              </button>
            </div>

            {activeTab === 'revised' ? (
              <div className="max-h-[28rem] overflow-auto rounded-2xl border border-stroke bg-bg p-4">
                <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-text">
                  {draft.revisedText}
                </pre>
              </div>
            ) : (
              <RedlineView original={contractText} revised={draft.revisedText} />
            )}

            <p className="text-[12px] leading-relaxed text-text-3">
              {t('draftedByPrefix')}{' '}
              <span className="font-mono text-text-2">{draft.draftedBy.provider} · {draft.draftedBy.model}</span>.{' '}
              {t('draftDisclaimer')}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-sev-red-stroke bg-sev-red-soft px-4 py-3 text-[12.5px] text-sev-red">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Counter-agreement: fallback when contract_text is missing
// ────────────────────────────────────────────────────────────────────────────

function CounterFallback({
  fallbackMode, setFallbackMode,
  pasteDraft, setPasteDraft,
  onPasteUnlock,
  onFile,
  extracting, extractError,
}: {
  fallbackMode: 'idle' | 'paste' | 'upload';
  setFallbackMode: (m: 'idle' | 'paste' | 'upload') => void;
  pasteDraft: string;
  setPasteDraft: (s: string) => void;
  onPasteUnlock: (txt: string) => void;
  onFile: (f: File) => void;
  extracting: boolean;
  extractError: string | null;
}) {
  const t = useTranslations('counterAgreement');
  const tCommon = useTranslations('common');
  return (
    <section
      className="overflow-hidden rounded-3xl border border-sev-yellow-stroke bg-sev-yellow-soft p-6 sm:p-7"
    >
      <div className="space-y-5">
        <div>
          <p className="text-eyebrow text-sev-yellow">{t('fallbackEyebrow')}</p>
          <h3 className="mt-2 text-[18px] font-semibold tracking-tight text-text">
            {t('fallbackTitle')}
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-2">
            {t('fallbackSubtitle')}
          </p>
        </div>

        {fallbackMode === 'idle' && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={() => setFallbackMode('paste')}
              className="rounded-full bg-text px-4 py-2.5 text-[13.5px] font-semibold text-bg transition-[background-color,transform] duration-200 hover:bg-text/90 active:scale-[0.98]"
            >
              {t('fallbackPaste')}
            </button>
            <button
              onClick={() => setFallbackMode('upload')}
              className="rounded-full border border-stroke-strong bg-elevated px-4 py-2.5 text-[13.5px] font-semibold text-text transition-[background-color,transform] duration-200 hover:bg-glass active:scale-[0.98]"
            >
              {t('fallbackUpload')}
            </button>
          </div>
        )}

        {fallbackMode === 'paste' && (
          <div className="space-y-2.5">
            <textarea
              value={pasteDraft}
              onChange={e => setPasteDraft(e.target.value)}
              placeholder={t('fallbackPastePlaceholder')}
              className="h-48 w-full resize-none rounded-2xl border border-stroke bg-bg p-3 font-mono text-[12.5px] leading-relaxed text-text placeholder:text-text-4 focus:border-stroke-strong focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { if (pasteDraft.trim().length >= 50) onPasteUnlock(pasteDraft.trim()); }}
                disabled={pasteDraft.trim().length < 50}
                className="flex-1 rounded-full bg-text px-4 py-2 text-[13px] font-semibold text-bg transition-[background-color,transform] duration-200 hover:bg-text/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('fallbackUnlock')}
              </button>
              <button
                onClick={() => { setFallbackMode('idle'); setPasteDraft(''); }}
                className="rounded-full border border-stroke px-4 py-2 text-[13px] text-text-2 transition-colors duration-200 hover:text-text"
              >
                {tCommon('cancel')}
              </button>
            </div>
            {pasteDraft.length > 0 && pasteDraft.trim().length < 50 && (
              <p className="text-[11.5px] text-sev-yellow">{t('fallbackPasteTooShort')}</p>
            )}
          </div>
        )}

        {fallbackMode === 'upload' && (
          <div className="space-y-2.5">
            <label
              className={[
                'flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-[background-color,border-color] duration-200',
                extracting
                  ? 'cursor-wait border-stroke-strong bg-glass'
                  : 'border-stroke bg-bg hover:border-stroke-strong hover:bg-glass',
              ].join(' ')}
            >
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.rtf,.jpg,.jpeg,.png,.gif,.webp,.heic,.bmp,.tiff"
                disabled={extracting}
                onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
                className="hidden"
              />
              {extracting ? (
                <>
                  <Spinner /> <span className="text-[13px] text-text-2">{t('fallbackExtracting')}</span>
                </>
              ) : (
                <>
                  <span aria-hidden className="text-[20px] text-text-3">+</span>
                  <span className="text-[13.5px] text-text">{t('fallbackClickOrDrop')}</span>
                  <span className="text-[11.5px] text-text-3">{t('fallbackFileFormats')}</span>
                </>
              )}
            </label>
            <button
              onClick={() => setFallbackMode('idle')}
              disabled={extracting}
              className="w-full rounded-full border border-stroke px-4 py-2 text-[13px] text-text-2 transition-colors duration-200 hover:text-text disabled:opacity-50"
            >
              {tCommon('cancel')}
            </button>
            {extractError && <p className="text-[11.5px] text-sev-red">{extractError}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Bits
// ────────────────────────────────────────────────────────────────────────────

function RedlineView({ original, revised }: { original: string; revised: string }) {
  const parts = useMemo(
    () => diffLines(original.replace(/\r\n/g, '\n'), revised.replace(/\r\n/g, '\n')),
    [original, revised]
  );
  return (
    <div className="max-h-[28rem] overflow-auto rounded-2xl border border-stroke bg-bg font-mono text-[12px] leading-relaxed">
      {parts.map((part, i) => {
        const type = part.added ? 'added' : part.removed ? 'removed' : 'context';
        const lines = part.value.split('\n');
        if (lines.length && lines[lines.length - 1] === '') lines.pop();
        return (
          <div key={i}>
            {lines.map((line, j) => {
              const prefix = type === 'added' ? '+ ' : type === 'removed' ? '- ' : '  ';
              const style: React.CSSProperties =
                type === 'added'
                  ? { background: 'var(--severity-green-soft)', color: 'var(--severity-green)', borderLeft: '2px solid var(--severity-green)' }
                  : type === 'removed'
                  ? { background: 'var(--severity-red-soft)', color: 'var(--severity-red)', borderLeft: '2px solid var(--severity-red)' }
                  : { color: 'var(--text-secondary)', borderLeft: '2px solid transparent' };
              return (
                <div key={j} className="whitespace-pre-wrap break-words px-3 py-[1px]" style={style}>
                  {prefix}{line || ' '}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function FieldSelect({
  label, value, onChange, options, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-text-3">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none rounded-xl border border-stroke bg-bg px-3 py-2 pr-9 text-[13.5px] text-text transition-colors duration-200 focus:border-stroke-strong focus:outline-none disabled:opacity-50"
        >
          {options.map(o => (
            <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-3">⌄</span>
      </div>
    </label>
  );
}

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-full px-3 py-1 text-[12.5px] font-medium transition-[background-color,color] duration-200',
        active ? 'bg-elevated text-text shadow-sm' : 'text-text-2 hover:text-text',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Spinner({ small }: { small?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block rounded-full border-2 border-current border-t-transparent ${small ? 'h-3 w-3' : 'h-4 w-4'}`}
      style={{ animation: 'spin 0.9s linear infinite' }}
    >
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
