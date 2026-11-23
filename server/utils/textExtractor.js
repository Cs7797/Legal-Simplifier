import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { TextDecoder } from 'node:util';
import { imageSize } from 'image-size';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import yauzl from 'yauzl';

const require = createRequire(import.meta.url);
const languagePath = dirname(require.resolve('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'));
const decoder = new TextDecoder('utf-8', { fatal: true });
let ocrRunning = false;

export class DocumentInputError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function inspectDocx(buffer, readContents) {
  return new Promise((resolve, reject) => {
    const invalid = () => reject(new DocumentInputError(415, 'The file is not a valid DOCX document.'));
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (error, zip) => {
      if (error) return invalid();

      let totalSize = 0;
      let hasDocument = false;
      let hasContentTypes = false;

      zip.on('error', invalid);
      zip.on('end', () => {
        if (hasDocument && hasContentTypes) resolve();
        else invalid();
      });
      zip.on('entry', (entry) => {
        totalSize += entry.uncompressedSize;
        if (totalSize > 32 * 1024 * 1024 || zip.entryCount > 1000) {
          zip.close();
          reject(new DocumentInputError(413, 'The DOCX expands beyond the processing limit.'));
          return;
        }
        hasDocument ||= entry.fileName === 'word/document.xml';
        hasContentTypes ||= entry.fileName === '[Content_Types].xml';
        if (!readContents || entry.fileName.endsWith('/')) {
          zip.readEntry();
          return;
        }
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) {
            zip.close();
            return invalid();
          }
          stream.on('error', () => {
            zip.close();
            invalid();
          });
          stream.on('end', () => zip.readEntry());
          stream.resume();
        });
      });
      zip.readEntry();
    });
  });
}

export async function validateDocument(buffer, type, { readArchiveContents = false } = {}) {
  if (type === 'pdf' && buffer.subarray(0, 5).toString() === '%PDF-') return;
  if (type === 'docx') return inspectDocx(buffer, readArchiveContents);
  if (type === 'image') {
    try {
      const info = imageSize(buffer);
      if (['jpg', 'png'].includes(info.type)) {
        if (!info.width || !info.height || info.width * info.height > 16_000_000) {
          throw new DocumentInputError(413, 'Use an image with at most 16 million pixels.');
        }
        return;
      }
    } catch (error) {
      if (error instanceof DocumentInputError) throw error;
    }
  }
  if (type === 'txt') {
    try {
      if (!decoder.decode(buffer).includes(String.fromCharCode(0))) return;
    } catch {
      // Invalid UTF-8.
    }
  }
  throw new DocumentInputError(415, 'The file contents do not match a supported document type.');
}

export async function extractFromTxt(buffer) {
  return decoder.decode(buffer).trim();
}

export async function extractFromDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer }, { externalFileAccess: false });
    return result.value.trim();
  } catch {
    throw new DocumentInputError(422, 'The DOCX could not be read.');
  }
}

export async function extractFromImage(buffer) {
  if (ocrRunning) throw new DocumentInputError(429, 'Image OCR is busy. Try again in a moment.');

  ocrRunning = true;
  let worker;
  let timeout;
  let expired = false;

  const recognize = async () => {
    worker = await createWorker('eng', 1, {
      langPath: languagePath,
      cacheMethod: 'none',
    });
    if (expired) {
      await worker.terminate();
      return '';
    }
    const result = await worker.recognize(buffer);
    return result.data.text.trim();
  };

  try {
    return await Promise.race([
      recognize(),
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          expired = true;
          reject(new DocumentInputError(422, 'Image OCR took too long. Try a smaller image.'));
        }, 40_000);
      }),
    ]);
  } catch (error) {
    if (error instanceof DocumentInputError) throw error;
    throw new DocumentInputError(422, 'The image could not be read.');
  } finally {
    clearTimeout(timeout);
    try {
      if (worker) await worker.terminate();
    } finally {
      ocrRunning = false;
    }
  }
}

export async function extractFromPdf(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer), isEvalSupported: false, stopAtErrors: true });
  try {
    const info = await parser.getInfo();
    if (info.total > 100) throw new DocumentInputError(413, 'PDFs must contain 100 pages or fewer.');
    const { text, pages } = await parser.getText();
    // pdf-parse adds page markers to the combined string.
    const extracted = pages ? pages.map((page) => page.text).join('\n\n').trim() : text.trim();
    if (!extracted) {
      throw new DocumentInputError(422, 'This PDF has no readable text. Scanned PDFs are unsupported. Upload a page as a JPEG or PNG for OCR.');
    }
    return extracted;
  } catch (error) {
    if (error instanceof DocumentInputError) throw error;
    throw new DocumentInputError(422, 'The PDF could not be read. Check whether it is damaged or password protected.');
  } finally {
    await parser.destroy();
  }
}
