import { AIServiceError, completeWithGroq, requireGroq } from './groqClient.js';
import { resolveOutputLanguage } from './analysis/languageDetection.js';

export async function translateText(text, targetLanguage) {
  if (targetLanguage === 'en') return text;
  const client = requireGroq();
  const language = resolveOutputLanguage(targetLanguage, { code: 'en', name: 'English' });
  if (language.code !== targetLanguage) throw new AIServiceError('That language is unsupported.', 400);

  try {
    const response = await completeWithGroq(client, {
      messages: [
        { role: 'system', content: `Translate the user's text into ${language.name}. Preserve its meaning and formatting. Return only the translation.` },
        { role: 'user', content: text },
      ],
      temperature: 0.2,
      max_completion_tokens: 4000,
    });
    const choice = response.choices[0];
    if (!choice?.message?.content?.trim() || choice.finish_reason === 'length') throw new Error('Incomplete translation');
    return choice.message.content;
  } catch {
    throw new AIServiceError('A complete translation could not be generated. Try a shorter document or try again shortly.');
  }
}
