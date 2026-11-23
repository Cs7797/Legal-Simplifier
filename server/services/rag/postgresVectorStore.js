import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";
import { chunkDocumentText } from "./chunkingService.js";
import { createEmbeddingVector, embeddingToSql } from "./embeddingService.js";
import { rerankChunks } from "./rerankingService.js";

let pool = null;
let poolInitialized = false;
let supabaseClient = null;
let supabaseInitialized = false;

function getConnectionString() {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    null
  );
}

function getPool() {
  if (poolInitialized) {
    return pool;
  }

  const connectionString = getConnectionString();
  if (!connectionString) {
    pool = null;
    poolInitialized = true;
    return pool;
  }

  let url;
  try {
    url = new URL(connectionString);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Invalid protocol');
  } catch {
    console.error('Direct PostgreSQL connection is invalid');
    poolInitialized = true;
    return null;
  }
  for (const option of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
    url.searchParams.delete(option);
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  pool = new Pool({
    connectionString: url.toString(),
    connectionTimeoutMillis: 5000,
    statement_timeout: 10_000,
    ssl: local ? false : { rejectUnauthorized: true },
  });

  poolInitialized = true;
  return pool;
}

function getSupabaseClient() {
  if (supabaseInitialized) {
    return supabaseClient;
  }

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }

  supabaseInitialized = true;
  return supabaseClient;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    dot += a[index] * b[index];
    magnitudeA += a[index] * a[index];
    magnitudeB += b[index] * b[index];
  }

  if (!magnitudeA || !magnitudeB) {
    return 0;
  }

  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

