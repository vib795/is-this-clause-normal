'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ByokKeyManager } from '@/components/settings/ByokKeyManager';
import { useAuth } from '@/lib/useAuth';
import { useQuota } from '@/lib/useQuota';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslations('settings');
  const { user, loading } = useAuth();
  const { quota } = useQuota();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    setAuthChecked(true);
  }, [loading, user, router]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace('/');
    } catch (err) {
      console.error('Sign out failed', err);
    }
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-bg text-text">
        <div className="mx-auto flex h-[60vh] max-w-3xl items-center justify-center px-5">
          <p className="text-[14px] text-text-3">{t('loading')}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-bg text-text">
      <SiteHeader
        onHomeClick={() => router.push('/')}
        onCtaClick={() => router.push('/')}
        quota={quota}
        user={user}
        onSignOut={handleSignOut}
      />

      <section className="mx-auto w-full max-w-3xl px-5 pt-16 pb-24 sm:px-8 sm:pt-24">
        <p className="text-eyebrow text-accent">{t('eyebrow')}</p>
        <h1 className="mt-3 text-balance text-[32px] font-semibold tracking-tight text-text sm:text-[44px]">
          {t('title')}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] text-text-2 sm:text-[17px] text-body-rest">
          {t('subtitle')}
        </p>

        <div className="mt-10">
          <ByokKeyManager />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
