import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export const DEFAULT_IMAGE_DIR = join(process.cwd(), 'data', 'images');

export function createImageStore(dir: string = DEFAULT_IMAGE_DIR) {
  mkdirSync(dir, { recursive: true });
  return {
    dir,
    async save(bytes: Uint8Array, mediaType: string): Promise<string> {
      const file = `${randomUUID()}.${EXTENSIONS[mediaType] ?? 'png'}`;
      await writeFile(join(dir, file), bytes);
      return `/api/images/${file}`;
    },
  };
}

export type ImageStore = ReturnType<typeof createImageStore>;
