import type { Campaign } from '@media-content/shared';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_BRAND } from '../fixtures/brand';
import { openDatabase } from './database';
import { createStore, type Store } from './store';

let store: Store;

beforeEach(() => {
  store = createStore(openDatabase(':memory:'));
  store.seedDefaultBrand();
});

const campaignInput = (brandId: string): Campaign => {
  const id = randomUUID();
  return {
    id,
    brandId,
    prompt: 'launch v2',
    styleId: 'casual-dev',
    plan: null,
    channels: ['tweet', 'banner'],
    status: 'generating',
    assets: [
      { id: randomUUID(), campaignId: id, kind: 'text', channel: 'tweet', status: 'pending', revisions: [] },
      { id: randomUUID(), campaignId: id, kind: 'image', channel: 'banner', status: 'pending', revisions: [] },
    ],
    createdAt: new Date().toISOString(),
  };
};

describe('brands', () => {
  it('seeds the default brand once', () => {
    store.seedDefaultBrand();
    const brands = store.listBrands();
    expect(brands).toHaveLength(1);
    expect(brands[0]).toEqual(DEFAULT_BRAND);
  });

  it('creates and fetches a brand', () => {
    const created = store.createBrand({ name: 'Beacon', tagline: null, writingStyle: 'terse', references: null });
    expect(store.getBrand(created.id)).toEqual(created);
    expect(store.listBrands()).toHaveLength(2);
  });

  it('updates a brand preserving its id', () => {
    const updated = store.updateBrand(DEFAULT_BRAND.id, {
      name: 'Acme Labs',
      tagline: null,
      writingStyle: null,
      references: null,
    });
    expect(updated?.id).toBe(DEFAULT_BRAND.id);
    expect(updated?.name).toBe('Acme Labs');
    expect(store.getBrand(DEFAULT_BRAND.id)?.tagline).toBeNull();
  });

  it('returns null updating an unknown brand', () => {
    expect(
      store.updateBrand(randomUUID(), { name: 'x', tagline: null, writingStyle: null, references: null }),
    ).toBeNull();
  });

  it('refuses to delete the last brand', () => {
    expect(store.deleteBrand(DEFAULT_BRAND.id)).toBe('last_brand');
  });

  it('deletes a brand and cascades its campaigns', () => {
    const brand = store.createBrand({ name: 'Beacon', tagline: null, writingStyle: null, references: null });
    const campaign = campaignInput(brand.id);
    store.insertCampaign(campaign, null);
    expect(store.deleteBrand(brand.id)).toBe('deleted');
    expect(store.getBrand(brand.id)).toBeNull();
    expect(store.getCampaign(campaign.id)).toBeNull();
  });

  it('reports not_found for unknown ids', () => {
    store.createBrand({ name: 'Beacon', tagline: null, writingStyle: null, references: null });
    expect(store.deleteBrand(randomUUID())).toBe('not_found');
  });
});

describe('campaigns and assets', () => {
  it('round-trips a campaign with pending assets', () => {
    const campaign = campaignInput(DEFAULT_BRAND.id);
    store.insertCampaign(campaign, 'casual voice');
    expect(store.getCampaign(campaign.id)).toEqual(campaign);
  });

  it('lists campaign summaries newest first without assets', () => {
    const first = { ...campaignInput(DEFAULT_BRAND.id), createdAt: '2026-07-01T00:00:00.000Z' };
    const second = { ...campaignInput(DEFAULT_BRAND.id), createdAt: '2026-07-02T00:00:00.000Z' };
    store.insertCampaign(first, null);
    store.insertCampaign(second, null);
    const summaries = store.listCampaigns(DEFAULT_BRAND.id);
    expect(summaries.map(summary => summary.id)).toEqual([second.id, first.id]);
    expect(summaries[0]).not.toHaveProperty('assets');
  });

  it('persists a campaign plan', () => {
    const campaign = campaignInput(DEFAULT_BRAND.id);
    store.insertCampaign(campaign, null);
    const plan = { audience: 'devs', keyMessages: ['fast'], tone: 'calm', hooks: [] };
    store.setCampaignPlan(campaign.id, plan);
    expect(store.getCampaign(campaign.id)?.plan).toEqual(plan);
  });

  it('updates campaign and asset status', () => {
    const campaign = campaignInput(DEFAULT_BRAND.id);
    store.insertCampaign(campaign, null);
    store.setCampaignStatus(campaign.id, 'complete');
    store.updateAssetStatus(campaign.assets[0]!.id, 'failed');
    const loaded = store.getCampaign(campaign.id);
    expect(loaded?.status).toBe('complete');
    expect(loaded?.assets.find(asset => asset.id === campaign.assets[0]!.id)?.status).toBe('failed');
  });

  it('appends revisions in order and returns the rehydrated asset', () => {
    const campaign = campaignInput(DEFAULT_BRAND.id);
    store.insertCampaign(campaign, null);
    const assetId = campaign.assets[0]!.id;
    store.appendRevision(assetId, {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      prompt: null,
      source: 'generated',
      body: 'first',
    });
    const asset = store.appendRevision(assetId, {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      prompt: 'punchier',
      source: 'refined',
      body: 'second',
    });
    expect(asset.kind).toBe('text');
    expect(asset.revisions.map(revision => (revision as { body: string }).body)).toEqual(['first', 'second']);
    expect(asset.revisions.at(-1)?.source).toBe('refined');
  });

  it('returns full context for an asset', () => {
    const campaign = campaignInput(DEFAULT_BRAND.id);
    store.insertCampaign(campaign, 'resolved style text');
    const context = store.getAssetContext(campaign.assets[0]!.id);
    expect(context?.brand.id).toBe(DEFAULT_BRAND.id);
    expect(context?.campaign.prompt).toBe('launch v2');
    expect(context?.campaign.styleText).toBe('resolved style text');
    expect(context?.asset.channel).toBe('tweet');
  });

  it('returns null context for unknown assets', () => {
    expect(store.getAssetContext(randomUUID())).toBeNull();
  });
});

describe('brand chunks', () => {
  it('replaces chunks per source and round-trips embeddings', () => {
    const embedding = new Float32Array([0.25, -0.5, 1]);
    store.replaceChunks(DEFAULT_BRAND.id, 'references', [{ ref: null, text: 'we ship fast', embedding }]);
    store.replaceChunks(DEFAULT_BRAND.id, 'references', [
      { ref: null, text: 'we page you first', embedding },
      { ref: null, text: 'zero config', embedding },
    ]);
    store.appendChunk(DEFAULT_BRAND.id, 'revision', 'tweet', 'shipped v2 today', embedding);
    const chunks = store.listChunks(DEFAULT_BRAND.id);
    expect(chunks).toHaveLength(3);
    expect(chunks.map(chunk => chunk.source).sort()).toEqual(['references', 'references', 'revision']);
    expect(Array.from(chunks[0]!.embedding)).toEqual([0.25, -0.5, 1]);
  });

  it('counts revision chunks for capping', () => {
    const embedding = new Float32Array([1]);
    store.appendChunk(DEFAULT_BRAND.id, 'revision', 'tweet', 'a', embedding);
    store.appendChunk(DEFAULT_BRAND.id, 'revision', 'tweet', 'b', embedding);
    expect(store.countChunks(DEFAULT_BRAND.id, 'revision')).toBe(2);
    expect(store.countChunks(DEFAULT_BRAND.id)).toBe(2);
  });
});
