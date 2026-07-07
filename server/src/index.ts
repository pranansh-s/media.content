import { SHARED_VERSION } from '@media-content/shared';

import { createApp } from './app';
import { DEFAULT_DB_PATH, openDatabase } from './db/database';
import { createImageStore } from './images';
import { createProviderFromEnv, isGeminiEnabled } from './providers';

try {
  process.loadEnvFile?.();
} catch {}

const imageStore = createImageStore();
const app = createApp({
  provider: createProviderFromEnv({ saveImage: imageStore.save }),
  db: openDatabase(process.env.DB_PATH ?? DEFAULT_DB_PATH),
  imageDir: imageStore.dir,
});
const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  const mode = isGeminiEnabled() ? 'gemini' : 'fixtures';
  console.log(`media.content server (shared v${SHARED_VERSION}, provider: ${mode}) listening on :${port}`);
});
