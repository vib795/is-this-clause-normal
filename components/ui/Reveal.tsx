'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** "single" fades the whole block; "stagger" fades each direct child in sequence. */
  variant?: 'single' | 'stagger';
  /** IntersectionObserver threshold; default 0.18 fires when ~1/5 visible. */
  threshold?: number;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'header' | 'footer';
}

/**
 * Scroll-into-view reveal. Plain CSS transitions driven by an IntersectionObserver —
 * no animation library. Respects `prefers-reduced-motion` via globals.css.
 */
export function Reveal({
  children,
  variant = 'single',
  threshold = 0.18,
  className = '',
  as: Tag = 'div',
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin: '0px 0px -10% 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  const base = variant === 'stagger' ? 'reveal-stagger' : 'reveal';
  const cls = `${base}${visible ? ' is-visible' : ''} ${className}`.trim();

  return <Tag ref={ref} className={cls}>{children}</Tag>;
}
