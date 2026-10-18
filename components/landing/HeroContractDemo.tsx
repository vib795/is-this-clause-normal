'use client';

import { useEffect, useState } from 'react';

/**
 * The animated contract card in the hero. Cycles through three states:
 *  1. "scanning"   — beam sweeps top→bottom across plain clauses
 *  2. "flagging"   — three clauses get severity highlights + chips
 *  3. "diff"       — one clause shows a strikethrough + replacement line
 *
 * No animation library. Pure CSS/SVG keyed to a simple state machine.
 */
export function HeroContractDemo() {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const order: (0 | 1 | 2)[] = [0, 1, 2];
    let i = 0;
    const tick = () => {
      i = (i + 1) % order.length;
      setPhase(order[i]);
    };
    const t = setInterval(tick, 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      {/* Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 rounded-[40px] opacity-70 blur-2xl"
        style={{
          background:
            'radial-gradient(60% 50% at 40% 30%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%), radial-gradient(50% 50% at 70% 80%, color-mix(in srgb, var(--severity-orange) 14%, transparent), transparent 70%)',
        }}
      />

      <div
        className="relative overflow-hidden rounded-[22px] border border-stroke bg-elevated shadow-lg"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-stroke px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <Dot color="var(--severity-red)" />
            <Dot color="var(--severity-yellow)" />
            <Dot color="var(--severity-green)" />
          </div>
          <div className="text-[11px] font-mono text-text-3 tracking-tight">
            services-agreement.pdf
          </div>
          <div className="w-10" />
        </div>

        {/* Document body */}
        <div className="relative px-6 py-6 sm:px-8 sm:py-7 font-mono text-[12.5px] leading-[1.85] text-text-2 select-none">
          {/* Scan beam (phase 0) */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 h-24 transition-opacity duration-300 ${
              phase === 0 ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              background:
                'linear-gradient(to bottom, transparent, color-mix(in srgb, var(--accent) 18%, transparent), transparent)',
              animation: phase === 0 ? 'scan 2.2s var(--ease-in-out-spring) infinite' : 'none',
            }}
          />

          <DocHeader />
          <Section number="1." title="SERVICES">
            Contractor will provide design services as directed.
          </Section>

          <ClauseRow
            number="2."
            title="PAYMENT"
            severity={phase >= 1 ? 'yellow' : null}
            chip={phase >= 1 ? 'Negotiate · Payment' : null}
          >
            Net-90 from invoice approval.
          </ClauseRow>

          <ClauseRow
            number="3."
            title="INTELLECTUAL PROPERTY"
            severity={phase >= 1 ? 'red' : null}
            chip={phase >= 1 ? 'Deal-Breaker · IP' : null}
          >
            All prior work, including pre-existing materials, is assigned to Client.
          </ClauseRow>

          <ClauseRow
            number="4."
            title="NON-COMPETE"
            severity={phase >= 1 ? 'red' : null}
            chip={phase >= 1 ? 'Deal-Breaker · Restrictions' : null}
            diff={phase === 2}
            replacement="No exclusivity. Non-solicit limited to active accounts, 12 months."
          >
            Worldwide, 24-month exclusivity with no compensation.
          </ClauseRow>
        </div>

        {/* Footer status */}
        <div className="flex items-center justify-between border-t border-stroke bg-glass px-4 py-2.5 text-[11px] font-medium">
          <span className="flex items-center gap-2 text-text-3">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                phase === 0 ? 'bg-text-3' : 'bg-sev-red'
              }`}
              style={phase === 0 ? { animation: 'pulse 1.4s var(--ease-in-out-spring) infinite' } : {}}
            />
            {phase === 0 ? 'Scanning…' : '2 deal-breakers · 1 to negotiate'}
          </span>
          <span className="text-text-3">9 categories checked</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0%   { transform: translateY(-40%); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(620%); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />;
}

function DocHeader() {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-3">
        Services Agreement
      </p>
      <p className="mt-1 text-text-3">
        Between <span className="text-text-2">Client Inc.</span> and{' '}
        <span className="text-text-2">Contractor</span>
      </p>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <p>
        <span className="text-text-3">{number}</span>{' '}
        <span className="font-semibold tracking-wide text-text">{title}</span>
      </p>
      <p className="pl-5 text-text-2">{children}</p>
    </div>
  );
}

function ClauseRow({
  number,
  title,
  severity,
  chip,
  children,
  diff,
  replacement,
}: {
  number: string;
  title: string;
  severity: 'red' | 'yellow' | null;
  chip: string | null;
  children: React.ReactNode;
  diff?: boolean;
  replacement?: string;
}) {
  const styles = severityStyles(severity);

  return (
    <div
      className="relative mb-3 -mx-3 rounded-lg px-3 py-1.5 transition-colors duration-500"
      style={{
        backgroundColor: severity ? styles.bg : 'transparent',
        boxShadow: severity ? `inset 0 0 0 1px ${styles.stroke}` : 'none',
      }}
    >
      <p>
        <span className="text-text-3">{number}</span>{' '}
        <span className="font-semibold tracking-wide text-text">{title}</span>
        {chip && (
          <span
            className="ml-2 inline-flex items-center rounded-full px-2 py-[1px] text-[10px] font-semibold uppercase tracking-wider transition-opacity duration-500"
            style={{
              color: styles.fg,
              backgroundColor: styles.bg,
              boxShadow: `inset 0 0 0 1px ${styles.stroke}`,
            }}
          >
            {chip}
          </span>
        )}
      </p>
      <p
        className={`pl-5 transition-colors duration-500 ${
          diff ? 'line-through opacity-60' : ''
        }`}
        style={{ color: severity && !diff ? styles.fg : undefined }}
      >
        {children}
      </p>
      {diff && replacement && (
        <p
          className="pl-5 mt-1 transition-opacity duration-500"
          style={{ color: 'var(--severity-green)' }}
        >
          {replacement}
        </p>
      )}
    </div>
  );
}

function severityStyles(severity: 'red' | 'yellow' | null) {
  if (severity === 'red')
    return {
      fg: 'var(--severity-red)',
      bg: 'var(--severity-red-soft)',
      stroke: 'var(--severity-red-stroke)',
    };
  if (severity === 'yellow')
    return {
      fg: 'var(--severity-yellow)',
      bg: 'var(--severity-yellow-soft)',
      stroke: 'var(--severity-yellow-stroke)',
    };
  return { fg: '', bg: '', stroke: '' };
}
