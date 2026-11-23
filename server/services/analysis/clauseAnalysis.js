import { completeWithGroq } from '../groqClient.js';
import { parseClauseBreakdownResponse } from '../parsing/clauseParsing.js';

const CLAUSE_BREAKDOWN_PROMPT = `You are analyzing a legal document for a product called Legal Simplifier.

Return valid JSON only. Do not wrap it in markdown fences. Do not include commentary before or after the JSON.

Output schema:
{
  "clauses": [
    {
      "title": "short clause title",
      "originalExcerpt": "short excerpt from one clause only",
      "simplified": "2-4 sentence plain-English explanation of that same clause",
      "riskLevel": "HIGH" | "MEDIUM" | "SAFE",
      "riskReason": "1-2 sentence explanation tied to the clause text",
      "startOffset": 123,
      "endOffset": 456,
      "page": 2
    }
  ]
}

Rules:
- Extract up to 8 of the most important clauses or sections
- Each item must represent one clear clause boundary; do not merge unrelated clauses
- Prefer headings, numbered sections, obligations, limitations, termination rights, liability allocations, payment terms, confidentiality, IP, dispute terms, renewals, and remedies
- Base riskLevel on the legal effect of the clause, not just keywords
- HIGH: material liability, unilateral power, indemnity, waiver, termination trigger, exclusivity, auto-renewal, major payment exposure, strong remedies, or severe downside
- MEDIUM: meaningful duty, deadline, notice requirement, restriction, confidentiality duty, payment mechanics, approval gate, or operational commitment
- SAFE: mostly descriptive, definitional, procedural, or low-impact language
- riskReason must explain why the chosen riskLevel follows from the clause itself
- Keep JSON strict and syntactically valid
- If position mapping is not confidently available, omit startOffset, endOffset, and page`;

async function generateClauseBreakdown(text, groqClient, options = {}) {
  const outputLanguage = options.outputLanguage?.name || 'English';

  try {
    const completion = await completeWithGroq(groqClient, {
      messages: [
        {
          role: 'system',
          content: `${CLAUSE_BREAKDOWN_PROMPT}

Additional instruction:
- Write "title", "simplified", and "riskReason" in ${outputLanguage}
- Keep "riskLevel" values exactly as HIGH, MEDIUM, or SAFE`,
        },
        {
          role: 'user',
          content: `Analyze this legal document and extract the most important clause breakdowns:\n\n${text}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_completion_tokens: 2600,
      top_p: 1,
      stream: false,
    });

    const rawContent = completion.choices[0]?.message?.content || '';
    return parseClauseBreakdownResponse(rawContent);
  } catch {
    console.error('Clause breakdown generation failed');
    return [];
  }
}

export { generateClauseBreakdown };
