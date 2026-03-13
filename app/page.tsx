'use client';

import { useState, useEffect } from 'react';
import ContractInput from '@/components/ContractInput';
import AnalysisResults from '@/components/AnalysisResults';
import { AnalysisResult } from '@/lib/types';

const STORAGE_KEY = 'clause-scanner-history';
const MAX_HISTORY = 10;

interface HistoryEntry {
  id: string;
  result: AnalysisResult;
  savedAt: string;
}

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveToHistory(result: AnalysisResult): HistoryEntry[] {
  const history = loadHistory();
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    result,
    savedAt: new Date().toISOString(),
  };
  const updated = [entry, ...history].slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleAnalyze = async (formData: FormData) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setShowHistory(false);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Analysis failed. Please try again.');
        return;
      }

      setResult(data);
      const updated = saveToHistory(data);
      setHistory(updated);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const riskColors: Record<string, string> = {
    low: 'text-emerald-400',
    medium: 'text-amber-400',
    high: 'text-orange-400',
    critical: 'text-red-400',
  };

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 rounded-md bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <span className="text-red-400 text-xs font-bold">!</span>
            </div>
            <span className="font-semibold text-sm text-white">Is This Clause Normal?</span>
          </button>

          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button
                onClick={() => { setShowHistory(!showHistory); setResult(null); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors hidden sm:block"
              >
                History ({history.length})
              </button>
            )}
          </div>
        </div>
      </header>

      {/* History panel */}
      {showHistory && !result && !isAnalyzing && (
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
            <div className="p-3 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Recent Scans
              </h2>
              <button
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  setHistory([]);
                  setShowHistory(false);
                }}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="divide-y divide-white/5">
              {history.map(entry => {
                const redFlags = entry.result.findings.filter(f => f.severity === 'red').length;
                return (
                  <button
                    key={entry.id}
                    onClick={() => { setResult(entry.result); setShowHistory(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-400 truncate font-mono">
                          {entry.result.contract_snippet}...
                        </p>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {formatDate(entry.savedAt)}
                          {redFlags > 0 && (
                            <span className="ml-2 text-red-400">
                              {redFlags} red flag{redFlags > 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold flex-shrink-0 ${riskColors[entry.result.overall_risk] || 'text-zinc-400'}`}>
                        {entry.result.risk_score}/10
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-12">
        {!result && !isAnalyzing && !showHistory && (
          <>
            {/* Hero */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-red-950/40 border border-red-800/40 rounded-full px-3 py-1 text-xs text-red-400 font-medium mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Pattern matching · Not legal advice
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight tracking-tight">
                Is this clause normal?
              </h1>
              <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
                Paste your contract or upload a file. We scan for aggressive or unusual clauses
                and compare them to industry norms — so you know what to negotiate.
              </p>
            </div>

            <ContractInput
              onAnalyze={handleAnalyze}
              isLoading={isAnalyzing}
            />

            {error && (
              <div className="mt-4 bg-red-950/40 border border-red-800/50 rounded-xl p-4 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* How it works */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: '📋',
                  title: 'Paste or upload',
                  desc: 'Drop in your contract — PDF, Word doc, image screenshot, or plain text.',
                },
                {
                  icon: '🔍',
                  title: 'AI scans for patterns',
                  desc: 'Checks 9 categories of clauses against freelance industry norms.',
                },
                {
                  icon: '💬',
                  title: 'Get plain-English findings',
                  desc: 'See what to flag, what to negotiate, and suggested replacement language.',
                },
              ].map(item => (
                <div
                  key={item.title}
                  className="bg-white/[0.03] border border-white/5 rounded-xl p-4 text-center"
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {isAnalyzing && (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 mb-6">
              <span className="w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full animate-spin block" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Scanning your contract</h2>
            <p className="text-sm text-zinc-500">
              Checking for unusual clauses across 9 categories...
            </p>
          </div>
        )}

        {result && !isAnalyzing && (
          <AnalysisResults result={result} onReset={handleReset} />
        )}
      </div>
    </main>
  );
}
