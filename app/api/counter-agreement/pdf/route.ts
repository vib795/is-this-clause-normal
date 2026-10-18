import { NextRequest, NextResponse } from 'next/server';
import { renderRevisedPdf, renderRedlinePdf } from '@/lib/counter-pdf';

interface PdfRequest {
  variant: 'revised' | 'redline';
  original_text: string;
  revised_text: string;
  generated_by?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PdfRequest;
    const { variant, original_text, revised_text, generated_by } = body;

    if (!revised_text || !revised_text.trim()) {
      return NextResponse.json({ error: 'revised_text is required.' }, { status: 400 });
    }
    if (variant === 'redline' && (!original_text || !original_text.trim())) {
      return NextResponse.json({ error: 'original_text is required for the redline variant.' }, { status: 400 });
    }

    const pdf =
      variant === 'redline'
        ? await renderRedlinePdf(original_text, revised_text, { generatedBy: generated_by })
        : await renderRevisedPdf(revised_text, { generatedBy: generated_by });

    const filename = variant === 'redline' ? 'counter-agreement-redline.pdf' : 'counter-agreement.pdf';

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
      },
    });
  } catch (err) {
    console.error('PDF render error:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate PDF.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
