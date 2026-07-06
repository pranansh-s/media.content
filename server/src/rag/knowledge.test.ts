import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openDatabase } from '../db/database';
import { createStore, type Store } from '../db/store';
import { DEFAULT_BRAND } from '../fixtures/brand';
import { ingestBrand, ingestRevision, retrieve, type Embedder } from './knowledge';

const vectorFor = (text: string): Float32Array => {
  const lower = text.toLowerCase();
  return new Float32Array([
    lower.includes('pager') ? 1 : 0,
    lower.includes('dashboard') ? 1 : 0,
    lower.includes('pricing') ? 1 : 0,
    1,
  ]);
};

const embedder: Embedder = async values => values.map(vectorFor);

let store: Store;

beforeEach(() => {
  store = createStore(openDatabase(':memory:'));
  store.seedDefaultBrand();
});

describe('ingestBrand', () => {
  it('chunks and embeds references text', async () => {
    await ingestBrand(store, { ...DEFAULT_BRAND, references: 'We built a pager.\n\nDashboards load fast.' }, embedder, {
      fetchText: async () => null,
    });
    expect(store.countChunks(DEFAULT_BRAND.id, 'references')).toBeGreaterThan(0);
  });

  it('fetches urls found in references and stores their chunks', async () => {
    const fetchText = vi.fn().mockResolvedValue('Acme docs describe the pager escalation flow.');
    await ingestBrand(store, { ...DEFAULT_BRAND, references: 'https://acme.dev/docs' }, embedder, { fetchText });
    expect(fetchText).toHaveBeenCalledWith('https://acme.dev/docs');
    expect(store.countChunks(DEFAULT_BRAND.id, 'url')).toBeGreaterThan(0);
  });

  it('replaces prior chunks on re-ingest', async () => {
    const brand = { ...DEFAULT_BRAND, references: 'First version of references.' };
    await ingestBrand(store, brand, embedder, { fetchText: async () => null });
    await ingestBrand(store, brand, embedder, { fetchText: async () => null });
    expect(store.countChunks(DEFAULT_BRAND.id, 'references')).toBe(1);
  });

  it('does nothing without an embedder', async () => {
    await ingestBrand(store, DEFAULT_BRAND, null, { fetchText: async () => null });
    expect(store.countChunks(DEFAULT_BRAND.id)).toBe(0);
  });

  it('clears chunks when references are emptied', async () => {
    await ingestBrand(store, { ...DEFAULT_BRAND, references: 'Some references.' }, embedder, {
      fetchText: async () => null,
    });
    await ingestBrand(store, { ...DEFAULT_BRAND, references: null }, embedder, { fetchText: async () => null });
    expect(store.countChunks(DEFAULT_BRAND.id)).toBe(0);
  });
});

describe('ingestRevision', () => {
  it('appends revision chunks up to the cap', async () => {
    await ingestRevision(store, DEFAULT_BRAND.id, 'tweet', 'We shipped the pager rewrite.', embedder, 2);
    await ingestRevision(store, DEFAULT_BRAND.id, 'linkedin', 'Dashboards are 3x faster.', embedder, 2);
    await ingestRevision(store, DEFAULT_BRAND.id, 'reddit', 'Pricing stays flat.', embedder, 2);
    expect(store.countChunks(DEFAULT_BRAND.id, 'revision')).toBe(2);
  });
});

describe('retrieve', () => {
  it('returns the most similar chunks first', async () => {
    await ingestBrand(
      store,
      { ...DEFAULT_BRAND, references: 'The pager escalates in seconds.\n\nOur pricing is usage based.' },
      embedder,
      { fetchText: async () => null },
    );
    const results = await retrieve(store, DEFAULT_BRAND.id, 'tell me about the pager', embedder, 1);
    expect(results).toHaveLength(1);
    expect(results[0]).toContain('pager');
  });

  it('returns nothing without an embedder', async () => {
    await expect(retrieve(store, DEFAULT_BRAND.id, 'pager', null, 3)).resolves.toEqual([]);
  });

  it('returns nothing when the brand has no chunks', async () => {
    await expect(retrieve(store, DEFAULT_BRAND.id, 'pager', embedder, 3)).resolves.toEqual([]);
  });
});
