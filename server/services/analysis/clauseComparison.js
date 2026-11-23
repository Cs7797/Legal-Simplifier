import { completeWithGroq } from '../groqClient.js';
import { stripCodeFences } from '../parsing/clauseParsing.js';

const ALLOWED_CHANGE_TYPES = new Set(['ADDED', 'REMOVED', 'MODIFIED']);
const ALLOWED_IMPACT_LEVELS = new Set(['HIGH', 'MEDIUM', 'LOW']);

function normalizeChange(change, index) {
  return {
    clause: String(change?.clause || `Clause ${index + 1}`).trim(),
    type: ALLOWED_CHANGE_TYPES.has(change?.type) ? change.type : 'MODIFIED',
    impact: ALLOWED_IMPACT_LEVELS.has(change?.impact) ? change.impact : 'LOW',
  };
}

function buildFallbackChanges(docA = {}, docB = {}) {
  const titlesA = new Map((docA.clauses || []).map((clause) => [clause.title?.toLowerCase(), clause]));
  const titlesB = new Map((docB.clauses || []).map((clause) => [clause.title?.toLowerCase(), clause]));
  const changes = [];

  for (const [key, clause] of titlesB.entries()) {
    if (!titlesA.has(key)) {
      changes.push({ clause: clause.title, type: 'ADDED', impact: clause.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM' });
    }
  }

  for (const [key, clause] of titlesA.entries()) {
    if (!titlesB.has(key)) {
      changes.push({ clause: clause.title, type: 'REMOVED', impact: clause.riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM' });
    }
  }

  return changes.slice(0, 10).map(normalizeChange);
}

export async function compareClauseSets(docA, docB, groqClient) {
  const fallbackChanges = buildFallbackChanges(docA, docB);

  if (!groqClient || !docA.riskScore || !docB.riskScore) {
    return { changes: fallbackChanges, comparisonStatus: 'partial' };
  }

  try {
    const completion = await completeWithGroq(groqClient, {
      messages: [
        {
          role: 'system',
          content: `You compare two legal documents semantically.

Return valid JSON only.

Schema:
{
  "changes": [
    {
      "clause": "clause title",
      "type": "ADDED" | "REMOVED" | "MODIFIED",
      "impact": "HIGH" | "MEDIUM" | "LOW"
    }
  ]
}

Rules:
- Detect semantic differences, not just string changes
- Focus on clause titles and meaning
- Prefer the most meaningful contractual changes
- Keep the list concise and high signal
- Use ADDED when the second document introduces a clause or obligation
- Use REMOVED when the second document removes a prior clause or protection
- Use MODIFIED when the meaning, obligations, rights, or risk profile changed`,
        },
        {
          role: 'user',
          content: JSON.stringify(
            {
              docA: {
                filename: docA.filename,
                simplified: docA.simplified,
                clauses: (docA.clauses || []).map((clause) => ({
                  title: clause.title,
                  simplified: clause.simplified,
                  riskLevel: clause.riskLevel,
                })),
              },
              docB: {
                filename: docB.filename,
                simplified: docB.simplified,
                clauses: (docB.clauses || []).map((clause) => ({
                  title: clause.title,
                  simplified: clause.simplified,
                  riskLevel: clause.riskLevel,
                })),
              },
            },
            null,
            2
          ),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_completion_tokens: 2600,
      top_p: 1,
      stream: false,
    });

    const parsed = JSON.parse(stripCodeFences(completion.choices[0]?.message?.content || '{}'));
    if (!Array.isArray(parsed?.changes)) return { changes: fallbackChanges, comparisonStatus: 'partial' };
    const changes = parsed.changes.map(normalizeChange).slice(0, 12);

    return {
      changes,
      comparisonStatus: 'complete',
    };
  } catch (error) {
    console.error('Clause comparison failed:');
    return { changes: fallbackChanges, comparisonStatus: 'partial' };
  }
}
