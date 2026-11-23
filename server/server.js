// Load environment variables
import 'dotenv/config';
import { randomUUID } from 'node:crypto';

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { extractFromDocx, extractFromImage, extractFromPdf, extractFromTxt, DocumentInputError, validateDocument } from './utils/textExtractor.js';
import { analyzeLegalDocument, chatWithLegalAI, compareDocuments, generateRiskFreeDraftDocument } from './services/aiService.js';
import { translateText } from './services/translationService.js';
import { generatePdfReport } from './utils/pdfReport.js';
import { createSignedFileUrl, deleteAnalysisForUser, fetchAnalysesForUser, getAnalysisForUser, reindexAnalysesForUser, saveAnalysisRecord } from './services/persistenceService.js';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 5000;
const GENERAL_RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const GENERAL_RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 120);
const CHAT_RATE_LIMIT_WINDOW_MS = Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const CHAT_RATE_LIMIT_MAX = Number(process.env.CHAT_RATE_LIMIT_MAX || 25);
const authClient = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
const allowedOrigins = new Set([
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://localhost:3000']),
  ...(process.env.FRONTEND_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean),
]);
const FILE_LIMIT = 10 * 1024 * 1024;
const BASE64_LIMIT = 4 * Math.ceil(FILE_LIMIT / 3);
const TEXT_LIMIT = 60_000;
const jsonRequest = express.json({ limit: '1mb' });
const fileRequest = express.json({ limit: '15mb' });

app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));

function validText(text) {
  return typeof text === 'string' && text.trim().length > 0 && text.length <= TEXT_LIMIT;
}

function decodeFile(buffer) {
  if (typeof buffer !== 'string' || !buffer || buffer.length > BASE64_LIMIT || buffer.length % 4 !== 0) {
    throw new DocumentInputError(400, 'A valid base64 file of up to 10 MiB is required.');
  }

  const bytes = Buffer.from(buffer, 'base64');
  if (!bytes.length || bytes.length > FILE_LIMIT || bytes.toString('base64') !== buffer) {
    throw new DocumentInputError(400, 'A valid base64 file of up to 10 MiB is required.');
  }
  return bytes;
}
const rateLimitStore = new Map();

app.disable('x-powered-by');

function createRateLimiter({ windowMs, maxRequests, message }) {
  return (req, res, next) => {
    const route = req.route.path;
    const identity = req.authUser?.id || req.ip || req.socket.remoteAddress;
    const key = `${route}:${identity}`;
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      next();
      return;
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({ error: message });
      return;
    }

    record.count += 1;
    next();
  };
}

const apiRateLimiter = createRateLimiter({
  windowMs: GENERAL_RATE_LIMIT_WINDOW_MS,
  maxRequests: GENERAL_RATE_LIMIT_MAX,
  message: 'Too many requests. Please try again shortly.',
});

const chatRateLimiter = createRateLimiter({
  windowMs: CHAT_RATE_LIMIT_WINDOW_MS,
  maxRequests: CHAT_RATE_LIMIT_MAX,
  message: 'Too many assistant requests. Please wait a minute and try again.',
});

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref?.();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new DocumentInputError(403, 'This browser origin is not allowed.'));
  },
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
});
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!authClient) {
      return res.status(503).json({ error: 'Authentication is temporarily unavailable.' });
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication is required.' });
    }

    const { data, error } = await authClient.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    req.authUser = data.user;
    next();
  } catch (error) {
    res.status(503).json({ error: 'Authentication is temporarily unavailable.' });
  }
}

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: FILE_LIMIT, files: 1, fields: 0 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new DocumentInputError(415, 'Choose a PDF, DOCX, TXT, JPEG, or PNG file.'));
    }
  }
});


// Helper function to detect file type
function getFileType(mimetype) {
  if (mimetype === 'application/pdf') {
    return 'pdf';
  } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'docx';
  } else if (mimetype === 'text/plain') {
    return 'txt';
  } else if (mimetype.startsWith('image/')) {
    return 'image';
  }
  return 'unknown';
}

// Routes

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Legal Simplifier API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      upload: 'POST /upload',
      extractText: 'POST /extract-text',
      simplifyText: 'POST /simplify-text',
      compareDocuments: 'POST /compare-documents',
      translate: 'POST /translate',
      chat: 'POST /chat',
      downloadReport: 'POST /download-report'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Legal Simplifier API is running' });
});

