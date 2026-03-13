import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AnalysisResult } from '@/lib/types';
import { SARVAM_LANGUAGES, translateToLanguage } from '@/lib/sarvam';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

type TextBlock = { type: 'text'; text: string };
type ImageBlock = {
  type: 'image';
  source: { type: 'base64'; media_type: string; data: string };
};
type DocumentBlock = {
  type: 'document';
  source: { type: 'base64'; media_type: string; data: string };
};
type MessageContentBlock = TextBlock | ImageBlock | DocumentBlock;

async function buildMessageContent(file: File | null, text: string | null): Promise<MessageContentBlock[]> {
  const content: MessageContentBlock[] = [];

  if (text && !file) {
    content.push({
      type: 'text',
      text: `Analyze the following contract text:\n\n---\n${text}\n---`,
    });
    return content;
  }

  if (!file) return content;

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mimeType = file.type || '';
  const fileName = file.name.toLowerCase();

  // PDF — use Claude's native document support
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
    } as DocumentBlock);
    content.push({
      type: 'text',
      text: 'This is a contract or legal agreement. Analyze it for red flags per your instructions. Return only the JSON analysis.',
    });
    return content;
  }

  // DOCX — extract text server-side via mammoth
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    fileName.endsWith('.docx') ||
    fileName.endsWith('.doc')
  ) {
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ buffer });
    const contractText = result.value;
    content.push({
      type: 'text',
      text: `Analyze the following contract text:\n\n---\n${contractText}\n---`,
    });
    return content;
  }

  // Images — use Claude Vision
  if (
    mimeType.startsWith('image/') ||
    ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.tiff'].some(ext =>
      fileName.endsWith(ext)
    )
  ) {
    const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const imageMediaType = supportedImageTypes.includes(mimeType) ? mimeType : 'image/jpeg';
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: imageMediaType, data: base64 },
    });
    content.push({
      type: 'text',
      text: 'This image contains a contract or legal agreement. Read all the text in the image and analyze it for red flags per your instructions. Return only the JSON analysis.',
    });
    return content;
  }

  // Plain text / RTF / other
  const contractText = buffer.toString('utf-8');
  content.push({
    type: 'text',
    text: `Analyze the following contract text:\n\n---\n${contractText}\n---`,
  });
  return content;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const text = formData.get('text') as string | null;
    const languageCode = (formData.get('language_code') as string | null) || '';

    if ((!file || file.size === 0) && !text?.trim()) {
      return NextResponse.json({ error: 'No contract content provided.' }, { status: 400 });
    }

    const messageContent = await buildMessageContent(
      file && file.size > 0 ? file : null,
      text || null
    );

    if (messageContent.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract text from the provided file.' },
        { status: 400 }
      );
    }

    const response = await client.messages.create({
      model: (process.env.CLAUDE_MODEL || 'claude-sonnet-4-6') as string,
      max_tokens: 16000,
      system: getSystemPrompt(languageCode || undefined),
      messages: [{ role: 'user', content: messageContent as Anthropic.MessageParam['content'] }],
    });

    if (response.stop_reason === 'max_tokens') {
      return NextResponse.json(
        { error: 'Contract is too large to analyze fully. Try pasting a specific section or shorter excerpt.' },
        { status: 500 }
      );
    }

    const rawOutput = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response (handle any accidental markdown wrapping)
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Failed to parse analysis response. Please try again.' },
        { status: 500 }
      );
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Translate summary and recommendation to the selected Indian language
    if (languageCode && SARVAM_LANGUAGES[languageCode]) {
      const [localizedSummary, localizedRecommendation] = await Promise.all([
        translateToLanguage(analysis.summary, languageCode),
        translateToLanguage(analysis.recommendation, languageCode),
      ]);
      analysis.summary = localizedSummary;
      analysis.recommendation = localizedRecommendation;
    }

    // Build a snippet for history display
    const textForSnippet =
      text ||
      (file ? file.name : '') ||
      '';

    const result: AnalysisResult = {
      ...analysis,
      missing_clauses: analysis.missing_clauses || [],
      analyzed_at: new Date().toISOString(),
      contract_snippet: textForSnippet.slice(0, 250).trim() || `File: ${file?.name || 'uploaded'}`,
      ...(languageCode && SARVAM_LANGUAGES[languageCode] ? { input_language: languageCode } : {}),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('Analysis error:', err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
