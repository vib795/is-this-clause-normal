'use client';

import { useState } from 'react';
import { Finding, SEVERITY_CONFIG, CATEGORY_LABELS, NEGOTIABILITY_CONFIG } from '@/lib/types';

interface FindingCardProps {
  finding: Finding;
  index: number;
}

export default function FindingCard({ finding, index }: FindingCardProps) {
  const [expanded, setExpanded] = useState(finding.severity === 'red');
  const [copied, setCopied] = useState(false);
  const config = SEVERITY_CONFIG[finding.severity];

  const copyFix = () => {
    navigator.clipboard.writeText(finding.suggested_fix);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden`}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>
              {config.label}
            </span>
            <span className="text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
              {CATEGORY_LABELS[finding.category]}
            </span>
          </div>
          <h3 className={`font-semibold text-sm ${config.color}`}>{finding.title}</h3>
          {!expanded && (
            <p className="text-xs text-zinc-500 mt-1 line-clamp-1 font-mono">
              &ldquo;{finding.clause_text}&rdquo;
            </p>
          )}
        </div>
        <div className="text-zinc-600 text-xs flex-shrink-0 mt-0.5">
          {expanded ? '▲' : '▼'}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          {/* Clause text */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Clause in contract
            </p>
            <blockquote className="text-sm text-zinc-300 font-mono bg-black/30 rounded-lg px-3 py-2.5 border-l-2 border-white/10 italic">
              &ldquo;{finding.clause_text}&rdquo;
            </blockquote>
          </div>

          {finding.severity !== 'green' && (
            <>
              {/* Why risky */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Why this matters
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed">{finding.why_risky}</p>
              </div>

              {/* Industry standard */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Industry norm
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed">{finding.industry_standard}</p>
              </div>

              {/* Suggested fix + negotiability */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Suggested language
                    </p>
                    {finding.negotiability && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${NEGOTIABILITY_CONFIG[finding.negotiability].badge}`}>
                        {NEGOTIABILITY_CONFIG[finding.negotiability].label}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={copyFix}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div className="text-sm text-zinc-200 font-mono bg-black/30 rounded-lg px-3 py-2.5 border border-white/10 leading-relaxed">
                  {finding.suggested_fix}
                </div>
              </div>
            </>
          )}

          {finding.severity === 'green' && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Why this is fine
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">{finding.why_risky}</p>
              <p className="text-sm text-zinc-400 leading-relaxed mt-2">{finding.industry_standard}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
