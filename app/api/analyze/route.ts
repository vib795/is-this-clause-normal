import { NextRequest, NextResponse } from 'next/server';
import { streamText, type UserModelMessage } from 'ai';

// Scans regularly run 2-3 minutes of model streaming; pin the function
// timeout so a project-level config change can't silently shorten it.
export const maxDuration = 300;
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { AnalysisResult, Finding, MissingClause } from '@/lib/types';
import { SARVAM_LANGUAGES, translateBatch } from '@/lib/sarvam';
import { getModel, resolveProviderAndModel, type ProviderInfo } from '@/lib/providers';
import {
  ANON_FREE_SCANS,
  buildAnonCookieHeader,
  computeAnonQuotaState,
  computeSignedInQuotaState,
  isSupabaseConfigured,
  readAnonCount,
} from '@/lib/quota';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { decryptApiKey } from '@/lib/byok-crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Prompt + content building (unchanged from non-streaming version)
// ─────────────────────────────────────────────────────────────────────────────

function getSystemPrompt(languageCode?: string): string {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  return `You are a contract clause pattern matcher for freelancers and solo founders. Your job is to identify clauses that are unusual, aggressive, or deviate from industry norms.

IMPORTANT: This is NOT legal advice — you are identifying patterns only.

Today's date is ${currentDate}. Use this to reason about recent legal developments (e.g., FTC non-compete guidance, California SB 699 effective 2024, GDPR enforcement trends) when flagging clauses.

Analyze the provided contract text across these 9 categories:

1. PAYMENT & FINANCIAL: Payment terms, timing, kill fees, late payment penalties, "pay when paid" clauses
2. INTELLECTUAL PROPERTY: Ownership transfer, portfolio rights, prior work, work-for-hire, background IP
3. RESTRICTIONS: Non-compete scope/duration, non-solicitation, confidentiality scope and duration
4. SCOPE & DELIVERABLES: Revision limits, deliverable definitions, change management, acceptance criteria
5. TERMINATION & EXIT: Notice periods, payment upon termination, kill fees, IP upon termination
6. LIABILITY & RISK: Liability caps, indemnification, insurance requirements, unlimited liability
7. DISPUTE RESOLUTION: Arbitration requirements, governing law, jurisdiction, mandatory mediation
8. DATA & PRIVACY: Data ownership, AI training usage rights, GDPR/CCPA applicability, breach notification, data retention/deletion rights
9. EXCLUSIVITY: Client exclusivity clauses, competitor restrictions, compensation for exclusivity, geographic/industry scope and duration

Severity levels:
- "red": Deal-breaker — extreme risk, unlimited liability, overbroad IP assignment including prior work, non-competes over 12 months, no payment protections, unlimited revisions, etc.
- "yellow": Worth negotiating — below industry standard but not extreme. E.g., vague payment terms, 6-12 month non-compete, IP transfer without portfolio rights, etc.
- "green": Acceptable or favorable to the freelancer — include these too so the user knows what's OK.

Negotiability levels (add to each finding):
- "high": Clients routinely accept edits on this — worth pushing back firmly
- "medium": Sometimes negotiable depending on client and deal size
- "low": Structural boilerplate the client rarely changes (e.g., governing law, arbitration clauses in large enterprise contracts)

Industry norms for context:
- Payment: Net 15-30, 50% deposit upfront, no "pay when paid", late fees allowed
- IP: Transfer after payment, freelancer retains prior work + portfolio rights
- Non-compete: Max 3-6 months, specific scope, reasonable geography
- Revisions: 2-3 rounds included, additional rounds billed separately
- Termination: 14-30 days notice, payment for completed work, 25% kill fee
- Liability: Capped at total contract value, no unlimited indemnification
- Dispute: Negotiation first, then arbitration, costs to losing party
- Data: Freelancer retains no client data after project; client cannot use work to train AI without explicit consent; GDPR/CCPA compliance responsibility clarified
- Exclusivity: Should be time-limited (project duration), compensated separately, narrowly scoped to direct competitors only

Jurisdiction-specific rules (apply when jurisdiction is detected):
- California: Non-competes are void under SB 699 (2024) — flag ANY non-compete clause as red regardless of duration
- EU/UK: GDPR requires data processing agreements — flag absence of DPA as red in data_privacy category
- Apply your knowledge of other jurisdiction-specific rules as appropriate

Also identify important protective clauses that are ABSENT from this contract. Flag missing:
- Payment schedule or deposit requirement
- IP ownership definition
- Limitation of liability
- Dispute resolution / governing law
- Freelancer's termination rights
- Confidentiality protection (protects freelancer too)

Detect the contract type and jurisdiction:
- contract_type: freelance_services | employment | saas | nda | vendor | other
- jurisdiction: the governing law/jurisdiction from the contract (e.g. "California, USA"), or "Unknown" if not specified

Return ONLY valid JSON (no markdown, no explanation) matching this exact schema:
{
  "overall_risk": "low" | "medium" | "high" | "critical",
  "risk_score": <integer 1-10>,
  "contract_type": "freelance_services" | "employment" | "saas" | "nda" | "vendor" | "other",
  "jurisdiction": "<governing law, e.g. 'California, USA' or 'Unknown'>",
  "summary": "<2-3 sentence plain English overview>",
  "recommendation": "<one clear action sentence>",
  "findings": [
    {
      "id": "finding-1",
      "category": "payment" | "ip" | "restrictions" | "scope" | "termination" | "liability" | "dispute" | "data_privacy" | "exclusivity",
      "severity": "red" | "yellow" | "green",
      "negotiability": "high" | "medium" | "low",
      "title": "<5-8 word descriptive title>",
      "clause_text": "<exact or paraphrased text from contract>",
      "why_risky": "<2-3 sentence plain English explanation>",
      "industry_standard": "<what the norm looks like>",
      "suggested_fix": "<specific replacement language or negotiation point>"
    }
  ],
  "missing_clauses": [
    {
      "id": "missing-1",
      "title": "<5-8 word title>",
      "why_important": "<2-3 sentences>",
      "suggested_language": "<simple starter clause>"
    }
  ]
}

Sort findings: red first, then yellow, then green.
Include both problematic AND acceptable clauses for a complete picture.
Use plain English — no legalese. Write for a smart non-lawyer.${
    languageCode && SARVAM_LANGUAGES[languageCode]
      ? `\n\nNOTE: The contract text is in ${SARVAM_LANGUAGES[languageCode]}. Read and analyze it directly in that language. Your JSON response must still be in English.`
      : ''
  }`;
}

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: Buffer; mediaType: string }
  | { type: 'file'; data: Buffer; mediaType: string };

