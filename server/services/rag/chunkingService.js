const DEFAULT_MAX_CHUNK_LENGTH = 1200;
const DEFAULT_OVERLAP_LENGTH = 180;

function sanitizeChunkText(text) {
  return String(text || '').replace(/\r/g, '').replace(/\s+/g, ' ').trim();
}

function splitByParagraph(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((part) => sanitizeChunkText(part))
    .filter(Boolean);
}

function createChunkRecord({ content, index, total }) {
  return {
    chunkIndex: index,
    content,
    metadata: {
      index,
      total,
    },
  };
}

export function chunkDocumentText(text, options = {}) {
  const maxChunkLength = Math.max(1, options.maxChunkLength ?? DEFAULT_MAX_CHUNK_LENGTH);
  const overlapLength = Math.max(0, Math.min(maxChunkLength - 1, options.overlapLength ?? DEFAULT_OVERLAP_LENGTH));
  const paragraphs = splitByParagraph(text);

  if (paragraphs.length === 0) {
    const fallback = sanitizeChunkText(text);
    return fallback ? [createChunkRecord({ content: fallback, index: 0, total: 1 })] : [];
  }

  const chunks = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const nextCandidate = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;

    if (nextCandidate.length <= maxChunkLength) {
      currentChunk = nextCandidate;
      continue;
    }

    if (currentChunk) {
      const overlap = overlapLength ? currentChunk.slice(-overlapLength) : '';
      if (currentChunk.length > overlapLength) chunks.push(currentChunk);
      currentChunk = sanitizeChunkText(`${overlap} ${paragraph}`);
    } else {
      currentChunk = paragraph;
    }

    while (currentChunk.length > maxChunkLength) {
      chunks.push(currentChunk.slice(0, maxChunkLength));
      currentChunk = currentChunk.slice(maxChunkLength - overlapLength);
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  const cleanedChunks = chunks.map((chunk) => sanitizeChunkText(chunk)).filter(Boolean);
  return cleanedChunks.map((content, index) =>
    createChunkRecord({ content, index, total: cleanedChunks.length })
  );
}
