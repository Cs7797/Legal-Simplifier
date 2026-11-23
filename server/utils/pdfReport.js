import { DocumentInputError } from './textExtractor.js';

const WIN_ANSI = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ';

function escapePdfText(value) {
  return Array.from(String(value || '').normalize('NFC'), (character) => {
    if (character === '\t') return '    ';
    if (character === '\r') return '';
    if (/\p{Zs}/u.test(character)) return ' ';
    if (/[\u2010\u2011\u2212]/u.test(character)) return '-';
    if (/[\u200b\ufeff]/u.test(character)) return '';
    const code = character.codePointAt(0);
    if (code < 32) return '';
    if (code >= 32 && code < 127) {
      return ['\\', '(', ')'].includes(character) ? `\\${character}` : character;
    }
    const winAnsiIndex = WIN_ANSI.indexOf(character);
    const byte = winAnsiIndex >= 0 ? 128 + winAnsiIndex : code;
    if ((byte >= 160 && byte <= 255) || winAnsiIndex >= 0) {
      return `\\${byte.toString(8).padStart(3, '0')}`;
    }
    throw new DocumentInputError(422, 'This PDF export contains characters the current report font cannot display. The analysis remains available in your workspace.');
  }).join('');
}

function wrapLine(text, maxLength = 92) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength) {
      if (current) {
        lines.push(current);
      }
      current = word;
    } else {
      current = next;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [''];
}

function addParagraph(lines, text, { bold = false } = {}) {
  String(text || '')
    .split('\n')
    .forEach((rawLine) => {
      if (!rawLine.trim()) {
        lines.push({ text: '', bold });
        return;
      }

      wrapLine(rawLine.trim()).forEach((line) => {
        lines.push({ text: line, bold });
      });
    });
}

function buildSummaryLines(results) {
  const lines = [];
  addParagraph(lines, 'Legal Simplifier Report', { bold: true });
  addParagraph(lines, `File: ${results.filename || 'Uploaded document'}`);
  addParagraph(lines, `Generated: ${new Date().toLocaleString('en-IN')}`);
  addParagraph(lines, `Language: ${(results.language || 'en').toUpperCase()}`);
  addParagraph(lines, '');
  addParagraph(lines, 'Simplified Text', { bold: true });
  addParagraph(lines, results.translated || results.simplified || 'No simplified text available.');
  return lines;
}

function buildRiskLines(results) {
  const lines = [];
  addParagraph(lines, 'Legal Simplifier Risk Analysis', { bold: true });
  addParagraph(lines, `File: ${results.filename || 'Uploaded document'}`);
  addParagraph(lines, `Generated: ${new Date().toLocaleString('en-IN')}`);
  addParagraph(lines, '');

  const clauses = Array.isArray(results.clauses) ? results.clauses : [];
  if (clauses.length === 0) {
    addParagraph(lines, 'No clause-level risk analysis was available for this document.');
    return lines;
  }

  clauses.forEach((clause, index) => {
    addParagraph(lines, `Clause ${index + 1}: ${clause.title || 'Untitled clause'}`, { bold: true });
    addParagraph(lines, `Risk Level: ${clause.riskLevel || 'SAFE'}`);
    addParagraph(lines, `Risk Reason: ${clause.riskReason || 'No explanation provided.'}`);
    addParagraph(lines, `Simplified Meaning: ${clause.simplified || 'No simplified explanation provided.'}`);
    addParagraph(lines, `Original Excerpt: ${clause.originalExcerpt || 'No excerpt provided.'}`);
    addParagraph(lines, '');
  });

  return lines;
}

function buildRiskFreeLines(results) {
  const lines = [];
  addParagraph(lines, 'Legal Simplifier Revised Draft', { bold: true });
  addParagraph(lines, `File: ${results.filename || 'Uploaded document'}`);
  addParagraph(lines, `Generated: ${new Date().toLocaleString('en-IN')}`);
  addParagraph(lines, '');
  addParagraph(lines, 'Review this AI-generated draft with a qualified lawyer before use.');
  addParagraph(lines, '');

  const revisedDocument = String(results.riskFreeDraft || '').trim();
  if (!revisedDocument) {
    addParagraph(lines, 'No revised draft was available to render.');
    return lines;
  }

  addParagraph(lines, 'Updated Draft', { bold: true });
  addParagraph(lines, revisedDocument);

  const clauses = Array.isArray(results.clauses) ? results.clauses : [];
  if (clauses.length > 0) {
    addParagraph(lines, '');
    addParagraph(lines, 'Revision Notes', { bold: true });
    clauses
      .filter((clause) => clause?.riskLevel === 'HIGH' || clause?.riskLevel === 'MEDIUM')
      .slice(0, 12)
      .forEach((clause, index) => {
        addParagraph(lines, `Updated clause ${index + 1}: ${clause.title || 'Untitled clause'}`, { bold: true });
        addParagraph(lines, `Original concern: ${clause.riskReason || 'No concern provided.'}`);
        addParagraph(lines, `Safer direction: ${clause.simplified || 'No safer wording generated.'}`);
        addParagraph(lines, '');
      });
  }

  return lines;
}

function buildPdfFromLines(lines) {
  const pageHeight = 792;
  const top = 760;
  const bottom = 50;
  const fontSize = 11;
  const leading = 16;
  const pages = [];
  let currentPage = [];
  let y = top;

  lines.forEach((line) => {
    if (y < bottom) {
      pages.push(currentPage);
      currentPage = [];
      y = top;
    }

    currentPage.push({ ...line, y });
    y -= leading;
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  const objects = [];
  const pageObjectIds = [];

  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesId = addObject('');

  pages.forEach((pageLines) => {
    const contentStream = [
      'BT',
      `/F1 ${fontSize} Tf`,
      '14 TL',
    ];

    pageLines.forEach((line) => {
      const font = line.bold ? '/F2' : '/F1';
      contentStream.push(`${font} ${fontSize} Tf`);
      contentStream.push(`1 0 0 1 50 ${line.y} Tm`);
      contentStream.push(`(${escapePdfText(line.text)}) Tj`);
    });

    contentStream.push('ET');
    const contentText = contentStream.join('\n');
    const contentId = addObject(`<< /Length ${Buffer.byteLength(contentText, 'utf8')} >>\nstream\n${contentText}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 ${pageHeight}] /Resources << /Font << /F1 FONT_REGULAR_REF /F2 FONT_BOLD_REF >> >> /Contents ${contentId} 0 R >>`
    );
    pageObjectIds.push(pageId);
  });

  const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  objects[pagesId - 1] = `<< /Type /Pages /Count ${pageObjectIds.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] >>`;

  const finalizedObjects = objects.map((content) =>
    content
      .replace(/FONT_REGULAR_REF/g, `${fontRegularId} 0 R`)
      .replace(/FONT_BOLD_REF/g, `${fontBoldId} 0 R`)
  );

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  finalizedObjects.forEach((content, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${content}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${finalizedObjects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${finalizedObjects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

export function generatePdfReport(reportType, results) {
  const lines =
    reportType === 'risk'
      ? buildRiskLines(results)
      : reportType === 'riskfree'
        ? buildRiskFreeLines(results)
        : buildSummaryLines(results);
  return buildPdfFromLines(lines);
}
