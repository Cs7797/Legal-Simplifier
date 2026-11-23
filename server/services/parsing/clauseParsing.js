const ALLOWED_RISK_LEVELS = new Set(['HIGH', 'MEDIUM', 'SAFE']);

function sanitizeExcerpt(text, maxLength = 240) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function stripCodeFences(value) {
  return String(value || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function toOptionalNumber(value) {
  return Number.isFinite(value) ? value : undefined;
}

function defaultRiskReason(level) {
  if (level === 'HIGH') {
    return 'This clause creates material legal or commercial downside if triggered or accepted as written.';
  }

  if (level === 'MEDIUM') {
    return 'This clause creates a meaningful obligation, restriction, or process that still needs review.';
  }

  return 'This clause appears mostly descriptive or low impact based on the extracted text.';
}

function normalizeClause(clause, index, fallbackClause = {}) {
  const riskLevel = ALLOWED_RISK_LEVELS.has(clause?.riskLevel) ? clause.riskLevel : (fallbackClause.riskLevel || 'SAFE');
  const normalizedClause = {
    title: String(clause?.title || fallbackClause.title || `Clause ${index + 1}`).trim(),
    originalExcerpt: sanitizeExcerpt(clause?.originalExcerpt || fallbackClause.originalExcerpt || ''),
    simplified: String(clause?.simplified || fallbackClause.simplified || '').trim(),
    riskLevel,
    riskReason: String(clause?.riskReason || fallbackClause.riskReason || defaultRiskReason(riskLevel)).trim(),
  };

  const startOffset = toOptionalNumber(clause?.startOffset ?? fallbackClause.startOffset);
  const endOffset = toOptionalNumber(clause?.endOffset ?? fallbackClause.endOffset);
  const page = toOptionalNumber(clause?.page ?? fallbackClause.page);

  if (startOffset !== undefined) {
    normalizedClause.startOffset = startOffset;
  }

  if (endOffset !== undefined) {
    normalizedClause.endOffset = endOffset;
  }

  if (page !== undefined) {
    normalizedClause.page = page;
  }

  return normalizedClause;
}

function parseClauseBreakdownResponse(rawContent) {
  const parsed = JSON.parse(stripCodeFences(rawContent));
  if (!Array.isArray(parsed?.clauses)) throw new Error('Invalid clause response');

  const clauses = parsed.clauses.slice(0, 8);
  if (!clauses.every((clause) =>
    ALLOWED_RISK_LEVELS.has(clause?.riskLevel) &&
    ['title', 'originalExcerpt', 'simplified', 'riskReason'].every(
      (key) => typeof clause[key] === 'string' && clause[key].trim()
    )
  )) {
    throw new Error('Invalid clause classification');
  }
  return clauses.map((clause, index) => normalizeClause(clause, index));
}

export {
  defaultRiskReason,
  normalizeClause,
  parseClauseBreakdownResponse,
  sanitizeExcerpt,
  stripCodeFences,
};
