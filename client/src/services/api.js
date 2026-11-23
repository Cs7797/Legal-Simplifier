import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes timeout for file processing
});

api.interceptors.request.use(async (config) => {
  if (!supabase) throw new Error('Sign-in is not configured.');

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (config.expectedUserId && data.session?.user?.id !== config.expectedUserId) {
    throw new Error('Your session changed. Sign in and try again.');
  }

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

function handleApiError(error, fallbackMessage) {
  const detail = error.response?.data?.error;
  if (typeof detail === 'string') throw new Error(detail);
  if (error.code === 'ECONNABORTED') throw new Error('The request timed out. Try again shortly.');
  if (error.request && !error.response) throw new Error('Unable to connect to the server.');
  throw new Error(error.response ? fallbackMessage : error.message || fallbackMessage);
}

export const processDocument = async (file, outputLanguage, setCurrentStep, userId) => {
  try {
    // Step 1: Upload file
    setCurrentStep('uploading');
    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await api.post('/upload', formData, {
      expectedUserId: userId,
    });

    const { docId, buffer, fileType, filename } = uploadResponse.data;

    // Step 2: Extract text
    setCurrentStep('extracting');
    const extractResponse = await api.post('/extract-text', {
      docId,
      buffer,
      fileType,
    }, { expectedUserId: userId });

    const { text } = extractResponse.data;

    // Step 3: Simplify text
    setCurrentStep('simplifying');
    const simplifyResponse = await api.post('/simplify-text', {
      docId,
      text,
      outputLanguage,
    }, { expectedUserId: userId });

    const { simplified, clauses, riskScore, advice, detectedLanguage, outputLanguage: resolvedOutputLanguage } = simplifyResponse.data;

    const result = {
      docId,
      filename,
      originalText: text,
      simplified,
      clauses: clauses || [],
      translated: null,
      language: resolvedOutputLanguage?.code || 'en',
      outputLanguageMode: outputLanguage,
      detectedLanguage,
      riskScore,
      advice: advice || [],
      fileType,
      sourceType: 'file',
      fileData: buffer,
      createdAt: new Date().toISOString(),
    };

    return saveResult({
      sourceType: 'file',
      fileType,
      fileData: buffer,
    }, result, userId);
  } catch (error) {
    handleApiError(error, 'An unexpected error occurred');
  }
};

export const processPastedText = async (sourceText, outputLanguage, setCurrentStep, userId) => {
  try {
    setCurrentStep('simplifying');
    const docId = `text-${crypto.randomUUID()}`;
    const simplifyResponse = await api.post('/simplify-text', {
      docId,
      text: sourceText,
      outputLanguage,
    }, { expectedUserId: userId });

    const { simplified, clauses, riskScore, advice, detectedLanguage, outputLanguage: resolvedOutputLanguage } = simplifyResponse.data;

    const result = {
      docId,
      filename: 'Pasted text',
      originalText: sourceText,
      simplified,
      clauses: clauses || [],
      translated: null,
      language: resolvedOutputLanguage?.code || 'en',
      outputLanguageMode: outputLanguage,
      detectedLanguage,
      riskScore,
      advice: advice || [],
      fileType: 'text',
      sourceType: 'text',
      sourceText,
      createdAt: new Date().toISOString(),
    };

    return saveResult({ sourceType: 'text' }, result, userId);
  } catch (error) {
    handleApiError(error, 'An unexpected error occurred');
  }
};

async function saveResult(input, result, userId) {
  const { fileData, fileUrl, docId, ...analysis } = result;
  try {
    const response = await api.post('/save-analysis', { input, results: analysis }, { expectedUserId: userId });
    const saved = response.data?.saved;
    if (!saved?.persisted || !saved.id) throw new Error('No saved analysis returned.');
    return {
      ...result,
      docId: saved.id,
      cloudSaved: true,
      saveNotice: saved.ragIndex?.indexed ? '' : 'Saved to your account. The chat index is unavailable, so chat will search the document text directly.',
    };
  } catch {
    return { ...result, cloudSaved: false, saveNotice: 'Could not save to your account. This result is available until you leave this browser session.' };
  }
}

export const chatWithAssistant = async (messages, context) => {
  try {
    const document = context && {
      docId: context.cloudSaved ? context.docId : null,
      filename: context.filename,
      originalText: context.originalText,
    };
    const recentMessages = messages.slice(-12).map(({ role, content }) => ({ role, content }));
    const response = await api.post('/chat', { messages: recentMessages, context: document });
    return response.data;
  } catch (error) {
    handleApiError(error, 'Chat request failed.');
  }
};

export const fetchReportPdfBlob = async (reportType, results) => {
  try {
    const { fileData, fileUrl, ...report } = results;
    const response = await api.post(
      '/download-report',
      {
        reportType,
        results: report,
      },
      {
        responseType: 'blob',
      }
    );

    return new Blob([response.data], { type: 'application/pdf' });
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        // Some network proxies do not return JSON.
      }
    }
    handleApiError(error, 'Unable to generate the PDF report.');
  }
};

export const downloadReportPdf = async (reportType, results) => {
  const blob = await fetchReportPdfBlob(reportType, results);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${results.filename || 'legal-simplifier-report'}-${reportType}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

export const fetchAnalysisHistory = async (userId, signal) => {
  const response = await api.get('/analyses/me', { expectedUserId: userId, signal });
  return response.data.records || [];
};

export const fetchAnalysisFileUrl = async (analysisId, userId) => {
  const response = await api.get(`/analyses/${encodeURIComponent(analysisId)}/file-url`, { expectedUserId: userId });
  return response.data.url || null;
};

export const deleteAnalysis = async (analysisId, userId) => {
  const response = await api.delete(`/analyses/${encodeURIComponent(analysisId)}`, { expectedUserId: userId });
  return response.data;
};

export const compareDocuments = async ({ docA, docB }) => {
  try {
    const response = await api.post('/compare-documents', { docA, docB });
    return response.data;
  } catch (error) {
    handleApiError(error, 'Unable to compare documents right now.');
  }
};

export const extractDocumentText = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await api.post('/upload', formData);

    const { docId, buffer, fileType, filename } = uploadResponse.data;
    const extractResponse = await api.post('/extract-text', {
      docId,
      buffer,
      fileType,
    });

    return {
      docId,
      filename,
      text: extractResponse.data.text,
      fileType,
    };
  } catch (error) {
    handleApiError(error, 'Unable to extract text from the document.');
  }
};

export default api;