async function buildUserContent(
  file: File | null,
  text: string | null,
  provider: ProviderInfo
): Promise<{ content: ContentPart[]; extractedText: string; ocrFromModel: boolean }> {
  if (text && !file) {
    return {
      content: [{ type: 'text', text: `Analyze the following contract text:\n\n---\n${text}\n---` }],
      extractedText: text,
      ocrFromModel: false,
    };
  }

  if (!file) {
    return { content: [], extractedText: '', ocrFromModel: false };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || '';
  const fileName = file.name.toLowerCase();

  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    if (provider.capabilities.native_pdf) {
      return {
        content: [
          { type: 'file', data: buffer, mediaType: 'application/pdf' },
          {
            type: 'text',
            text: 'This is a contract or legal agreement. Analyze it for red flags per your instructions. Also include the full verbatim contract text in the JSON response under an "extracted_text" field (preserve section numbering and paragraph breaks). Return only the JSON analysis.',
          },
        ],
        extractedText: await extractPdfText(buffer),
        ocrFromModel: true,
      };
    }
    const contractText = await extractPdfText(buffer);
    return {
      content: [
        { type: 'text', text: `Analyze the following contract text:\n\n---\n${contractText}\n---` },
      ],
      extractedText: contractText,
      ocrFromModel: false,
    };
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    fileName.endsWith('.docx') ||
    fileName.endsWith('.doc')
  ) {
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ buffer });
    const contractText = result.value;
    return {
      content: [
        { type: 'text', text: `Analyze the following contract text:\n\n---\n${contractText}\n---` },
      ],
      extractedText: contractText,
      ocrFromModel: false,
    };
  }

  if (
    mimeType.startsWith('image/') ||
    ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.tiff'].some(ext =>
      fileName.endsWith(ext)
    )
  ) {
    if (!provider.capabilities.vision) {
      throw new Error(
        `${provider.label} does not support image contracts. Pick a provider with vision (Anthropic, OpenAI, Google) or paste the text.`
      );
    }
    const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const imageMediaType = supportedImageTypes.includes(mimeType) ? mimeType : 'image/jpeg';
    return {
      content: [
        { type: 'image', image: buffer, mediaType: imageMediaType },
        {
          type: 'text',
          text: 'This image contains a contract or legal agreement. Read all the text in the image and analyze it for red flags per your instructions. Also include the full verbatim contract text you read from the image in the JSON response under an "extracted_text" field (preserve section numbering and paragraph breaks). Return only the JSON analysis.',
        },
      ],
      extractedText: '',
      ocrFromModel: true,
    };
  }

  const contractText = buffer.toString('utf-8');
  return {
    content: [
      { type: 'text', text: `Analyze the following contract text:\n\n---\n${contractText}\n---` },
    ],
    extractedText: contractText,
    ocrFromModel: false,
  };
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const mod = await import('pdf-parse');
    const pdfParse = (mod as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default;
    const result = await pdfParse(buffer);
    return result.text || '';
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST handler — streams Server-Sent Events.
//
// Event types:
//   { type: 'progress', category: string }   — a new category appeared in the LLM output
//   { type: 'phase',    phase: 'analyzing' | 'translating' | 'finalizing' }
//   { type: 'result',   data:  AnalysisResult } — final, after Sarvam + OCR capture
//   { type: 'error',    message: string }    — terminal error inside the stream
//
// Validation errors before the stream starts (missing input, provider not
// configured, etc.) are returned as a regular JSON 400 so the client can
// surface them without needing to read the stream.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const text = formData.get('text') as string | null;
  const languageCode = (formData.get('language_code') as string | null) || '';
  const providerId = (formData.get('provider') as string | null) || '';
  const modelId = (formData.get('model') as string | null) || '';

  if ((!file || file.size === 0) && !text?.trim()) {
    return NextResponse.json({ error: 'No contract content provided.' }, { status: 400 });
  }

  // Resolve provider first — we need it to look up the user's BYOK key (if any)
  // before deciding whether to enforce the free-tier quota.
  const { provider, model } = resolveProviderAndModel(providerId, modelId);

  // ── Auth lookup ───────────────────────────────────────────────────────────
  let supabase: SupabaseClient | null = null;
  let user: User | null = null;
  if (isSupabaseConfigured()) {
    try {
      supabase = await createSupabaseClient();
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      user = u;
    } catch (err) {
      console.error('Analyze: supabase init failed, treating as anon', err);
      supabase = null;
      user = null;
    }
  }

  // ── BYOK lookup for the selected provider ────────────────────────────────
  // If the signed-in user has a stored key for the provider they picked,
  // we use that key, mark the scan byok=true, and bypass quota entirely
  // (the scan is on their dime).
  let byokKey: string | null = null;
  if (user && supabase && provider.id !== 'ollama') {
    const { data: row } = await supabase
      .from('byok_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .eq('provider', provider.id)
      .maybeSingle();
    if (row?.encrypted_key) {
      try {
        byokKey = decryptApiKey(row.encrypted_key);
      } catch (err) {
        console.error('BYOK decrypt failed', err);
        return NextResponse.json(
          {
            error:
              'Your stored API key could not be decrypted (server key may have changed). Please re-enter it in Settings.',
          },
          { status: 500 }
        );
      }
    }
  }

  // ── Quota gate (skipped when BYOK present) ───────────────────────────────
  let setCookieHeader: string | null = null;
  const useByok = !!byokKey;
  if (!useByok) {
    if (user && supabase) {
      const { count } = await supabase
        .from('scans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('byok', false);
      const signedInState = computeSignedInQuotaState({
        usedCount: count ?? 0,
        hasByokKey: false,
      });
      if (signedInState.exhausted) {
        return NextResponse.json(
          {
            error: `You’ve used your free scans. Add a ${provider.label} API key in Settings to keep going.`,
            code: 'QUOTA_EXHAUSTED',
            quota: signedInState,
          },
          { status: 402 }
        );
      }
    } else {
      const anonUsed = readAnonCount(request);
      const anonState = computeAnonQuotaState(anonUsed);
      if (anonState.exhausted) {
        return NextResponse.json(
          {
            error:
              'You’ve used your free scan. Sign in for 2 more free scans, or bring your own API key.',
            code: 'QUOTA_EXHAUSTED',
            quota: anonState,
          },
          { status: 402 }
        );
      }
      setCookieHeader = buildAnonCookieHeader(
        Math.min(anonUsed + 1, ANON_FREE_SCANS)
      );
    }
  }

  // Without BYOK, the operator must have a key for the chosen provider.
  // With BYOK, the user's key replaces the operator's so provider.configured is moot.
  if (!useByok && !provider.configured) {
    return NextResponse.json(
      { error: `${provider.label} is not configured. Add the required API key to .env.local and restart.` },
      { status: 400 }
    );
  }

  let content: ContentPart[];
  let extractedText: string;
  let ocrFromModel: boolean;
  try {
    ({ content, extractedText, ocrFromModel } = await buildUserContent(
      file && file.size > 0 ? file : null,
      text || null,
      provider
    ));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not prepare contract for analysis.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (content.length === 0) {
    return NextResponse.json(
      { error: 'Could not extract text from the provided file.' },
      { status: 400 }
    );
  }

  const messages: UserModelMessage[] = [
    { role: 'user', content: content as UserModelMessage['content'] },
  ];

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, payload: unknown) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        send(controller, { type: 'phase', phase: 'analyzing' });

        const result = streamText({
          model: getModel(provider.id, model, byokKey ?? undefined),
          system: getSystemPrompt(languageCode || undefined),
          messages,
          maxOutputTokens: 16000,
        });

        // As tokens arrive, scan the accumulating buffer and emit several
        // honest progress signals so the UI can reflect what's really happening:
        //
        //   - 'progress' fires whenever the LATEST category mention changes.
        //     The client uses this for both "which category is being written
        //     now" (spinner) and "which categories are done" (green check).
        //   - 'section' fires when the model leaves findings[] and enters
        //     missing_clauses[] — lets the UI flip every category to done.
        //   - 'tick' fires when finding/missing counts change (debounced) —
        //     drives the live "X findings · Y missing" counter chip.
        let buffer = '';
        const categoryRe = /"category"\s*:\s*"(\w+)"/g;
        const findingIdRe = /"id"\s*:\s*"finding-/g;
        const missingIdRe = /"id"\s*:\s*"missing-/g;
        let lastEmittedCategory: string | null = null;
        let lastFindings = 0;
        let lastMissing = 0;
        let lastTickAt = 0;
        let sawMissingSection = false;
        let scanCursor = 0;

        for await (const chunk of result.textStream) {
          buffer += chunk;

          // Section transition: missing_clauses array opened.
          if (!sawMissingSection && /"missing_clauses"\s*:\s*\[/.test(buffer)) {
            sawMissingSection = true;
            send(controller, { type: 'section', section: 'missing_clauses' });
          }

          // Category events — every change of "latest category" emits one.
          categoryRe.lastIndex = scanCursor;
          let m: RegExpExecArray | null;
          while ((m = categoryRe.exec(buffer)) !== null) {
            const cat = m[1];
            scanCursor = m.index + m[0].length;
            if (cat !== lastEmittedCategory) {
              lastEmittedCategory = cat;
              send(controller, { type: 'progress', category: cat });
            }
          }

          // Counter chip — debounce to ~250ms so we don't spam SSE frames.
          const now = Date.now();
          if (now - lastTickAt > 250) {
            const f = (buffer.match(findingIdRe) || []).length;
            const mc = (buffer.match(missingIdRe) || []).length;
            if (f !== lastFindings || mc !== lastMissing) {
              lastFindings = f;
              lastMissing = mc;
              lastTickAt = now;
              send(controller, { type: 'tick', findings: f, missing: mc });
            }
          }
        }

        // Final count so the chip is accurate at the end of the stream.
        const finalFindings = (buffer.match(findingIdRe) || []).length;
        const finalMissing = (buffer.match(missingIdRe) || []).length;
        if (finalFindings !== lastFindings || finalMissing !== lastMissing) {
          send(controller, { type: 'tick', findings: finalFindings, missing: finalMissing });
        }

        const finishReason = await result.finishReason;
        if (finishReason === 'length') {
          send(controller, {
            type: 'error',
            message: 'Contract is too large to analyze fully. Try pasting a specific section or shorter excerpt.',
          });
          controller.close();
          return;
        }

        const jsonMatch = buffer.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          send(controller, { type: 'error', message: 'Failed to parse analysis response. Please try again.' });
          controller.close();
          return;
        }

        let analysis: Record<string, unknown>;
        try {
          analysis = JSON.parse(jsonMatch[0]);
        } catch {
          send(controller, { type: 'error', message: 'Model returned malformed JSON. Please retry.' });
          controller.close();
          return;
        }

        // Sarvam: localize every model-written text field when an Indic language
        // was picked. clause_text is excluded because it's verbatim from the
        // source contract (already in the user's language). All other fields
        // are model-generated English and the user picked an Indic language
        // for a reason.
        if (languageCode && SARVAM_LANGUAGES[languageCode]) {
          send(controller, { type: 'phase', phase: 'translating' });
          try {
            const findings = (analysis.findings as Finding[]) || [];
            const missings = (analysis.missing_clauses as MissingClause[]) || [];

            const FINDING_FIELDS = ['title', 'why_risky', 'industry_standard', 'suggested_fix'] as const;
            const MISSING_FIELDS = ['title', 'why_important', 'suggested_language'] as const;
            type FindingField = (typeof FINDING_FIELDS)[number];
            type MissingField = (typeof MISSING_FIELDS)[number];
            type Placement =
              | { kind: 'top'; field: 'summary' | 'recommendation' }
              | { kind: 'finding'; idx: number; field: FindingField }
              | { kind: 'missing'; idx: number; field: MissingField };

            const inputs: string[] = [];
            const placements: Placement[] = [];

            for (const field of ['summary', 'recommendation'] as const) {
              const v = analysis[field];
              if (typeof v === 'string' && v.length > 0) {
                inputs.push(v);
                placements.push({ kind: 'top', field });
              }
            }
            findings.forEach((f, idx) => {
              for (const field of FINDING_FIELDS) {
                const v = f[field];
                if (typeof v === 'string' && v.length > 0) {
                  inputs.push(v);
                  placements.push({ kind: 'finding', idx, field });
                }
              }
            });
            missings.forEach((m, idx) => {
              for (const field of MISSING_FIELDS) {
                const v = m[field];
                if (typeof v === 'string' && v.length > 0) {
                  inputs.push(v);
                  placements.push({ kind: 'missing', idx, field });
                }
              }
            });

            const translated = await translateBatch(inputs, languageCode);
            translated.forEach((value, i) => {
              const p = placements[i];
              if (p.kind === 'top') {
                analysis[p.field] = value;
              } else if (p.kind === 'finding') {
                findings[p.idx][p.field] = value;
              } else {
                missings[p.idx][p.field] = value;
              }
            });
            analysis.findings = findings;
            analysis.missing_clauses = missings;
          } catch (err) {
            // Translation failure is non-fatal — keep the English copy and continue.
            console.error('Sarvam translation failed:', err);
          }
        }

        send(controller, { type: 'phase', phase: 'finalizing' });

        // Prefer the model's verbatim transcript when it OCR'd an image / native PDF.
        const modelExtractedText =
          ocrFromModel && typeof analysis.extracted_text === 'string'
            ? (analysis.extracted_text as string)
            : '';
        const finalContractText = modelExtractedText || extractedText || text || '';
        delete analysis.extracted_text;

        const textForSnippet = text || finalContractText || (file ? file.name : '') || '';

        const finalResult: AnalysisResult = {
          ...(analysis as unknown as AnalysisResult),
          missing_clauses: (analysis.missing_clauses as AnalysisResult['missing_clauses']) || [],
          analyzed_at: new Date().toISOString(),
          contract_snippet: textForSnippet.slice(0, 250).trim() || `File: ${file?.name || 'uploaded'}`,
          contract_text: finalContractText,
          provider: provider.id,
          model,
          ...(languageCode && SARVAM_LANGUAGES[languageCode] ? { input_language: languageCode } : {}),
        };

        // Persist the scan for signed-in users — drives quota counting and
        // (in Slice C polish) replaces localStorage history. Non-fatal on
        // failure: the user still sees their result; only DB history is lost.
        if (user && supabase) {
          try {
            await supabase.from('scans').insert({
              user_id: user.id,
              provider: provider.id,
              model,
              overall_risk: finalResult.overall_risk,
              risk_score: finalResult.risk_score,
              contract_type: finalResult.contract_type,
              jurisdiction: finalResult.jurisdiction,
              contract_snippet: finalResult.contract_snippet,
              result_json: finalResult,
              byok: useByok,
            });
          } catch (err) {
            console.error('Failed to insert scan row:', err);
          }
        }

        send(controller, { type: 'result', data: finalResult });
        controller.close();
      } catch (err) {
        console.error('Analysis stream error:', err);
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        try {
          send(controller, { type: 'error', message });
        } catch {
          // Client already disconnected.
        }
        controller.close();
      }
    },
  });

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Hint to Vercel + various proxies not to buffer the response.
    'X-Accel-Buffering': 'no',
  };
  // Anon quota commit — only set when we used the cookie path. Signed-in
  // users have their scans counted via DB rows instead. If the stream errors
  // mid-flight the anon user has still "spent" their free scan; the trade-off
  // favors simplicity until Slice D moves anon counting to Upstash too.
  if (setCookieHeader) responseHeaders['Set-Cookie'] = setCookieHeader;

  return new Response(stream, { headers: responseHeaders });
}
