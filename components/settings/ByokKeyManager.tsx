'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';

type Provider = 'anthropic' | 'openai' | 'google';

interface ByokRow {
  provider: Provider;
  key_preview: string;
  updated_at: string;
}

const PROVIDER_IDS: { id: Provider; sample: string }[] = [
  { id: 'anthropic', sample: 'sk-ant-api03-...' },
  { id: 'openai',    sample: 'sk-proj-...' },
  { id: 'google',    sample: 'AIza...' },
];

export function ByokKeyManager() {
  const t = useTranslations('byok');
  const [keys, setKeys] = useState<ByokRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/byok/keys', { cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json()).error || t('errorLoad'));
      const data = (await res.json()) as { keys: ByokRow[] };
      setKeys(data.keys);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const keyFor = (p: Provider) => keys.find(k => k.provider === p);

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-2xl border border-sev-red-stroke bg-sev-red-soft px-4 py-3 text-[13px] text-sev-red">
          {error}
        </div>
      )}
      {loading ? (
        <p className="text-[14px] text-text-3">{t('loading')}</p>
      ) : (
        PROVIDER_IDS.map(p => (
          <ProviderCard key={p.id} providerId={p.id} sample={p.sample} existing={keyFor(p.id)} onChange={load} />
        ))
      )}
    </div>
  );
}

interface ProviderCardProps {
  providerId: Provider;
  sample: string;
  existing?: ByokRow;
  onChange: () => void;
}

function ProviderCard({ providerId, sample, existing, onChange }: ProviderCardProps) {
  const t = useTranslations('byok');
  const tProv = useTranslations(`byok.providers.${providerId}`);
  const label = tProv('label');
  const help = tProv('help');

  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/byok/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, api_key: input.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('errSaveGeneric'));
      setInput('');
      setMsg({ type: 'ok', text: existing ? t('msgUpdated') : t('msgSaved') });
      onChange();
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : t('errSave') });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    if (!confirm(t('removeConfirm', { provider: label }))) return;
    setRemoving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/byok/keys?provider=${providerId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('errDeleteGeneric'));
      setMsg({ type: 'ok', text: t('msgRemoved') });
      onChange();
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : t('errDelete') });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div
      className="overflow-hidden rounded-2xl border border-stroke bg-elevated p-5 sm:p-6"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-semibold text-text">{label}</h3>
            {existing && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sev-green-stroke bg-sev-green-soft px-2 py-[2px] text-[11px] font-medium text-sev-green">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sev-green" />
                {t('active')}
              </span>
            )}
          </div>
          <p className="mt-1 text-[12.5px] text-text-3">{help}</p>
        </div>
        {existing && (
          <button
            type="button"
            onClick={remove}
            disabled={removing}
            className="rounded-full border border-stroke px-3 py-1.5 text-[12px] font-medium text-text-2 transition-colors duration-200 hover:bg-glass hover:text-text disabled:opacity-50"
          >
            {removing ? t('removing') : t('remove')}
          </button>
        )}
      </div>

      {existing && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-glass px-2.5 py-1 font-mono text-[12.5px] text-text-2">
          <span>{existing.key_preview}</span>
        </p>
      )}

      <form onSubmit={save} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <input
            type={reveal ? 'text' : 'password'}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={existing ? t('replacePlaceholder', { sample }) : sample}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-stroke bg-bg px-3.5 py-2.5 pr-16 font-mono text-[13px] text-text outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-4 focus:border-stroke-strong focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
          />
          <button
            type="button"
            onClick={() => setReveal(s => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-[11px] font-medium text-text-3 transition-colors duration-200 hover:text-text"
            tabIndex={-1}
          >
            {reveal ? t('hide') : t('show')}
          </button>
        </div>
        <button
          type="submit"
          disabled={saving || !input.trim()}
          className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-on-accent shadow-sm transition-[transform,opacity] duration-200 hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? t('saving') : existing ? t('replace') : t('save')}
        </button>
      </form>

      {msg && (
        <p
          className={[
            'mt-3 text-[12.5px]',
            msg.type === 'ok' ? 'text-sev-green' : 'text-sev-red',
          ].join(' ')}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
