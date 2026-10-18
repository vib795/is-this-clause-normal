'use client';

import { useState, useRef, useEffect, DragEvent } from 'react';
import { useTranslations } from 'next-intl';
import { SARVAM_LANGUAGES } from '@/lib/sarvam-languages';

interface ProviderOption {
  id: string;
  label: string;
  default_model: string;
  models: string[];
  capabilities: { vision: boolean; native_pdf: boolean };
  configured: boolean;
}

const PROVIDER_PREF_KEY = 'clause-scanner-provider';
const MODEL_PREF_KEY = 'clause-scanner-model';

const SAMPLE_CONTRACTS = [
  {
    label: 'Bare Bones',
    description: 'Minimal contract missing most protective clauses',
    text: `SERVICES AGREEMENT

This Agreement is entered into between Client ("Client") and Contractor ("Contractor").

1. SERVICES
Contractor agrees to provide services as requested by Client from time to time.

2. PAYMENT
Client pays Contractor a flat fee for services rendered. Payment will be made after work is completed.

3. TERM
This Agreement begins on the date signed and continues until either party wishes to end it.

4. GENERAL
This Agreement represents the entire understanding between the parties.

Client Signature: _________________  Date: _______
Contractor Signature: _____________  Date: _______`,
  },
  {
    label: 'California Non-Compete',
    description: 'California contract with a non-compete clause',
    text: `FREELANCE SERVICES AGREEMENT

This Agreement is made between TechCorp Inc. ("Client"), a Delaware corporation, and the undersigned freelancer ("Contractor").

1. SERVICES
Contractor will provide software development services as outlined in project briefs provided by Client.

2. COMPENSATION
Contractor will be paid $150/hour, invoiced monthly, due net-30.

3. INTELLECTUAL PROPERTY
All work product created under this Agreement shall be considered work-for-hire and assigned exclusively to Client upon full payment.

4. NON-COMPETE
For a period of 12 months following termination of this Agreement, Contractor shall not provide services to any competitor of Client, nor engage in any business activity that competes with Client's products or services.

5. CONFIDENTIALITY
Contractor agrees to maintain strict confidentiality regarding all Client proprietary information.

6. GOVERNING LAW
This Agreement shall be governed by the laws of the State of California. Disputes shall be resolved in the courts of San Francisco County, California.

7. TERMINATION
Either party may terminate this Agreement with 30 days written notice.

Client: TechCorp Inc.          Contractor: _______________`,
  },
  {
    label: 'AI Training Clause',
    description: 'Contract permitting use of work to train AI models',
    text: `CREATIVE SERVICES AGREEMENT

This Agreement is entered into between DesignHub LLC ("Client") and the undersigned creative professional ("Contractor").

1. SCOPE OF WORK
Contractor will provide graphic design, copywriting, and content creation services as directed by Client.

2. FEES
Contractor will be compensated at $75/hour for all approved work. Invoices submitted bi-weekly, payable within 14 days.

3. DELIVERABLES & OWNERSHIP
Upon receipt of full payment, all deliverables, including but not limited to designs, written content, imagery, and associated files, shall become the sole property of Client.

4. DATA & AI TRAINING RIGHTS
Contractor acknowledges and agrees that Client may use all deliverables, interim work product, project data, usage patterns, creative iterations, and any data generated during the course of this engagement to train, fine-tune, or improve artificial intelligence and machine learning models, systems, or products, without additional compensation or notice to Contractor.

5. REVISIONS
Client is entitled to unlimited revisions within the project scope.

6. TERM & TERMINATION
This Agreement is effective upon signing and may be terminated by either party with 14 days written notice.

7. GOVERNING LAW
This Agreement shall be governed by the laws of the State of New York.`,
  },
  {
    label: 'Exclusivity Trap',
    description: '24-month uncompensated exclusivity clause',
    text: `CONSULTING AGREEMENT

This Consulting Agreement ("Agreement") is made between Apex Solutions Group ("Company") and the undersigned independent consultant ("Consultant").

1. SERVICES
Consultant will provide strategic business consulting, market analysis, and advisory services to Company as requested.

2. COMPENSATION
Consultant will receive $5,000 per month for up to 20 hours of services. Additional hours billed at $250/hour.

3. EXCLUSIVITY
During the term of this Agreement and for a period of 24 months following its termination, Consultant agrees not to provide consulting, advisory, or any professional services to any company, entity, or individual operating in the same industry as Company, including any direct or indirect competitors, anywhere in the world. This exclusivity obligation applies regardless of whether Consultant's proposed work would involve any of the same subject matter or clients as work performed for Company. No additional compensation shall be provided for this exclusivity obligation.

4. INTELLECTUAL PROPERTY
All work product, analyses, reports, and recommendations created under this Agreement are work-for-hire and the exclusive property of Company.

5. TERM
This Agreement commences on the signing date and continues for 12 months, automatically renewing unless terminated with 60 days written notice.

6. GOVERNING LAW
This Agreement shall be governed by the laws of the State of Texas.`,
  },
];

