import { completeWithGroq } from '../groqClient.js';
import { stripCodeFences } from "../parsing/clauseParsing.js";

function buildFallbackAdvice(
  clauses = [],
  riskScore,
  outputLanguage = { name: "English" },
) {
  const highRiskClauses = clauses
    .filter((clause) => clause?.riskLevel === "HIGH")
    .slice(0, 2);
  const mediumRiskClauses = clauses
    .filter((clause) => clause?.riskLevel === "MEDIUM")
    .slice(0, 2);
  const advice = [];

  const languageCode = outputLanguage.code || "en";

  // Fallback advice in different languages
  const adviceTemplates = {
    en: {
      reviewHigh: (titles) => `Review ${titles} carefully before signing.`,
      negotiate: () =>
        "Negotiate any one-sided liability, indemnity, termination, or payment exposure that feels too broad.",
      confirmMedium: (titles) => `Confirm the business impact of ${titles}.`,
      checkDeadlines: () =>
        "Check deadlines, notice periods, renewal mechanics, and approval steps against how you actually operate.",
      consultHighRisk: () =>
        "Consult a lawyer before signing if the agreement creates significant liability or hard-to-exit obligations.",
      consultGeneral: () =>
        "Consult a lawyer if there is ambiguity around liability, data use, exclusivity, or dispute resolution.",
    },
    es: {
      reviewHigh: (titles) =>
        `Revise ${titles} cuidadosamente antes de firmar.`,
      negotiate: () =>
        "Negocie cualquier responsabilidad unilateral, indemnidad, terminación o exposición de pago que parezca demasiado amplia.",
      confirmMedium: (titles) => `Confirme el impacto comercial de ${titles}.`,
      checkDeadlines: () =>
        "Verifique plazos, períodos de notificación, mecánicas de renovación y pasos de aprobación según cómo opera realmente.",
      consultHighRisk: () =>
        "Consulte a un abogado antes de firmar si el acuerdo crea responsabilidad significativa u obligaciones difíciles de salir.",
      consultGeneral: () =>
        "Consulte a un abogado si hay ambigüedad en responsabilidad, uso de datos, exclusividad o resolución de disputas.",
    },
    fr: {
      reviewHigh: (titles) =>
        `Examinez ${titles} attentivement avant de signer.`,
      negotiate: () =>
        "Négociez toute responsabilité unilatérale, indemnité, résiliation ou exposition aux paiements qui semble trop large.",
      confirmMedium: (titles) => `Confirmez l'impact commercial de ${titles}.`,
      checkDeadlines: () =>
        "Vérifiez les délais, les périodes de notification, les mécanismes de renouvellement et les étapes d'approbation selon votre fonctionnement réel.",
      consultHighRisk: () =>
        "Consultez un avocat avant de signer si l'accord crée une responsabilité importante ou des obligations difficiles à quitter.",
      consultGeneral: () =>
        "Consultez un avocat s'il existe une ambiguïté concernant la responsabilité, l'utilisation des données, l'exclusivité ou la résolution des litiges.",
    },
    de: {
      reviewHigh: (titles) =>
        `Überprüfen Sie ${titles} sorgfältig, bevor Sie unterzeichnen.`,
      negotiate: () =>
        "Verhandeln Sie über einseitige Haftung, Schadensersatz, Kündigung oder Zahlungsrisiken, die zu umfassend erscheinen.",
      confirmMedium: (titles) =>
        `Bestätigen Sie die geschäftlichen Auswirkungen von ${titles}.`,
      checkDeadlines: () =>
        "Überprüfen Sie Fristen, Benachrichtigungsfristen, Verlängerungsmechanismen und Genehmigungsschritte anhand Ihrer tatsächlichen Geschäftstätigkeit.",
      consultHighRisk: () =>
        "Konsultieren Sie einen Anwalt, bevor Sie unterschreiben, wenn die Vereinbarung erhebliche Haftung oder schwer zu verlassende Verpflichtungen mit sich bringt.",
      consultGeneral: () =>
        "Konsultieren Sie einen Anwalt, wenn es Mehrdeutigkeiten bezüglich Haftung, Datennutzung, Exklusivität oder Streitbeilegung gibt.",
    },
  };

  const templates = adviceTemplates[languageCode] || adviceTemplates.en;

  if (highRiskClauses.length > 0) {
    const titles = highRiskClauses.map((clause) => clause.title).join(" and ");
    advice.push(templates.reviewHigh(titles));
    advice.push(templates.negotiate());
  }

  if (mediumRiskClauses.length > 0) {
    const titles = mediumRiskClauses
      .map((clause) => clause.title)
      .join(" and ");
    advice.push(templates.confirmMedium(titles));
  }

  advice.push(templates.checkDeadlines());

  if (riskScore?.label === "High") {
    advice.push(templates.consultHighRisk());
  } else {
    advice.push(templates.consultGeneral());
  }

  return advice.slice(0, 6);
}

export async function generateActionableAdvice({
  text,
  clauses = [],
  simplified,
  outputLanguage,
  groqClient,
  riskScore,
}) {
  const fallbackAdvice = buildFallbackAdvice(clauses, riskScore, outputLanguage);

  if (!groqClient) {
    return fallbackAdvice;
  }

  try {
    const completion = await completeWithGroq(groqClient, {
      messages: [
        {
          role: "system",
          content: `You are generating concise actionable advice for a legal document review.

Return valid JSON only.

Schema:
{
  "advice": [
    "bullet point"
  ]
}

Rules:
- Return 4 to 6 bullet points
- Keep each point practical and concise
- Cover what to review, what to negotiate, and when to consult a lawyer
- Use ${outputLanguage.name}
- Do not include markdown bullet markers inside the JSON strings`,
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              simplified,
              riskScore,
              clauses: clauses.map((clause) => ({
                title: clause.title,
                simplified: clause.simplified,
                riskLevel: clause.riskLevel,
                riskReason: clause.riskReason,
              })),
              sourceExcerpt: String(text || "").slice(0, 5000),
            },
            null,
            2,
          ),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_completion_tokens: 1100,
      top_p: 1,
      stream: false,
    });

    const parsed = JSON.parse(
      stripCodeFences(completion.choices[0]?.message?.content || "{}"),
    );
    const advice = Array.isArray(parsed?.advice)
      ? parsed.advice
          .map((item) => String(item || "").trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];

    return advice.length >= 4 ? advice : fallbackAdvice;
  } catch (error) {
    console.error("Actionable advice generation failed:");
    return fallbackAdvice;
  }
}
