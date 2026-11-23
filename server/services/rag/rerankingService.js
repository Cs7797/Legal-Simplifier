const LEGAL_SIGNAL_TERMS = new Set([
  "breach",
  "clause",
  "contract",
  "damages",
  "deadline",
  "fee",
  "indemnify",
  "indemnity",
  "liability",
  "notice",
  "payment",
  "penalty",
  "renewal",
  "risk",
  "terminate",
  "termination",
  "waive",
  "warranty",
]);

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function clampScore(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function lexicalCoverageScore(queryTokens, contentTokens) {
  if (queryTokens.length === 0 || contentTokens.length === 0) {
    return 0;
  }

  const contentSet = new Set(contentTokens);
  const uniqueQueryTokens = [...new Set(queryTokens)];
  const matched = uniqueQueryTokens.filter((token) => contentSet.has(token));
  return matched.length / uniqueQueryTokens.length;
}

function phraseMatchScore(query, content) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const normalizedContent = String(content || "").toLowerCase();

  if (normalizedQuery.length < 8 || !normalizedContent) {
    return 0;
  }

  if (normalizedContent.includes(normalizedQuery)) {
    return 1;
  }

  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
  if (queryWords.length < 3) {
    return 0;
  }

  const phraseWindows = [];
  for (let index = 0; index <= queryWords.length - 3; index += 1) {
    phraseWindows.push(queryWords.slice(index, index + 3).join(" "));
  }

  const matches = phraseWindows.filter((window) => normalizedContent.includes(window));
  return phraseWindows.length ? matches.length / phraseWindows.length : 0;
}

function legalSignalScore(queryTokens, contentTokens) {
  const querySignals = queryTokens.filter((token) => LEGAL_SIGNAL_TERMS.has(token));
  if (querySignals.length === 0) {
    return 0;
  }

  const contentSet = new Set(contentTokens);
  const matchedSignals = querySignals.filter((token) => contentSet.has(token));
  return matchedSignals.length / querySignals.length;
}

export function rerankChunks(query, candidates = [], limit = 5) {
  const queryTokens = tokenize(query);

  return candidates
    .map((candidate) => {
      const contentTokens = tokenize(candidate.content);
      const semanticScore = clampScore(Number(candidate.semanticScore ?? candidate.similarity ?? 0));
      const keywordScore = clampScore(Number(candidate.keywordScore ?? 0));
      const hybridScore = clampScore(Number(candidate.hybridScore ?? semanticScore));
      const coverageScore = lexicalCoverageScore(queryTokens, contentTokens);
      const phraseScore = phraseMatchScore(query, candidate.content);
      const legalScore = legalSignalScore(queryTokens, contentTokens);

      const rerankScore = clampScore(
        hybridScore * 0.55 +
          semanticScore * 0.2 +
          keywordScore * 0.1 +
          coverageScore * 0.1 +
          phraseScore * 0.03 +
          legalScore * 0.02,
      );

      return {
        ...candidate,
        semanticScore,
        keywordScore,
        hybridScore,
        rerankScore,
        similarity: rerankScore,
      };
    })
    .sort((a, b) => b.rerankScore - a.rerankScore)
    .slice(0, limit);
}
