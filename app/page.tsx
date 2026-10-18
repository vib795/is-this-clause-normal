'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import ContractInput from '@/components/ContractInput';
import AnalysisResults from '@/components/AnalysisResults';
import { AnalysisResult } from '@/lib/types';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Hero } from '@/components/landing/Hero';
import { CoverageSection } from '@/components/landing/CoverageSection';
import { CounterSection } from '@/components/landing/CounterSection';
import { ProvidersSection } from '@/components/landing/ProvidersSection';
import { HistoryPanel } from '@/components/landing/HistoryPanel';
import { AnalyzingState, type AnalyzingPhase, type AnalyzingSection } from '@/components/scan/AnalyzingState';
import { QuotaLockout } from '@/components/scan/QuotaLockout';
import { Reveal } from '@/components/ui/Reveal';
import { SignInModal } from '@/components/auth/SignInModal';
import { useQuota } from '@/lib/useQuota';
import { useAuth } from '@/lib/useAuth';
import { createClient } from '@/lib/supabase/client';

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
    const raw: HistoryEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const cleaned = raw.filter(
      e => !!e.result?.contract_text && e.result.contract_text.trim().length > 0
    );
    if (cleaned.length !== raw.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
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
  const [completedCategories, setCompletedCategories] = useState<Set<string>>(new Set());
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [phase, setPhase] = useState<AnalyzingPhase>('analyzing');
  const [section, setSection] = useState<AnalyzingSection>(null);
  const [findingsCount, setFindingsCount] = useState(0);
  const [missingCount, setMissingCount] = useState(0);
  const [activeLanguageCode, setActiveLanguageCode] = useState<string>('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const scanRef = useRef<HTMLDivElement>(null);
  const { quota, refetch: refetchQuota } = useQuota();
  const { user } = useAuth();
  const tScan = useTranslations('scan');
  const tErr = useTranslations('errors');
  const tAuth = useTranslations('auth');

  // Sign-in or sign-out → quota source changes (cookie ↔ DB count) so refetch.
  useEffect(() => {
    refetchQuota();
  }, [user?.id, refetchQuota]);

  // OAuth failures redirect to /?auth_error=1 — surface it once and strip
  // the param so a refresh doesn't keep replaying the toast.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('auth_error') === '1') {
      setError(tAuth('errorOAuth'));
      url.searchParams.delete('auth_error');
      window.history.replaceState({}, '', url.toString());
    }
  }, [tAuth]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out failed', err);
    }
  };

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleAnalyze = async (formData: FormData) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setShowHistory(false);
    setCompletedCategories(new Set());
    setCurrentCategory(null);
    setSection(null);
    setFindingsCount(0);
    setMissingCount(0);
    setPhase('analyzing');
    setActiveLanguageCode((formData.get('language_code') as string) || '');
    scrollToScan();

    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });

      // Pre-stream validation errors come back as a plain JSON body.
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok && !contentType.includes('text/event-stream')) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || tErr('analysisFailed'));
        setIsAnalyzing(false);
        // 402 = quota exhausted — refresh state so the lockout view + chip
        // both flip immediately rather than waiting for the next page load.
        if (res.status === 402) refetchQuota();
        return;
      }
      if (!res.body) {
        setError(tErr('noStreaming'));
        setIsAnalyzing(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: AnalysisResult | null = null;
      let streamError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by a blank line.
        let sepIdx;
        while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);
          const dataLine = rawEvent.split('\n').find(l => l.startsWith('data: '));
          if (!dataLine) continue;
          let payload: { type: string; [k: string]: unknown };
          try {
            payload = JSON.parse(dataLine.slice(6));
          } catch {
            continue;
          }
          if (payload.type === 'progress' && typeof payload.category === 'string') {
            const cat = payload.category;
            setCurrentCategory(cat);
            setCompletedCategories(prev => {
              if (prev.has(cat)) return prev;
              const next = new Set(prev);
              next.add(cat);
              return next;
            });
          } else if (payload.type === 'section' && typeof payload.section === 'string') {
            setSection(payload.section as AnalyzingSection);
            // Entering missing_clauses means findings is done — clear the
            // active spinner so the last category doesn't keep spinning.
            if (payload.section === 'missing_clauses') setCurrentCategory(null);
          } else if (payload.type === 'tick') {
            if (typeof payload.findings === 'number') setFindingsCount(payload.findings);
            if (typeof payload.missing === 'number') setMissingCount(payload.missing);
          } else if (payload.type === 'phase' && typeof payload.phase === 'string') {
            setPhase(payload.phase as AnalyzingPhase);
            if (payload.phase !== 'analyzing') setCurrentCategory(null);
          } else if (payload.type === 'result' && payload.data) {
            finalResult = payload.data as AnalysisResult;
          } else if (payload.type === 'error' && typeof payload.message === 'string') {
            streamError = payload.message;
          }
        }
      }

      if (streamError) {
        setError(streamError);
        return;
      }
      if (!finalResult) {
        setError(tErr('analysisEndedNoResult'));
        return;
      }
      setResult(finalResult);
      const updated = saveToHistory(finalResult);
      setHistory(updated);
      // Successful scan consumed one quota unit — refresh so the header
      // chip and any subsequent lockout state are current.
      refetchQuota();
    } catch {
      setError(tErr('network'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    scrollToScan();
  };

  const handleHome = () => {
    // Clicking the brand mark always returns to the landing — clear any
    // result/error/history-panel state and scroll to the top of the page.
    setResult(null);
    setError(null);
    setShowHistory(false);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const scrollToScan = () => {
    requestAnimationFrame(() => {
      scanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const isShowingResult = !!result || isAnalyzing;

  return (
    <main className="relative min-h-screen bg-bg text-text">
      <SiteHeader
        onCtaClick={scrollToScan}
        onHomeClick={handleHome}
        historyCount={history.length}
        onHistoryClick={() => { setShowHistory(s => !s); setResult(null); scrollToScan(); }}
        quota={quota}
        user={user}
        onSignInClick={() => setSignInOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Landing — only when there's no live result/scan in progress */}
      {!isShowingResult && (
        <>
          <Hero onPrimaryClick={scrollToScan} />
          <CoverageSection />
          <CounterSection />
          <ProvidersSection />
        </>
      )}

      {/* Scan zone — anchor target for the CTA */}
      <section
        id="scan"
        ref={scanRef}
        className={[
          'relative mx-auto w-full max-w-3xl px-5 sm:px-8',
          isShowingResult ? 'pt-16 sm:pt-24' : 'py-24 sm:py-32',
        ].join(' ')}
      >
        {!isShowingResult && (
          <Reveal className="mb-10 text-center" variant="single">
            <p className="text-eyebrow text-accent">{tScan('sectionEyebrow')}</p>
            <h2 className="text-display text-display-tight mt-3 text-balance text-[32px] text-text sm:text-[48px]">
              {tScan('sectionTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] text-text-2 sm:text-[17px] text-body-rest">
              {tScan('sectionSubtitle')}
            </p>
          </Reveal>
        )}

        {/* History panel — toggled from header */}
        {showHistory && !isShowingResult && history.length > 0 && (
          <div className="mb-8">
            <HistoryPanel
              history={history}
              onSelect={(r) => { setResult(r); setShowHistory(false); }}
              onClear={() => {
                localStorage.removeItem(STORAGE_KEY);
                setHistory([]);
                setShowHistory(false);
              }}
            />
          </div>
        )}

        {!isShowingResult && (
          quota?.exhausted ? (
            <QuotaLockout quota={quota} onSignInClick={() => setSignInOpen(true)} />
          ) : (
            <ContractInput onAnalyze={handleAnalyze} isLoading={isAnalyzing} />
          )
        )}

        {error && !isShowingResult && (
          <div className="mt-4 rounded-2xl border border-sev-red-stroke bg-sev-red-soft px-4 py-3 text-[13px] text-sev-red">
            {error}
          </div>
        )}

        {isAnalyzing && (
          <AnalyzingState
            completedCategories={completedCategories}
            currentCategory={currentCategory}
            phase={phase}
            section={section}
            findingsCount={findingsCount}
            missingCount={missingCount}
            languageCode={activeLanguageCode}
          />
        )}

        {result && !isAnalyzing && (
          <AnalysisResults result={result} onReset={handleReset} />
        )}
      </section>

      <SiteFooter />

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </main>
  );
}
