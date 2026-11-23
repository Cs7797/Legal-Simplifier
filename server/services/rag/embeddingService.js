import crypto from 'crypto';

const EMBEDDING_DIMENSIONS = 256;

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function hashTokenToIndex(token) {
  const hash = crypto.createHash('sha256').update(token).digest();
  return hash.readUInt32BE(0) % EMBEDDING_DIMENSIONS;
}

function normalizeVector(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) {
    return vector;
  }

  return vector.map((value) => Number((value / magnitude).toFixed(8)));
}

export function createEmbeddingVector(text) {
  const tokens = tokenize(text);
  const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);

  for (const token of tokens) {
    const index = hashTokenToIndex(token);
    vector[index] += 1;
  }

  return normalizeVector(vector);
}

export function embeddingToSql(vector) {
  return `[${vector.map((value) => Number(value).toFixed(8)).join(',')}]`;
}

export { EMBEDDING_DIMENSIONS };
