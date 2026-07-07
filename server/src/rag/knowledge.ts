import type { Brand, GeneratableChannel } from '@media-content/shared';
import { cosineSimilarity } from 'ai';

import type { Store } from '../db/store';
import { chunkText } from './chunker';
import { extractUrls, fetchUrlText } from './fetcher';

export type Embedder = (values: string[]) => Promise<Float32Array[]>;

const REVISION_CHUNK_CAP = 200;
const SIMILARITY_FLOOR = 0.25;

interface IngestOptions {
  fetchText?: (url: string) => Promise<string | null>;
}

export async function ingestBrand(
  store: Store,
  brand: Brand,
  embedder: Embedder | null,
  options: IngestOptions = {}
): Promise<void> {
  if (!embedder) return;
  const fetchText = options.fetchText ?? fetchUrlText;
  const references = brand.references ?? '';

  const referenceChunks = chunkText(references);
  const urls = extractUrls(references);
  const urlChunks: { ref: string; text: string }[] = [];
  for (const url of urls) {
    const text = await fetchText(url);
    if (text) {
      for (const chunk of chunkText(text, { maxChunks: 20 })) {
        urlChunks.push({ ref: url, text: chunk });
      }
    }
  }

  const texts = [...referenceChunks, ...urlChunks.map(chunk => chunk.text)];
  const embeddings = texts.length ? await embedder(texts) : [];
  if (embeddings.length !== texts.length) {
    throw new Error(`Embedder returned ${embeddings.length} embeddings for ${texts.length} inputs`);
  }

  store.replaceChunks(
    brand.id,
    'references',
    referenceChunks.map((text, index) => ({ ref: null, text, embedding: embeddings[index]! }))
  );
  store.replaceChunks(
    brand.id,
    'url',
    urlChunks.map((chunk, index) => ({
      ref: chunk.ref,
      text: chunk.text,
      embedding: embeddings[referenceChunks.length + index]!,
    }))
  );
}

export async function ingestRevision(
  store: Store,
  brandId: string,
  channel: GeneratableChannel,
  body: string,
  embedder: Embedder | null,
  cap = REVISION_CHUNK_CAP
): Promise<void> {
  if (!embedder) return;
  if (store.countChunks(brandId, 'revision') >= cap) return;
  const text = body.slice(0, 1500);
  const [embedding] = await embedder([text]);
  if (!embedding) return;
  store.appendChunkIfUnderCap(brandId, 'revision', channel, text, embedding, cap);
}

export async function retrieve(
  store: Store,
  brandId: string,
  query: string,
  embedder: Embedder | null,
  k = 6
): Promise<string[]> {
  if (!embedder) return [];
  const chunks = store.listChunks(brandId);
  if (chunks.length === 0) return [];
  let queryEmbedding: Float32Array | undefined;
  try {
    [queryEmbedding] = await embedder([query]);
  } catch {
    return [];
  }
  if (!queryEmbedding) return [];
  return chunks
    .map(chunk => ({
      text: chunk.text,
      score: cosineSimilarity(Array.from(queryEmbedding!), Array.from(chunk.embedding)),
    }))
    .filter(candidate => candidate.score >= SIMILARITY_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(candidate => candidate.text);
}
