import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { getModel, resolveProviderAndModel } from '@/lib/providers';
import type { AnalysisResult } from '@/lib/types';

// Counter-agreement drafting takes ~90s of model time on large contracts.
export const maxDuration = 300;

function getSystemPrompt(): string {
  return `You are a contract drafting assistant helping a freelancer/solo founder prepare a counter-proposal.

You will receive:
- The full ORIGINAL CONTRACT TEXT
- An ANALYSIS listing problematic findings and missing clauses

Your job is to produce a REVISED version of the contract that:
1. Replaces every red/yellow finding with the suggested fix (or industry-standard equivalent)
2. Adds every missing clause in an appropriate location
3. Preserves party names, dates, amounts, signature blocks, jurisdiction, and structural numbering wherever possible
4. Keeps untouched language verbatim — do not paraphrase clauses that don't need fixing
5. Uses plain, professional contract English

Return ONLY valid JSON (no markdown fences, no commentary) matching this exact schema:
{
  "revised_text": "<the complete revised contract as plain text with clear section numbering>",
  "change_summary": [
    {
      "section": "<section number/title affected, e.g. '4. NON-COMPETE'>",
      "change_type": "modified" | "added" | "removed",
      "rationale": "<one sentence explaining the change>"
    }
  ]
}

DISCLAIMER: The revised text is a suggested negotiation starting point produced by an AI pattern matcher. It is NOT legal advice and carries no warranty. The user assumes all responsibility for its use. Include a single short clause at the very end of revised_text labeled "DISCLAIMER:" stating this is a freelancer-prepared draft and both parties should consult legal counsel before signing.`;
}

interface CounterAgreementRequest {
  original_text: string;
  analysis: AnalysisResult;
  provider?: string;
  model?: string;
}

interface ChangeSummaryItem {
  section: string;
  change_type: 'modified' | 'added' | 'removed';
  rationale: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CounterAgreementRequest;
    const { original_text, analysis, provider: providerId, model: modelId } = body;

    if (!original_text || !original_text.trim()) {
      return NextResponse.json(
        { error: 'Original contract text is required to generate a counter-agreement.' },
        { status: 400 }
      );
    }
    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis is required to generate a counter-agreement.' },
        { status: 400 }
      );
    }

    const { provider, model } = resolveProviderAndModel(
      providerId || analysis.provider,
      modelId || analysis.model
    );
    if (!provider.configured) {
      return NextResponse.json(
        { error: `${provider.label} is not configured.` },
        { status: 400 }
      );
    }

    const userPrompt = [
      '=== ORIGINAL CONTRACT ===',
      original_text,
      '',
      '=== ANALYSIS ===',
      `Summary: ${analysis.summary}`,
      `Recommendation: ${analysis.recommendation}`,
      '',
      'Findings to address:',
      ...analysis.findings.map(
        (f, i) =>
          `${i + 1}. [${f.severity.toUpperCase()}] ${f.title}\n   Clause: ${f.clause_text}\n   Why: ${f.why_risky}\n   Suggested fix: ${f.suggested_fix}`
      ),
      '',
      'Missing clauses to add:',
      ...(analysis.missing_clauses || []).map(
        (m, i) => `${i + 1}. ${m.title}\n   Why: ${m.why_important}\n   Suggested language: ${m.suggested_language}`
      ),
      '',
      'Produce the revised contract and change summary as JSON.',
    ].join('\n');

    const response = await generateText({
      model: getModel(provider.id, model),
      system: getSystemPrompt(),
      messages: [{ role: 'user', content: userPrompt }],
      // 21000 is the non-streaming ceiling for Claude; keeps parity with the
      // iOS app and gives large contracts more room to be rewritten in full.
      maxOutputTokens: 21000,
    });

    if (response.finishReason === 'length') {
      return NextResponse.json(
        { error: 'Contract is too long for the model to rewrite in one pass. Try a smaller excerpt or a higher-context model.' },
        { status: 500 }
      );
    }

    const raw = response.text || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Model did not return a parseable JSON response. Try a different model.' },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      revised_text: string;
      change_summary: ChangeSummaryItem[];
    };

    return NextResponse.json({
      revised_text: parsed.revised_text,
      change_summary: parsed.change_summary || [],
      provider: provider.id,
      model,
    });
  } catch (err) {
    console.error('Counter-agreement error:', err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
