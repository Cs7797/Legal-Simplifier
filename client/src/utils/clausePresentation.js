export const RISK_STYLES = {
  HIGH: {
    label: 'High risk',
    dot: 'bg-red-500',
    badge: 'border-red-500/20 bg-red-500/10 text-red-200',
    border: 'border-red-500/20',
  },
  MEDIUM: {
    label: 'Medium risk',
    dot: 'bg-amber-500',
    badge: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
    border: 'border-amber-500/20',
  },
  SAFE: {
    label: 'Low risk',
    dot: 'bg-emerald-500',
    badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
    border: 'border-emerald-500/20',
  },
};

export const RISK_ORDER = {
  HIGH: 0,
  MEDIUM: 1,
  SAFE: 2,
};

function normalizeRiskLevel(level) {
  return level === 'HIGH' || level === 'MEDIUM' || level === 'SAFE' ? level : 'SAFE';
}

export function mapClausesForDisplay(clauses) {
  if (!Array.isArray(clauses)) {
    return [];
  }

  return clauses.map((clause, index) => ({
    ...clause,
    title: clause?.title || `Clause ${index + 1}`,
    originalExcerpt: clause?.originalExcerpt || '',
    simplified: clause?.simplified || '',
    riskLevel: normalizeRiskLevel(clause?.riskLevel),
    riskReason: clause?.riskReason || 'Risk explanation unavailable.',
  }));
}
