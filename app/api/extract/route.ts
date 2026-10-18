import { NextRequest, NextResponse } from 'next/server';
import { generateText, type UserModelMessage } from 'ai';
import { getModel, listProviders, resolveProviderAndModel } from '@/lib/providers';

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

async function ocrImage(buffer: Buffer, mediaType: string): Promise<string> {
  // Use whichever vision-capable provider is configured. Anthropic is preferred when available.
  const { provider, model } = resolveProviderAndModel();
  if (!provider.configured || !provider.capabilities.vision) {
    throw new Error('No vision-capable provider is configured for OCR. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY.');
  }

  const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const imageMediaType = supported.includes(mediaType) ? mediaType : 'image/jpeg';

  const messages: UserModelMessage[] = [
    {
      role: 'user',
      content: [
        { type: 'image', image: buffer, mediaType: imageMediaType },
        {
          type: 'text',
          text: 'Transcribe the full contract text visible in this image verbatim. Preserve section numbers, paragraph breaks, and formatting. Return ONLY the transcribed text — no commentary, no markdown, no JSON.',
        },
      ] as UserModelMessage['content'],
    },
  ];

  const response = await generateText({
    model: getModel(provider.id, model),
    messages,
    maxOutputTokens: 16000,
  });

  return response.text?.trim() || '';
}

async function ocrPdf(buffer: Buffer): Promise<string> {
  // Pick a provider that accepts PDFs natively (Anthropic, Google).
  const candidates = listProvidersForPdfOcr();
  if (candidates.length === 0) {
    throw new Error(
      'PDF text extraction failed (likely scanned), and no PDF-vision provider is configured. Set ANTHROPIC_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY for OCR fallback.'
    );
  }
  const { providerId, modelId } = candidates[0];

  const messages: UserModelMessage[] = [
    {
      role: 'user',
      content: [
        { type: 'file', data: buffer, mediaType: 'application/pdf' },
        {
          type: 'text',
          text: 'Transcribe the full contract text from this PDF verbatim. Preserve section numbers, paragraph breaks, and formatting. Return ONLY the transcribed text — no commentary, no markdown, no JSON.',
        },
      ] as UserModelMessage['content'],
    },
  ];

  const response = await generateText({
    model: getModel(providerId, modelId),
    messages,
    maxOutputTokens: 16000,
  });

  return response.text?.trim() || '';
}

function listProvidersForPdfOcr(): { providerId: 'anthropic' | 'google'; modelId: string }[] {
  return listProviders()
    .filter(p => p.configured && p.capabilities.native_pdf && (p.id === 'anthropic' || p.id === 'google'))
    .map(p => ({ providerId: p.id as 'anthropic' | 'google', modelId: p.default_model }));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || '';
    const fileName = file.name.toLowerCase();

    // PDF — try cheap text-layer parse first, fall back to model OCR for scanned PDFs.
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const fast = await extractPdfText(buffer);
      if (fast.trim().length > 0) {
        return NextResponse.json({ text: fast, source: 'pdf-parse' });
      }
      const ocrd = await ocrPdf(buffer);
      if (!ocrd) {
        return NextResponse.json(
          { error: 'Could not read text from the PDF, even with OCR. The file may be corrupt or empty.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ text: ocrd, source: 'pdf-ocr' });
    }

    // DOCX / DOC
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc')
    ) {
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || '').trim();
      if (!text) {
        return NextResponse.json({ error: 'Could not extract text from the Word document.' }, { status: 400 });
      }
      return NextResponse.json({ text, source: 'mammoth' });
    }

    // Images — OCR via vision model
    if (
      mimeType.startsWith('image/') ||
      ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.tiff'].some(ext => fileName.endsWith(ext))
    ) {
      const text = await ocrImage(buffer, mimeType);
      if (!text) {
        return NextResponse.json({ error: 'Could not read any text from the image.' }, { status: 400 });
      }
      return NextResponse.json({ text, source: 'vision-model' });
    }

    // Plain text / RTF / other
    const text = buffer.toString('utf-8').trim();
    if (!text) {
      return NextResponse.json({ error: 'File appears to be empty.' }, { status: 400 });
    }
    return NextResponse.json({ text, source: 'raw' });
  } catch (err) {
    console.error('Extract error:', err);
    const message = err instanceof Error ? err.message : 'Failed to extract text from file.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
