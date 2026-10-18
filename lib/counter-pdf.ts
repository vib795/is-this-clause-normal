import PDFDocument from 'pdfkit';
import { diffLines } from 'diff';

const DISCLAIMER =
  'AI-generated draft for negotiation purposes only. Not legal advice. No warranty is offered or implied. ' +
  'The user assumes all responsibility for its use. Both parties should consult qualified legal counsel before signing.';

function streamToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function writeHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string) {
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#000').text(title);
  if (subtitle) {
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9).fillColor('#666').text(subtitle);
  }
  doc.moveDown(0.5);
  const y = doc.y;
  doc.strokeColor('#ddd').lineWidth(0.5).moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();
  doc.moveDown(0.7);
}

function writeFooterOnEveryPage(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.height - doc.page.margins.bottom + 10;
    doc.font('Helvetica-Oblique').fontSize(7).fillColor('#888');
    doc.text(DISCLAIMER, doc.page.margins.left, bottom, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      align: 'left',
      lineGap: 1,
    });
  }
}

export async function renderRevisedPdf(revisedText: string, meta?: { generatedBy?: string }): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 56, bottom: 72, left: 56, right: 56 },
    bufferPages: true,
  });
  const resultPromise = streamToBuffer(doc);

  const subtitle = `Revised counter-proposal · Generated ${new Date().toLocaleString()}${
    meta?.generatedBy ? ` · ${meta.generatedBy}` : ''
  }`;
  writeHeader(doc, 'Counter-Agreement (Proposed Revision)', subtitle);

  doc.font('Helvetica').fontSize(10.5).fillColor('#111');
  const text = revisedText.replace(/\r\n/g, '\n').trim();
  doc.text(text, {
    align: 'left',
    lineGap: 3,
  });

  writeFooterOnEveryPage(doc);
  doc.end();
  return resultPromise;
}

interface RedlineLine {
  type: 'added' | 'removed' | 'context';
  text: string;
}

function buildRedlineLines(original: string, revised: string): RedlineLine[] {
  const parts = diffLines(original.replace(/\r\n/g, '\n'), revised.replace(/\r\n/g, '\n'));
  const lines: RedlineLine[] = [];
  for (const part of parts) {
    const type: RedlineLine['type'] = part.added ? 'added' : part.removed ? 'removed' : 'context';
    const split = part.value.split('\n');
    // diffLines often leaves a trailing empty string for the final newline — drop it
    if (split.length && split[split.length - 1] === '') split.pop();
    for (const line of split) {
      lines.push({ type, text: line });
    }
  }
  return lines;
}

export async function renderRedlinePdf(
  original: string,
  revised: string,
  meta?: { generatedBy?: string }
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 56, bottom: 72, left: 56, right: 56 },
    bufferPages: true,
  });
  const resultPromise = streamToBuffer(doc);

  const subtitle = `Redline diff: original vs proposed revision · Generated ${new Date().toLocaleString()}${
    meta?.generatedBy ? ` · ${meta.generatedBy}` : ''
  }`;
  writeHeader(doc, 'Counter-Agreement Redline', subtitle);

  // Legend
  doc.font('Helvetica').fontSize(9);
  doc.fillColor('#15803d').text('+ added', { continued: true });
  doc.fillColor('#666').text('     ', { continued: true });
  doc.fillColor('#b91c1c').text('- removed', { continued: true });
  doc.fillColor('#666').text('     unchanged context', { continued: false });
  doc.moveDown(0.7);

  const lines = buildRedlineLines(original, revised);
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const lineHeight = 13;

  doc.font('Courier').fontSize(9);

  for (const line of lines) {
    // Compute how tall the wrapped line will be so we can size the background rect
    const prefix = line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  ';
    const fullText = `${prefix}${line.text}`;
    const measuredHeight = doc.heightOfString(fullText, { width: usableWidth }) || lineHeight;

    // Page break if needed
    if (doc.y + measuredHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }

    if (line.type === 'added' || line.type === 'removed') {
      const bg = line.type === 'added' ? '#dcfce7' : '#fee2e2';
      doc.save();
      doc.rect(doc.page.margins.left, doc.y - 1, usableWidth, measuredHeight + 2)
        .fillColor(bg)
        .fill();
      doc.restore();
    }

    const color = line.type === 'added' ? '#15803d' : line.type === 'removed' ? '#b91c1c' : '#111';
    doc.fillColor(color).text(fullText, {
      width: usableWidth,
      lineGap: 1,
    });
  }

  writeFooterOnEveryPage(doc);
  doc.end();
  return resultPromise;
}
