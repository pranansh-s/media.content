import { SHARED_VERSION } from '@media-content/shared';

import { createApp } from './app';
import { DEFAULT_DB_PATH, openDatabase } from './db/database';
import { createImageStore } from './images';
import { GeminiProvider } from './providers/gemini-provider';

try {
  process.loadEnvFile?.();
} catch {}

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set — add it to server/.env (see server/.env.example)');
}

const imageStore = createImageStore();
const app = createApp({
  provider: new GeminiProvider({ saveImage: imageStore.save }),
  db: openDatabase(process.env.DB_PATH ?? DEFAULT_DB_PATH),
  imageDir: imageStore.dir,
});
const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`media.content server (shared v${SHARED_VERSION}) listening on :${port}`);
});
