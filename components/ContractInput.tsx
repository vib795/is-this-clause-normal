'use client';

import { useState, useRef, DragEvent } from 'react';
import { SARVAM_LANGUAGES } from '@/lib/sarvam-languages';

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
  const [mode, setMode] = useState<'paste' | 'file'>('paste');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [languageCode, setLanguageCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const fd = new FormData();
    if (mode === 'file' && file) {
      fd.append('file', file);
    } else if (mode === 'paste' && text.trim()) {
      fd.append('text', text.trim());
    } else {
      return;
    }
    if (languageCode) {
      fd.append('language_code', languageCode);
    }
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

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-4 w-fit">
        <button
          onClick={() => setMode('paste')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'paste'
              ? 'bg-white/10 text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Paste text
        </button>
        <button
          onClick={() => setMode('file')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'file'
              ? 'bg-white/10 text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Upload file
        </button>
      </div>

      {mode === 'paste' ? (
        <>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste your contract text here..."
            className="w-full h-64 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-white/20 resize-none font-mono leading-relaxed"
          />
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs text-zinc-600">Try an example:</span>
            {SAMPLE_CONTRACTS.map(sample => (
              <button
                key={sample.label}
                onClick={() => setText(sample.text)}
                title={sample.description}
                className="text-xs text-zinc-500 hover:text-zinc-300 border border-white/10 hover:border-white/20 rounded-full px-2.5 py-0.5 transition-colors"
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
          className={`w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
            dragOver
              ? 'border-white/40 bg-white/5'
              : file
              ? 'border-emerald-700/60 bg-emerald-950/20'
              : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
          }`}
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
              <div className="text-2xl mb-2">
                {file.type.startsWith('image/') ? '🖼️' : file.name.endsWith('.pdf') ? '📄' : '📝'}
              </div>
              <p className="text-sm font-medium text-emerald-400">{file.name}</p>
              <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024).toFixed(0)} KB</p>
              <button
                onClick={e => { e.stopPropagation(); setFile(null); }}
                className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 underline"
              >
                Remove
              </button>
            </>
          ) : (
            <>
              <div className="text-3xl mb-3 opacity-40">📎</div>
              <p className="text-sm text-zinc-400 font-medium">
                Drop your contract here, or{' '}
                <span className="text-white underline">browse</span>
              </p>
              <p className="text-xs text-zinc-600 mt-2">
                PDF, Word, text, or image (screenshot) — up to 10MB
              </p>
            </>
          )}
        </div>
      )}

      {/* Language selector */}
      <div className="mt-4 flex flex-col gap-1.5">
        <label className="text-xs text-zinc-500">
          Contract language{' '}
          <span className="text-zinc-600">(optional — for Indian language contracts)</span>
        </label>
        <select
          value={languageCode}
          onChange={e => setLanguageCode(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-white/20 appearance-none cursor-pointer"
        >
          <option value="">English (default)</option>
          {Object.entries(SARVAM_LANGUAGES).map(([code, name]) => (
            <option key={code} value={code}>
              {name} ({code})
            </option>
          ))}
        </select>
        {languageCode && SARVAM_LANGUAGES[languageCode] && (
          <p className="text-xs text-zinc-500">
            Contract analyzed natively — summary returned in {SARVAM_LANGUAGES[languageCode]}
          </p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isLoading || disabled}
        className={`mt-4 w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
          canSubmit && !isLoading && !disabled
            ? 'bg-white text-black hover:bg-zinc-100 active:scale-[0.99]'
            : 'bg-white/10 text-zinc-500 cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
            Scanning for red flags...
          </span>
        ) : (
          'Scan Contract →'
        )}
      </button>

      <p className="text-center text-xs text-zinc-600 mt-3">
        Not legal advice — pattern matching only. Always consult a qualified attorney for legal decisions.
      </p>
    </div>
  );
}
