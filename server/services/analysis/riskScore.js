const RISK_POINTS = {
  HIGH: 3,
  MEDIUM: 2,
  SAFE: 1,
};

export function calculateDocumentRiskScore(clauses = []) {
  const breakdown = clauses.reduce(
    (accumulator, clause) => {
      const level = clause?.riskLevel === 'HIGH' || clause?.riskLevel === 'MEDIUM' ? clause.riskLevel : 'SAFE';
      accumulator[level.toLowerCase()] += 1;
      return accumulator;
    },
    { high: 0, medium: 0, safe: 0 }
  );

  const totalClauses = breakdown.high + breakdown.medium + breakdown.safe;

  if (totalClauses === 0) return null;

  const weightedTotal =
    breakdown.high * RISK_POINTS.HIGH +
    breakdown.medium * RISK_POINTS.MEDIUM +
    breakdown.safe * RISK_POINTS.SAFE;

  const normalizedScore = Number(((weightedTotal / (totalClauses * RISK_POINTS.HIGH)) * 10).toFixed(1));
  const label = normalizedScore >= 7 ? 'High' : normalizedScore >= 4 ? 'Moderate' : 'Low';

  return {
    score: normalizedScore,
    label,
    breakdown,
  };
}