interface ContractInputProps {
  onAnalyze: (formData: FormData) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.txt,.rtf,.jpg,.jpeg,.png,.gif,.webp,.heic,.bmp,.tiff';
const ACCEPTED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/rtf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/bmp',
  'image/tiff',
];

export default function ContractInput({ onAnalyze, isLoading, disabled }: ContractInputProps) {
  const t = useTranslations('scan');
  const [mode, setMode] = useState<'paste' | 'file'>('paste');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [languageCode, setLanguageCode] = useState('');
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [providerId, setProviderId] = useState<string>('');
  const [modelId, setModelId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/providers')
      .then(r => r.json())
      .then((data: { providers: ProviderOption[] }) => {
        const list = data.providers || [];
        setProviders(list);

        const savedProvider = typeof window !== 'undefined' ? localStorage.getItem(PROVIDER_PREF_KEY) : null;
        const savedModel = typeof window !== 'undefined' ? localStorage.getItem(MODEL_PREF_KEY) : null;

        const configured = list.filter(p => p.configured);
        const initial =
          (savedProvider && list.find(p => p.id === savedProvider && p.configured)) ||
          configured[0] ||
          list[0];

        if (initial) {
          setProviderId(initial.id);
          const modelOk = savedModel && initial.models.includes(savedModel) ? savedModel : initial.default_model;
          setModelId(modelOk);
        }
      })
      .catch(() => { /* server falls back to defaults */ });
  }, []);

  const currentProvider = providers.find(p => p.id === providerId);

  const handleProviderChange = (id: string) => {
    setProviderId(id);
    const p = providers.find(x => x.id === id);
    if (p) {
      setModelId(p.default_model);
      localStorage.setItem(PROVIDER_PREF_KEY, id);
      localStorage.setItem(MODEL_PREF_KEY, p.default_model);
    }
  };

  const handleModelChange = (id: string) => {
    setModelId(id);
    localStorage.setItem(MODEL_PREF_KEY, id);
  };

  const handleSubmit = () => {
    const fd = new FormData();
    if (mode === 'file' && file) {
      fd.append('file', file);
    } else if (mode === 'paste' && text.trim()) {
      fd.append('text', text.trim());
    } else {
      return;
    }
    if (languageCode) fd.append('language_code', languageCode);
    if (providerId) fd.append('provider', providerId);
    if (modelId) fd.append('model', modelId);
    onAnalyze(fd);
  };

  const handleFile = (f: File) => {
    const ext = f.name.toLowerCase().split('.').pop() || '';
    const validExt = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp', 'tiff'];
    if (!ACCEPTED_MIME.includes(f.type) && !validExt.includes(ext)) {
      alert('Unsupported file type. Please upload PDF, Word, text, or image files.');
      return;
    }
    setFile(f);
    setMode('file');
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const canSubmit = mode === 'paste' ? text.trim().length > 50 : !!file;

  const isImage = file?.type.startsWith('image/');
  const isPdf = file?.name.toLowerCase().endsWith('.pdf') || file?.type === 'application/pdf';
  const visionWarning =
    isImage && currentProvider && !currentProvider.capabilities.vision
      ? t('warnNoVision', { label: currentProvider.label })
      : null;
  const pdfWarning =
    isPdf && currentProvider && !currentProvider.capabilities.native_pdf
      ? t('warnNoPdf', { label: currentProvider.label })
      : null;

  return (
    <div className="w-full">
      <div
        className="relative overflow-hidden rounded-3xl border border-stroke bg-elevated"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-stroke px-4 py-3 sm:px-6">
          <div className="inline-flex gap-1 rounded-full bg-glass p-1">
            <TabButton active={mode === 'paste'} onClick={() => setMode('paste')}>{t('tabPaste')}</TabButton>
            <TabButton active={mode === 'file'} onClick={() => setMode('file')}>{t('tabUpload')}</TabButton>
          </div>
          <p className="hidden text-[12px] text-text-3 sm:block">
            {t('supportedFormats')}
          </p>
        </div>

        {/* Input surface */}
        <div className="p-4 sm:p-6">
          {mode === 'paste' ? (
            <>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={t('pasteePlaceholder')}
                spellCheck={false}
                className="w-full h-64 sm:h-72 resize-none rounded-2xl border border-stroke bg-bg p-4 font-mono text-[13px] leading-relaxed text-text placeholder:text-text-4 transition-colors duration-200 focus:border-stroke-strong focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[12px] text-text-3">{t('trySample')}</span>
                {SAMPLE_CONTRACTS.map(sample => (
                  <button
                    key={sample.label}
                    onClick={() => setText(sample.text)}
                    title={sample.description}
                    className="rounded-full border border-stroke px-2.5 py-0.5 text-[12px] text-text-2 transition-[background-color,color,border-color] duration-200 hover:border-stroke-strong hover:text-text"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={[
                'flex h-64 sm:h-72 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-[background-color,border-color] duration-200',
                dragOver
                  ? 'border-accent bg-accent-soft'
                  : file
                  ? 'border-sev-green-stroke bg-sev-green-soft'
                  : 'border-stroke bg-bg hover:border-stroke-strong hover:bg-glass',
              ].join(' ')}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {file ? (
                <>
                  <FileGlyph kind={file.type.startsWith('image/') ? 'image' : file.name.endsWith('.pdf') ? 'pdf' : 'doc'} />
                  <p className="mt-3 text-[14px] font-medium text-sev-green">{file.name}</p>
                  <p className="mt-0.5 text-[12px] text-text-3">{(file.size / 1024).toFixed(0)} KB</p>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null); }}
                    className="mt-4 text-[12px] text-text-3 underline-offset-2 transition-colors duration-200 hover:text-text hover:underline"
                  >
                    {t('fileRemove')}
                  </button>
                </>
              ) : (
                <>
                  <FileGlyph kind="empty" />
                  <p className="mt-3 text-[14px] text-text">
                    {t('fileDropHint')} <span className="underline underline-offset-2">{t('fileBrowse')}</span>
                  </p>
                  <p className="mt-1 text-[12px] text-text-3">{t('fileFormats')}</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Provider · Model · Language */}
        <div className="border-t border-stroke bg-glass px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FieldSelect
              label={t('fieldProvider')}
              value={providerId}
              onChange={handleProviderChange}
              options={providers.length === 0
                ? [{ value: '', label: t('providerLoading'), disabled: true }]
                : providers.map(p => ({
                    value: p.id,
                    label: p.configured ? p.label : t('providerNotConfigured', { label: p.label }),
                    disabled: !p.configured,
                  }))
              }
            />
            <FieldSelect
              label={t('fieldModel')}
              value={modelId}
              onChange={handleModelChange}
              options={(currentProvider?.models || []).map(m => ({ value: m, label: m }))}
            />
            <FieldSelect
              label={t('fieldLanguage')}
              value={languageCode}
              onChange={setLanguageCode}
              options={[
                { value: '', label: t('languageEnglish') },
                ...Object.entries(SARVAM_LANGUAGES).map(([code, name]) => ({
                  value: code,
                  label: `${name} (${code})`,
                })),
              ]}
            />
          </div>
          {(visionWarning || pdfWarning) && (
            <p className="mt-3 text-[12px]" style={{ color: visionWarning ? 'var(--severity-yellow)' : 'var(--text-secondary)' }}>
              {visionWarning || pdfWarning}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="border-t border-stroke px-4 py-4 sm:px-6">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading || disabled || !!visionWarning}
            className={[
              'group inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-[15px] font-semibold transition-[background-color,transform,color] duration-200',
              canSubmit && !isLoading && !disabled && !visionWarning
                ? 'bg-accent text-on-accent shadow-[var(--shadow-accent)] hover:bg-accent-hover active:scale-[0.98]'
                : 'bg-glass text-text-3 cursor-not-allowed',
            ].join(' ')}
          >
            {isLoading ? (
              <>
                <Spinner /> {t('submitLoading')}
              </>
            ) : (
              <>
                {t('submitIdle')}
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
              </>
            )}
          </button>
          <p className="mt-3 text-center text-[12px] text-text-3">
            {t('submitDisclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-[background-color,color] duration-200',
        active ? 'bg-elevated text-text shadow-sm' : 'text-text-2 hover:text-text',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function FieldSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-text-3">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-stroke bg-bg px-3 py-2 pr-9 text-[13.5px] text-text transition-colors duration-200 focus:border-stroke-strong focus:outline-none"
        >
          {options.map(o => (
            <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-3">
          ⌄
        </span>
      </div>
    </label>
  );
}

function FileGlyph({ kind }: { kind: 'pdf' | 'doc' | 'image' | 'empty' }) {
  const label = kind === 'pdf' ? 'PDF' : kind === 'doc' ? 'DOC' : kind === 'image' ? 'IMG' : '+';
  return (
    <span
      aria-hidden
      className={[
        'inline-flex h-12 w-10 items-center justify-center rounded-md text-[10px] font-bold tracking-wider',
        kind === 'empty'
          ? 'border border-dashed border-stroke-strong text-text-3'
          : 'bg-elevated text-text shadow-sm',
      ].join(' ')}
    >
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
      style={{ animation: 'spin 0.9s linear infinite' }}
    >
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </span>
  );
}
