'use client';

import { AnalysisResult, MissingClause, RISK_CONFIG, SEVERITY_CONFIG, CONTRACT_TYPE_LABELS } from '@/lib/types';
import FindingCard from './FindingCard';

interface AnalysisResultsProps {
  result: AnalysisResult;
  onReset: () => void;
}

function MissingClauseCard({ clause }: { clause: MissingClause }) {
  return (
    <div className="rounded-xl border border-blue-800/40 bg-blue-950/20 overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 bg-blue-400" />
          <div>
            <h4 className="font-semibold text-sm text-blue-300">{clause.title}</h4>
            <p className="text-sm text-zinc-300 leading-relaxed mt-2">{clause.why_important}</p>
          </div>
        </div>
        <div className="ml-5">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Suggested starter language
          </p>
          <div className="text-sm text-zinc-200 font-mono bg-black/30 rounded-lg px-3 py-2.5 border border-white/10 leading-relaxed">
            {clause.suggested_language}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisResults({ result, onReset }: AnalysisResultsProps) {
  const riskConfig = RISK_CONFIG[result.overall_risk];
  const redCount = result.findings.filter(f => f.severity === 'red').length;
  const yellowCount = result.findings.filter(f => f.severity === 'yellow').length;
  const greenCount = result.findings.filter(f => f.severity === 'green').length;

  const riskBarWidth = `${(result.risk_score / 10) * 100}%`;
  const riskBarColor =
    result.risk_score <= 3
      ? 'bg-emerald-500'
      : result.risk_score <= 5
      ? 'bg-amber-400'
      : result.risk_score <= 7
      ? 'bg-orange-400'
      : 'bg-red-500';

  const contractTypeLabel = result.contract_type ? CONTRACT_TYPE_LABELS[result.contract_type] : null;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Risk summary card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className={`text-2xl font-bold ${riskConfig.color}`}>
                {riskConfig.label}
              </h2>
              <span className="text-zinc-600 text-sm">—</span>
              <span className="text-zinc-400 text-sm">{riskConfig.description}</span>
            </div>

            {/* Contract type / jurisdiction chips */}
            {(contractTypeLabel || result.jurisdiction) && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {contractTypeLabel && (
                  <span className="text-xs bg-white/8 text-zinc-300 border border-white/10 px-2.5 py-1 rounded-full">
                    {contractTypeLabel}
                  </span>
                )}
                {result.jurisdiction && result.jurisdiction !== 'Unknown' && (
                  <span className="text-xs bg-white/8 text-zinc-300 border border-white/10 px-2.5 py-1 rounded-full">
                    {result.jurisdiction}
                  </span>
                )}
              </div>
            )}

            <p className="text-sm text-zinc-400 leading-relaxed mt-2">{result.summary}</p>
          </div>
        </div>

        {/* Risk score bar */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Risk Score</span>
            <span className={`text-sm font-bold ${riskConfig.color}`}>{result.risk_score}/10</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${riskBarColor}`}
              style={{ width: riskBarWidth }}
            />
          </div>
        </div>

        {/* Counts */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { count: redCount, config: SEVERITY_CONFIG.red, label: 'Deal-breakers' },
            { count: yellowCount, config: SEVERITY_CONFIG.yellow, label: 'Negotiate' },
            { count: greenCount, config: SEVERITY_CONFIG.green, label: 'Acceptable' },
          ].map(({ count, config, label }) => (
            <div key={label} className={`rounded-xl ${config.bg} border ${config.border} p-3 text-center`}>
              <div className={`text-2xl font-bold ${config.color}`}>{count}</div>
              <div className={`text-xs font-medium mt-0.5 ${config.color} opacity-80`}>{label}</div>
            </div>
          ))}
        </div>

        {/* Recommendation */}
        <div className="bg-black/30 rounded-xl p-3 border border-white/5">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Recommendation:{' '}
          </span>
          <span className="text-sm text-zinc-200">{result.recommendation}</span>
        </div>
      </div>

      {/* Findings */}
      {result.findings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">
            Findings ({result.findings.length})
          </h3>
          {result.findings.map((finding, i) => (
            <FindingCard key={finding.id} finding={finding} index={i} />
          ))}
        </div>
      )}

      {/* Missing clauses */}
      {result.missing_clauses && result.missing_clauses.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wider px-1">
            Missing Protective Clauses ({result.missing_clauses.length})
          </h3>
          {result.missing_clauses.map(clause => (
            <MissingClauseCard key={clause.id} clause={clause} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center space-y-3 pb-8">
        <p className="text-xs text-zinc-600">
          Not legal advice — pattern matching only. Consult a qualified attorney for legal decisions.
        </p>
        <button
          onClick={onReset}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors underline underline-offset-2"
        >
          Scan another contract
        </button>
      </div>
    </div>
  );
}