// Upload file
app.post('/upload', requireAuth, apiRateLimiter, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileType = getFileType(req.file.mimetype);
    
    if (fileType === 'unknown') {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    await validateDocument(req.file.buffer, fileType);
    const docId = randomUUID();

    res.json({
      success: true,
      docId: docId,
      filename: req.file.originalname,
      fileType: fileType,
      buffer: req.file.buffer.toString('base64')
    });

  } catch (error) {
    next(error);
  }
});

// Extract text from uploaded file
app.post('/extract-text', requireAuth, apiRateLimiter, fileRequest, async (req, res, next) => {
  try {
    const { buffer, fileType } = req.body || {};

    if (!buffer || !fileType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const fileBuffer = decodeFile(buffer);
    await validateDocument(fileBuffer, fileType, { readArchiveContents: true });
    let extractedText = '';

    // Extract text based on file type
    switch (fileType) {
      case 'pdf':
        extractedText = await extractFromPdf(fileBuffer);
        break;
      case 'docx':
        extractedText = await extractFromDocx(fileBuffer);
        break;
      case 'image':
        extractedText = await extractFromImage(fileBuffer);
        break;
      case 'txt':
        extractedText = await extractFromTxt(fileBuffer);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported file type' });
    }

    if (!validText(extractedText)) {
      throw new DocumentInputError(422, 'The document has no readable text or exceeds 60,000 characters.');
    }

    res.json({
      success: true,
      text: extractedText
    });

  } catch (error) {
    next(error);
  }
});

// Simplify legal text using AI
app.post('/simplify-text', requireAuth, apiRateLimiter, jsonRequest, async (req, res, next) => {
  try {
    const { text, outputLanguage = 'en' } = req.body || {};

    if (!validText(text) || typeof outputLanguage !== 'string' || !/^(same|[a-z]{2})$/.test(outputLanguage)) {
      return res.status(400).json({ error: 'Provide document text up to 60,000 characters and a supported output language.' });
    }

    // Simplify text using AI
    const analysis = await analyzeLegalDocument(text, { outputLanguage });

    res.json({
      success: true,
      simplified: analysis.simplified,
      clauses: analysis.clauses,
      riskScore: analysis.riskScore,
      advice: analysis.advice,
      detectedLanguage: analysis.detectedLanguage,
      outputLanguage: analysis.outputLanguage,
    });

  } catch (error) {
    next(error);
  }
});

app.post('/compare-documents', requireAuth, apiRateLimiter, jsonRequest, async (req, res, next) => {
  try {
    const { docA, docB } = req.body || {};

    if (!validText(docA?.text) || !validText(docB?.text)) {
      return res.status(400).json({ error: 'Both documents must contain text of up to 60,000 characters.' });
    }

    const comparison = await compareDocuments(docA, docB);

    res.json({
      success: true,
      ...comparison,
    });
  } catch (error) {
    next(error);
  }
});

// Translate simplified text
app.post('/translate', requireAuth, apiRateLimiter, jsonRequest, async (req, res, next) => {
  try {
    const { text, targetLang } = req.body || {};

    if (!validText(text) || typeof targetLang !== 'string' || !/^[a-z]{2}$/.test(targetLang)) {
      return res.status(400).json({ error: 'Missing text or target language' });
    }

    // Translate text
    const translatedText = await translateText(text, targetLang);

    res.json({
      success: true,
      translated: translatedText
    });

  } catch (error) {
    next(error);
  }
});

app.post('/chat', requireAuth, chatRateLimiter, jsonRequest, async (req, res, next) => {
  try {
    const { messages, context } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'A non-empty messages array is required.' });
    }

    const cleanedMessages = messages
      .filter((message) => message && typeof message.content === 'string' && message.content.trim())
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content.trim().slice(0, 4000),
      }))
      .slice(-12);

    if (!cleanedMessages.some((message) => message.role === 'user')) {
      return res.status(400).json({ error: 'No valid chat messages were provided.' });
    }

    const document = context && typeof context === 'object' ? {
      docId: typeof context.docId === 'string' ? context.docId.slice(0, 160) : null,
      filename: typeof context.filename === 'string' ? context.filename.slice(0, 255) : null,
      originalText: typeof context.originalText === 'string' ? context.originalText.slice(0, TEXT_LIMIT) : '',
    } : null;
    const assistantResponse = await chatWithLegalAI(cleanedMessages, document, {
      userId: req.authUser.id,
    });

    res.json({
      success: true,
      reply: assistantResponse.reply,
      sources: assistantResponse.sources || [],
    });
  } catch (error) {
    next(error);
  }
});