function tokenizeForKeywordSearch(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function keywordMatchScore(query, content) {
  const queryTokens = [...new Set(tokenizeForKeywordSearch(query))];
  if (queryTokens.length === 0) {
    return 0;
  }

  const contentText = String(content || "").toLowerCase();
  const matches = queryTokens.filter((token) => contentText.includes(token));
  return matches.length / queryTokens.length;
}

function mergeChunkCandidates(candidates = []) {
  const merged = new Map();

  for (const candidate of candidates) {
    const key = candidate.id ?? `${candidate.analysisId}:${candidate.chunkIndex}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { ...candidate });
      continue;
    }

    existing.semanticScore = Math.max(existing.semanticScore || 0, candidate.semanticScore || 0);
    existing.keywordScore = Math.max(existing.keywordScore || 0, candidate.keywordScore || 0);
    existing.hybridScore = Math.max(existing.hybridScore || 0, candidate.hybridScore || 0);
    existing.retrievalMode = existing.retrievalMode === candidate.retrievalMode
      ? existing.retrievalMode
      : "hybrid";
  }

  return [...merged.values()];
}

async function retrieveRelevantChunksViaSupabase({
  analysisId,
  userId,
  query,
  limit = 5,
}) {
  const client = getSupabaseClient();

  if (!client || !analysisId || !userId || !query) {
    return [];
  }

  const { data, error } = await client
    .from("document_rag_chunks")
    .select("id, analysis_id, filename, chunk_index, content")
    .eq("analysis_id", analysisId)
    .eq("user_id", userId)
    .order("chunk_index", { ascending: true });

  if (error) {
    console.error("Supabase RAG retrieval fallback failed:");
    return [];
  }

  const queryEmbedding = createEmbeddingVector(query);

  const candidates = (data || [])
    .map((row) => ({
      id: row.id,
      analysisId: row.analysis_id,
      filename: row.filename,
      chunkIndex: row.chunk_index,
      content: row.content,
      semanticScore: cosineSimilarity(
        queryEmbedding,
        createEmbeddingVector(row.content),
      ),
      keywordScore: keywordMatchScore(query, row.content),
      retrievalMode: "supabase-fallback",
    }))
    .map((candidate) => ({
      ...candidate,
      hybridScore: candidate.semanticScore * 0.65 + candidate.keywordScore * 0.35,
    }));

  return rerankChunks(query, mergeChunkCandidates(candidates), limit);
}

export async function indexAnalysisForRag({
  analysisId,
  userId,
  filename,
  text,
}) {
  const client = getPool();

  if (!client || !analysisId || !userId || !text) {
    return {
      indexed: false,
      chunkCount: 0,
      reason: "Missing database connection or document text.",
    };
  }

  const chunks = chunkDocumentText(text);
  if (chunks.length === 0) {
    return { indexed: false, chunkCount: 0, reason: "No chunks available." };
  }

  let db;
  try {
    db = await client.connect();
    await db.query("BEGIN");
    const owner = await db.query(
      "SELECT id FROM public.document_analyses WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [analysisId, userId],
    );
    if (!owner.rowCount) throw new Error("Analysis is unavailable");
    await db.query(
      "DELETE FROM public.document_rag_chunks WHERE analysis_id = $1 AND user_id = $2",
      [analysisId, userId],
    );

    for (const chunk of chunks) {
      const embedding = createEmbeddingVector(chunk.content);
      await db.query(
        `INSERT INTO public.document_rag_chunks
          (analysis_id, user_id, filename, chunk_index, content, embedding)
         VALUES ($1, $2, $3, $4, $5, $6::vector)`,
        [
          analysisId,
          userId,
          filename || null,
          chunk.chunkIndex,
          chunk.content,
          embeddingToSql(embedding),
        ],
      );
    }

    await db.query("COMMIT");
    return { indexed: true, chunkCount: chunks.length };
  } catch (error) {
    console.error("RAG indexing failed:");
    try {
      if (db) await db.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback failed:");
    }
    return { indexed: false, chunkCount: 0, reason: "Chunk indexing failed." };
  } finally {
    if (db) db.release();
  }
}

export async function retrieveRelevantChunks({
  analysisId,
  userId,
  query,
  limit = 5,
}) {
  const client = getPool();
  const candidateLimit = Math.max(limit * 4, 20);

  if (!client || !analysisId || !userId || !query) {
    return retrieveRelevantChunksViaSupabase({ analysisId, userId, query, limit });
  }

  try {
    const embedding = createEmbeddingVector(query);
    const { rows } = await client.query(
      `WITH query_values AS (
          SELECT
            $3::vector AS query_embedding,
            websearch_to_tsquery('english', $4) AS query_terms
        ),
        semantic_candidates AS (
          SELECT
            chunk.id,
            chunk.analysis_id,
            chunk.filename,
            chunk.chunk_index,
            chunk.content,
            greatest(0, least(1, 1 - (chunk.embedding <=> query_values.query_embedding)))::float8 AS semantic_score,
            0::float8 AS keyword_score,
            row_number() OVER (ORDER BY chunk.embedding <=> query_values.query_embedding) AS semantic_rank,
            null::bigint AS keyword_rank,
            'semantic'::text AS retrieval_mode
          FROM public.document_rag_chunks chunk, query_values
          WHERE chunk.analysis_id = $1
            AND chunk.user_id = $2
          ORDER BY chunk.embedding <=> query_values.query_embedding
          LIMIT $5
        ),
        keyword_candidates AS (
          SELECT
            chunk.id,
            chunk.analysis_id,
            chunk.filename,
            chunk.chunk_index,
            chunk.content,
            0::float8 AS semantic_score,
            ts_rank_cd(chunk.search_vector, query_values.query_terms)::float8 AS keyword_score,
            null::bigint AS semantic_rank,
            row_number() OVER (ORDER BY ts_rank_cd(chunk.search_vector, query_values.query_terms) DESC) AS keyword_rank,
            'keyword'::text AS retrieval_mode
          FROM public.document_rag_chunks chunk, query_values
          WHERE chunk.analysis_id = $1
            AND chunk.user_id = $2
            AND chunk.search_vector @@ query_values.query_terms
          ORDER BY ts_rank_cd(chunk.search_vector, query_values.query_terms) DESC
          LIMIT $5
        ),
        merged_candidates AS (
          SELECT
            id,
            analysis_id,
            filename,
            chunk_index,
            content,
            max(semantic_score) AS semantic_score,
            max(keyword_score) AS keyword_score_raw,
            min(semantic_rank) AS semantic_rank,
            min(keyword_rank) AS keyword_rank,
            CASE
              WHEN bool_or(retrieval_mode = 'semantic') AND bool_or(retrieval_mode = 'keyword') THEN 'hybrid'
              WHEN bool_or(retrieval_mode = 'keyword') THEN 'keyword'
              ELSE 'semantic'
            END AS retrieval_mode
          FROM (
            SELECT * FROM semantic_candidates
            UNION ALL
            SELECT * FROM keyword_candidates
          ) candidates
          GROUP BY id, analysis_id, filename, chunk_index, content
        )
        SELECT
          id,
          analysis_id,
          filename,
          chunk_index,
          content,
          semantic_score,
          CASE
            WHEN keyword_score_raw <= 0 THEN 0
            ELSE keyword_score_raw / (keyword_score_raw + 1)
          END AS keyword_score,
          (
            semantic_score * 0.62 +
            CASE
              WHEN keyword_score_raw <= 0 THEN 0
              ELSE (keyword_score_raw / (keyword_score_raw + 1)) * 0.28
            END +
            coalesce(1.0 / (60 + semantic_rank), 0) * 0.05 +
            coalesce(1.0 / (60 + keyword_rank), 0) * 0.05
          ) AS hybrid_score,
          retrieval_mode
        FROM merged_candidates
        ORDER BY hybrid_score DESC
        LIMIT $5`,
      [analysisId, userId, embeddingToSql(embedding), query, candidateLimit],
    );

    const candidates = rows.map((row) => ({
      id: row.id,
      analysisId: row.analysis_id,
      filename: row.filename,
      chunkIndex: row.chunk_index,
      content: row.content,
      semanticScore: Number(row.semantic_score || 0),
      keywordScore: Number(row.keyword_score || 0),
      hybridScore: Number(row.hybrid_score || 0),
      retrievalMode: row.retrieval_mode || "hybrid",
    }));

    return rerankChunks(query, candidates, limit);
  } catch (error) {
    console.error("Stored RAG retrieval failed:");
    return retrieveRelevantChunksViaSupabase({ analysisId, userId, query, limit });
  }
}

export function buildInlineRetrievedChunks(text, query, limit = 4) {
  const queryTokens = new Set(
    String(query || "")
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean),
  );

  const candidates = chunkDocumentText(text)
    .map((chunk) => {
      const lowered = chunk.content.toLowerCase();
      const score = [...queryTokens].reduce(
        (sum, token) => sum + (lowered.includes(token) ? 1 : 0),
        0,
      );
      const keywordScore = keywordMatchScore(query, chunk.content);

      return {
        ...chunk,
        semanticScore: score,
        keywordScore,
        hybridScore: score * 0.65 + keywordScore * 0.35,
        retrievalMode: "inline-fallback",
      };
    })
    .filter((chunk) => chunk.semanticScore > 0 || chunk.keywordScore > 0)
    .map((chunk) => ({
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      semanticScore: chunk.semanticScore,
      keywordScore: chunk.keywordScore,
      hybridScore: chunk.hybridScore,
      retrievalMode: chunk.retrievalMode,
    }));

  return rerankChunks(query, candidates, limit);
}
