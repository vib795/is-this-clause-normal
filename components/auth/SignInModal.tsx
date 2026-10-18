'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

interface SignInModalProps {
  open: boolean;
  onClose: () => void;
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Sign-in dialog with three paths: Google, GitHub, magic-link email.
 * Slice B ships magic link only — OAuth buttons disabled until you finish
 * setup in Supabase Auth → Providers.
 */
export function SignInModal({ open, onClose }: SignInModalProps) {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!open) {
      setEmail('');
      setStatus('idle');
      setErrorMsg('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : t('errorGeneric'));
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    setErrorMsg('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // Supabase handles the provider callback, then redirects HERE
          // with a `code` param that /api/auth/callback exchanges for a
          // session before bouncing to `/`.
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
      // Browser is now redirecting — nothing more to do.
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : `Could not start ${provider} sign-in.`);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        onClick={onClose}
        aria-hidden
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-stroke bg-elevated p-7 sm:p-8"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-3 transition-colors duration-200 hover:bg-glass hover:text-text"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <h2 id="signin-title" className="text-balance text-[22px] font-semibold tracking-tight text-text sm:text-[24px]">
          {t('title')}
        </h2>
        <p className="mt-2 text-[14px] text-text-2 text-body-rest">
          {t('subtitle')}
        </p>

        {status !== 'sent' ? (
          <>
            <div className="mt-6 flex flex-col gap-2">
              <OAuthButton provider="google" onClick={() => signInWithOAuth('google')} />
              <OAuthButton provider="github" onClick={() => signInWithOAuth('github')} />
            </div>

            <div className="my-5 flex items-center gap-3 text-[11.5px] uppercase tracking-wider text-text-4">
              <span className="h-px flex-1 bg-stroke" />
              {t('or')}
              <span className="h-px flex-1 bg-stroke" />
            </div>

            <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
              <label className="text-[12px] font-medium uppercase tracking-wider text-text-3" htmlFor="signin-email">
                {t('emailLabel')}
              </label>
              <input
                id="signin-email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                className="rounded-xl border border-stroke bg-bg px-3.5 py-2.5 text-[14.5px] text-text outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-4 focus:border-stroke-strong focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
              />
              <button
                type="submit"
                disabled={status === 'sending' || !email.trim()}
                className="mt-1 rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-on-accent shadow-sm transition-[transform,opacity] duration-200 hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'sending' ? t('sending') : t('sendLink')}
              </button>
              {status === 'error' && errorMsg && (
                <p className="text-[12.5px] text-sev-red">{errorMsg}</p>
              )}
            </form>
          </>
        ) : (
          <div className="mt-6 rounded-2xl border border-sev-green-stroke bg-sev-green-soft p-5">
            <p className="text-[14.5px] font-semibold text-sev-green">{t('checkEmailTitle')}</p>
            <p className="mt-1.5 text-[13px] text-text-2">
              {t.rich('checkEmailBody', {
                email,
                strong: chunks => <span className="font-medium text-text">{chunks}</span>,
              })}
            </p>
          </div>
        )}

        <p className="mt-5 text-[11.5px] text-text-4">
          {t('termsDisclaimer')}
        </p>
      </div>
    </div>
  );
}

function OAuthButton({
  provider,
  onClick,
  disabled,
}: {
  provider: 'google' | 'github';
  onClick?: () => void;
  disabled?: boolean;
}) {
  const t = useTranslations('auth');
  const label = provider === 'google' ? t('oauthGoogle') : t('oauthGitHub');
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? t('oauthDisabledTooltip', { provider }) : undefined}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stroke bg-bg px-4 py-2.5 text-[14px] font-medium text-text transition-colors duration-200 hover:bg-glass disabled:cursor-not-allowed disabled:opacity-50"
    >
      {provider === 'google' ? <GoogleGlyph /> : <GitHubGlyph />}
      {label}
      {disabled && <span className="ml-1 text-[11px] text-text-4">{t('oauthSetupPending')}</span>}
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-15.5c.3-1.3.4-2.6.4-4 0-1.4-.2-2.7-.4-4z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.6-5.2l-6.3-5.2A12 12 0 0 1 24 36c-5.3 0-9.7-3.4-11.3-8L6 32.9A20 20 0 0 0 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.6l6.3 5.2C40.6 35.4 44 30.2 44 24c0-1.4-.2-2.7-.4-4z" />
    </svg>
  );
}

function GitHubGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5z" />
    </svg>
  );
}
