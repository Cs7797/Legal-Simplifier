import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { indexAnalysisForRag } from './rag/postgresVectorStore.js';
import { chunkDocumentText } from './rag/chunkingService.js';
import { createEmbeddingVector, embeddingToSql } from './rag/embeddingService.js';

let supabaseClient = null;
let supabaseReady = false;
const BUCKET = 'legal-files';

function getSupabaseClient() {
  if (supabaseReady) {
    return supabaseClient;
  }

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  supabaseReady = true;
  return supabaseClient;
}

function assessedClauses(clauses) {
  if (!Array.isArray(clauses) || clauses.some((clause) =>
    typeof clause?.riskReason === 'string' && clause.riskReason.startsWith('Risk classification was unavailable')
  )) return [];
  return clauses;
}

async function uploadOriginalFile(client, input, results) {
  if (!input.originalFile) {
    return null;
  }

  const safeName = `${results.docId}-${results.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const path = `${input.userId}/${safeName}`;

  const { error } = await client.storage.from(BUCKET).upload(path, input.originalFile, {
    upsert: false,
    contentType: 'application/octet-stream',
  });

  if (error) {
    throw error;
  }

  return path;
}

async function indexAnalysisForRagViaSupabase(client, { analysisId, userId, filename, text }) {
  if (!client || !analysisId || !userId || !text) {
    return { indexed: false, chunkCount: 0, reason: 'Missing Supabase client or document text.' };
  }

  const chunks = chunkDocumentText(text);
  if (chunks.length === 0) {
    return { indexed: false, chunkCount: 0, reason: 'No chunks available.' };
  }

  const rows = chunks.map((chunk) => ({
    analysis_id: analysisId,
    user_id: userId,
    filename: filename || null,
    chunk_index: chunk.chunkIndex,
    content: chunk.content,
    embedding: embeddingToSql(createEmbeddingVector(chunk.content)),
  }));

  const { error: insertError } = await client.rpc('replace_document_rag_chunks', {
    target_analysis_id: analysisId,
    target_user_id: userId,
    replacement_chunks: rows,
  });

  if (insertError) {
    return { indexed: false, chunkCount: 0, reason: 'Chunk indexing failed.' };
  }

  return { indexed: true, chunkCount: rows.length, mode: 'supabase-api' };
}

export async function saveAnalysisRecord({ userId, input = {}, results }) {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase is not configured');
  }

  const profilePayload = {
    id: userId,
    label: input.userEmail || 'Legal Simplifier User',
    email: input.userEmail || null,
    last_seen_at: new Date().toISOString(),
  };

  const { error: profileError } = await client.from('app_users').upsert(profilePayload);
  if (profileError) {
    throw profileError;
  }

  const id = randomUUID();
  const filePath = await uploadOriginalFile(client, { ...input, userId }, { ...results, docId: id });
  const payload = {
    id,
    user_id: userId,
    filename: results.filename,
    file_type: results.fileType || input.fileType || null,
    source_type: input.sourceType || 'file',
    language: results.language || 'en',
    detected_language: results.detectedLanguage?.code || null,
    output_language_mode: results.outputLanguageMode || results.outputLanguage?.mode || 'en',
    preview: String(results.simplified || '').slice(0, 240),
    original_text: results.originalText || null,
    simplified: results.simplified || null,
    translated: results.translated || null,
    clauses: results.clauses || [],
    risk_score: results.riskScore || null,
    actionable_advice: results.advice || [],
    storage_path: filePath,
    source_text: input.sourceType === 'text' ? results.originalText : null,
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await client.from('document_analyses').insert(payload);
    if (error) throw error;
  } catch (error) {
    if (filePath) {
      try {
        const { error: cleanupError } = await client.storage.from(BUCKET).remove([filePath]);
        if (cleanupError) console.error('Original file cleanup failed');
      } catch {
        console.error('Original file cleanup failed');
      }
    }
    throw error;
  }

  let ragIndex = await indexAnalysisForRag({
    analysisId: payload.id,
    userId,
    filename: payload.filename,
    text: payload.original_text || payload.source_text || '',
  });

  if (!ragIndex.indexed) {
    try {
      ragIndex = await indexAnalysisForRagViaSupabase(client, {
        analysisId: payload.id,
        userId,
        filename: payload.filename,
        text: payload.original_text || payload.source_text || '',
      });
    } catch {
      ragIndex = { indexed: false, chunkCount: 0, reason: 'Chunk indexing failed.' };
    }
  }

  return { persisted: true, id: payload.id, storagePath: filePath, ragIndex };
}

export async function fetchAnalysesForUser(userId) {
  const client = getSupabaseClient();

  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from('document_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) {
    throw error;
  }

  const mappedRecords = (data || []).map((record) => ({
    id: record.id,
    docId: record.id,
    filename: record.filename,
    fileType: record.file_type,
    sourceType: record.source_type,
    language: record.language,
    detectedLanguage: record.detected_language ? { code: record.detected_language } : null,
    outputLanguageMode: record.output_language_mode || 'en',
    preview: record.preview,
    originalText: record.original_text,
    sourceText: record.source_text,
    simplified: record.simplified,
    translated: record.translated,
    clauses: assessedClauses(record.clauses),
    riskScore: assessedClauses(record.clauses).length ? record.risk_score : null,
    advice: record.actionable_advice || [],
    createdAt: record.created_at,
    cloudSaved: true,
  }));

  return mappedRecords;
}

export async function reindexAnalysesForUser(userId) {
  const client = getSupabaseClient();

  if (!client) {
    return { reindexed: 0, failed: 0, results: [], reason: 'Supabase is not configured.' };
  }

  const { data, error } = await client
    .from('document_analyses')
    .select('id, filename, original_text, source_text')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const results = [];

  for (const record of data || []) {
    const text = record.original_text || record.source_text || '';
    let ragIndex = await indexAnalysisForRag({
      analysisId: record.id,
      userId,
      filename: record.filename,
      text,
    });

    if (!ragIndex.indexed) {
      ragIndex = await indexAnalysisForRagViaSupabase(client, {
        analysisId: record.id,
        userId,
        filename: record.filename,
        text,
      });
    }

    results.push({
      analysisId: record.id,
      filename: record.filename,
      ...ragIndex,
    });
  }

  return {
    reindexed: results.filter((result) => result.indexed).length,
    failed: results.filter((result) => !result.indexed).length,
    results,
  };
}

export async function createSignedFileUrl(storagePath) {
  const client = getSupabaseClient();

  if (!client || !storagePath) {
    return null;
  }

  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60);

  if (error) {
    throw error;
  }

  return data?.signedUrl || null;
}

export async function getAnalysisForUser(userId, analysisId) {
  const client = getSupabaseClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from('document_analyses')
    .select('*')
    .eq('user_id', userId)
    .eq('id', analysisId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteAnalysisForUser(userId, analysisId) {
  const client = getSupabaseClient();

  if (!client) {
    return { deleted: false, reason: 'Supabase is not configured.' };
  }

  const existing = await getAnalysisForUser(userId, analysisId);

  if (!existing) {
    return { deleted: false, reason: 'Record not found.' };
  }

  if (existing.storage_path) {
    const { error: storageError } = await client.storage.from(BUCKET).remove([existing.storage_path]);
    if (storageError) {
      throw storageError;
    }
  }

  const { error } = await client
    .from('document_analyses')
    .delete()
    .eq('user_id', userId)
    .eq('id', analysisId);

  if (error) {
    throw error;
  }

  return { deleted: true, id: analysisId };
}
