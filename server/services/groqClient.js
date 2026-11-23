import Groq from 'groq-sdk';

let groq = null;
let groqInitialized = false;

function initializeGroq() {
  if (groqInitialized) {
    return groq;
  }

  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
    try {
      groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 20_000, maxRetries: 0 });
    } catch (error) {
      console.error('Groq client initialization failed');
      groq = null;
    }
  } else {
    groq = null;
  }

  groqInitialized = true;
  return groq;
}

export class AIServiceError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'AIServiceError';
    this.status = status;
  }
}

export function requireGroq() {
  const client = initializeGroq();
  if (!client) throw new AIServiceError('AI processing is temporarily unavailable.', 503);
  return client;
}

export function completeWithGroq(client, options) {
  const model = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';
  const gptOssOptions = model.startsWith('openai/gpt-oss-')
    ? { reasoning_effort: 'low', include_reasoning: false }
    : {};
  return client.chat.completions.create({ ...options, ...gptOssOptions, model });
}