app.post('/download-report', requireAuth, apiRateLimiter, jsonRequest, async (req, res, next) => {
  try {
    const { reportType, results } = req.body || {};

    if (!['summary', 'risk', 'riskfree'].includes(reportType) || !results || typeof results !== 'object' || Array.isArray(results)) {
      return res.status(400).json({ error: 'A supported report type and results object are required.' });
    }

    if (reportType === 'riskfree' && !validText(results.originalText || results.sourceText)) {
      return res.status(400).json({ error: 'Provide source text up to 60,000 characters for a draft.' });
    }

    const reportResults =
      reportType === 'riskfree'
        ? {
            ...results,
            riskFreeDraft: await generateRiskFreeDraftDocument(results.originalText || results.sourceText || '', results),
          }
        : results;

    const pdfBuffer = generatePdfReport(reportType, reportResults);
    const safeFilename = String(results.filename || 'legal-simplifier-report').slice(0, 160).replace(/[^a-zA-Z0-9._-]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    const suffix = reportType === 'riskfree' ? 'draft' : reportType;
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}-${suffix}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

app.post('/save-analysis', requireAuth, apiRateLimiter, fileRequest, async (req, res, next) => {
  try {
    const { input, results } = req.body || {};

    if (!results || !validText(results.originalText || input?.sourceText) ||
        typeof results.filename !== 'string' || results.filename.length > 255 ||
        !['file', 'text'].includes(input?.sourceType)) {
      return res.status(400).json({ error: 'Valid document metadata and source text are required.' });
    }
    const originalFile = input.sourceType === 'file' ? decodeFile(input.fileData) : null;
    if (originalFile) await validateDocument(originalFile, input.fileType);

    const saved = await saveAnalysisRecord({
      userId: req.authUser.id,
      input: {
        ...input,
        originalFile,
        userEmail: req.authUser.email,
      },
      results,
    });
    res.json({ success: true, saved });
  } catch (error) {
    next(error);
  }
});

app.get('/analyses/me', requireAuth, apiRateLimiter, async (req, res, next) => {
  try {
    const records = await fetchAnalysesForUser(req.authUser.id);
    res.json({ success: true, records });
  } catch (error) {
    next(error);
  }
});

app.post('/rag/reindex-me', requireAuth, apiRateLimiter, async (req, res, next) => {
  try {
    const result = await reindexAnalysesForUser(req.authUser.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

app.get('/analyses/:analysisId/file-url', requireAuth, apiRateLimiter, async (req, res, next) => {
  try {
    const record = await getAnalysisForUser(req.authUser.id, req.params.analysisId);

    if (!record?.storage_path) {
      return res.json({ success: true, url: null });
    }

    const url = await createSignedFileUrl(record.storage_path);
    res.json({ success: true, url });
  } catch (error) {
    next(error);
  }
});

app.delete('/analyses/:analysisId', requireAuth, apiRateLimiter, async (req, res, next) => {
  try {
    const result = await deleteAnalysisForUser(req.authUser.id, req.params.analysisId);
    if (!result.deleted) return res.status(404).json({ error: 'Analysis not found.' });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});


// Error handling middleware
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof DocumentInputError) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error instanceof multer.MulterError || error.type === 'entity.too.large') {
    const oversized = error.code === 'LIMIT_FILE_SIZE' || error.type === 'entity.too.large';
    return res.status(oversized ? 413 : 400).json({
      error: oversized ? 'The upload or request exceeds the allowed size.' : 'The upload must contain one file.',
    });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON request.' });
  }
  if (error.name === 'AIServiceError') {
    return res.status(error.status).json({ error: error.message });
  }
  console.error('Request failed', req.method, req.route?.path || 'unmatched');
  res.status(500).json({ error: 'The service could not complete this request.' });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Legal Simplifier backend server running on port ${PORT}`);
  });
}

export default app;
