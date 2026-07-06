import { google } from '@ai-sdk/google';
import { embedMany } from 'ai';

import type { Embedder } from './knowledge';

export function createEmbedderFromEnv(): Embedder | null {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return null;
  const model = google.embedding(process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001');
  return async values => {
    const { embeddings } = await embedMany({ model, values, maxRetries: 2 });
    return embeddings.map(embedding => new Float32Array(embedding));
  };
}
