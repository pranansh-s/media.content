import {
  apiErrorSchema,
  assetResponseSchema,
  campaignEventSchema,
  getBrandResponseSchema,
  getCampaignResponseSchema,
  listBrandsResponseSchema,
  listCampaignsResponseSchema,
  type Campaign,
  type CampaignEvent,
} from '@media-content/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp, type AppOptions } from './app';
import { openDatabase } from './db/database';
import { DEFAULT_BRAND } from './fixtures/brand';
import type { ContentProvider, TextSpec } from './providers/content-provider';
import { FixtureProvider } from './providers/fixture-provider';

const app = (overrides: Partial<AppOptions> = {}) =>
  createApp({
    provider: new FixtureProvider({ latencyMs: 0 }),
    db: openDatabase(':memory:'),
    embedder: null,
    planner: async () => null,
    ...overrides,
  });

const brandId = DEFAULT_BRAND.id;

function parseSseEvents(body: string): CampaignEvent[] {
  return body
    .split('\n\n')
    .filter(frame => frame.startsWith('data: '))
    .map(frame => campaignEventSchema.parse(JSON.parse(frame.slice('data: '.length))));
}

function completedAssets(events: CampaignEvent[]) {
  return events.filter(
    (event): event is Extract<CampaignEvent, { type: 'asset' }> =>
      event.type === 'asset' && event.asset.status === 'complete',
  );
}

function firstTextBody(events: CampaignEvent[]): string {
  const assetEvent = completedAssets(events).find(event => event.asset.kind === 'text');
  return assetEvent?.asset.kind === 'text' ? (assetEvent.asset.revisions[0]?.body ?? '') : '';
}

async function createCampaign(server: ReturnType<typeof createApp>, body: Record<string, unknown>) {
  const res = await request(server).post(`/api/brands/${brandId}/campaigns`).send(body);
  return parseSseEvents(res.text);
}

describe('brand endpoints', () => {
  it('lists the seeded default brand', async () => {
    const res = await request(app()).get('/api/brands');
    expect(res.status).toBe(200);
    const parsed = listBrandsResponseSchema.parse(res.body);
    expect(parsed.brands).toHaveLength(1);
    expect(parsed.brands[0]!.id).toBe(brandId);
  });

  it('creates a brand and returns 201', async () => {
    const server = app();
    const res = await request(server)
      .post('/api/brands')
      .send({ name: 'Nimbus Labs', tagline: 'Weather for robots', writingStyle: null, references: null });
    expect(res.status).toBe(201);
    const created = getBrandResponseSchema.parse(res.body).brand;
    expect(created.name).toBe('Nimbus Labs');
    const list = await request(server).get('/api/brands');
    expect(listBrandsResponseSchema.parse(list.body).brands).toHaveLength(2);
  });

  it('gets a brand by id and 404s on unknown ids', async () => {
    const server = app();
    const res = await request(server).get(`/api/brands/${brandId}`);
    expect(getBrandResponseSchema.parse(res.body).brand.name).toBe(DEFAULT_BRAND.name);
    expect((await request(server).get(`/api/brands/${crypto.randomUUID()}`)).status).toBe(404);
  });

  it('updates a brand keeping its id, and uses it for the next generation', async () => {
    const server = app();
    const res = await request(server).put(`/api/brands/${brandId}`).send({
      name: 'Nimbus Labs',
      tagline: null,
      writingStyle: null,
      references: null,
    });
    expect(res.status).toBe(200);
    expect(getBrandResponseSchema.parse(res.body).brand.id).toBe(brandId);

    const events = await createCampaign(server, { prompt: 'Big launch', channels: ['tweet'] });
    expect(firstTextBody(events)).toContain('Nimbus Labs');
  });

  it('400s on an invalid brand payload', async () => {
    const res = await request(app()).put(`/api/brands/${brandId}`).send({ name: '' });
    expect(res.status).toBe(400);
    expect(apiErrorSchema.safeParse(res.body).success).toBe(true);
  });

  it('refuses to delete the last brand with 409', async () => {
    expect((await request(app()).delete(`/api/brands/${brandId}`)).status).toBe(409);
  });

  it('deletes a non-last brand with 204', async () => {
    const server = app();
    const created = await request(server)
      .post('/api/brands')
      .send({ name: 'Nimbus Labs', tagline: null, writingStyle: null, references: null });
    const id = getBrandResponseSchema.parse(created.body).brand.id;
    expect((await request(server).delete(`/api/brands/${id}`)).status).toBe(204);
    expect((await request(server).delete(`/api/brands/${id}`)).status).toBe(404);
  });
});

describe('POST /api/brands/:id/campaigns', () => {
  it('404s on an unknown brand', async () => {
    const res = await request(app())
      .post(`/api/brands/${crypto.randomUUID()}/campaigns`)
      .send({ prompt: 'Launch', channels: ['tweet'] });
    expect(res.status).toBe(404);
  });

  it('rejects an invalid payload with 400 and the shared error shape', async () => {
    const res = await request(app()).post(`/api/brands/${brandId}/campaigns`).send({ prompt: '', channels: [] });
    expect(res.status).toBe(400);
    expect(apiErrorSchema.safeParse(res.body).success).toBe(true);
  });

  it('streams campaign, generating, completed, and done events over SSE', async () => {
    const res = await request(app())
      .post(`/api/brands/${brandId}/campaigns`)
      .send({ prompt: 'We launched v2 of our monitoring tool', channels: ['tweet', 'linkedin', 'banner'] });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');

    const events = parseSseEvents(res.text);
    expect(events[0]?.type).toBe('campaign');
    expect(completedAssets(events)).toHaveLength(3);
    expect(events.some(event => event.type === 'asset' && event.asset.status === 'generating')).toBe(true);
    expect(events.at(-1)?.type).toBe('done');

    const campaign = (events[0] as Extract<CampaignEvent, { type: 'campaign' }>).campaign;
    expect(campaign.brandId).toBe(brandId);
    expect(campaign.assets.every(asset => asset.status === 'pending')).toBe(true);
  });

  it('persists the campaign with its assets and revisions', async () => {
    const server = app();
    const events = await createCampaign(server, { prompt: 'Launch', channels: ['tweet', 'banner'] });
    const campaignId = (events[0] as Extract<CampaignEvent, { type: 'campaign' }>).campaign.id;

    const res = await request(server).get(`/api/campaigns/${campaignId}`);
    expect(res.status).toBe(200);
    const stored = getCampaignResponseSchema.parse(res.body).campaign;
    expect(stored.status).toBe('complete');
    expect(stored.assets).toHaveLength(2);
    expect(stored.assets.every(asset => asset.revisions.length === 1)).toBe(true);
    expect(stored.assets.every(asset => asset.revisions[0]!.source === 'generated')).toBe(true);
  });

  it('marks assets failed and still finishes when the provider throws', async () => {
    const failing: ContentProvider = {
      generateText: async () => {
        throw new Error('provider down');
      },
      generateImage: async () => {
        throw new Error('provider down');
      },
    };
    const events = await createCampaign(app({ provider: failing }), { prompt: 'Launch', channels: ['tweet'] });
    expect(events.some(event => event.type === 'asset' && event.asset.status === 'failed')).toBe(true);
    expect(events.at(-1)?.type).toBe('done');
  });

  it('emits an error event on fatal failures', async () => {
    const server = app({
      planner: async () => {
        throw new Error('planner exploded');
      },
    });
    const events = await createCampaign(server, { prompt: 'Launch', channels: ['tweet'] });
    expect(events.some(event => event.type === 'error')).toBe(true);
  });

  it('stores the campaign plan produced by the planner', async () => {
    const plan = { audience: 'devs', keyMessages: ['fast'], tone: 'calm', hooks: [] };
    const server = app({ planner: async () => plan });
    const events = await createCampaign(server, { prompt: 'Launch', channels: ['tweet'] });
    const campaignId = (events[0] as Extract<CampaignEvent, { type: 'campaign' }>).campaign.id;
    const res = await request(server).get(`/api/campaigns/${campaignId}`);
    expect(getCampaignResponseSchema.parse(res.body).campaign.plan).toEqual(plan);
  });
});

describe('campaign styles', () => {
  it('threads a custom style into generated text', async () => {
    const events = await createCampaign(app(), {
      prompt: 'Launch announcement',
      channels: ['tweet'],
      customStyle: 'like a tired sysadmin',
    });
    expect(firstTextBody(events)).toContain('like a tired sysadmin');
  });

  it('threads a preset style into generated text', async () => {
    const events = await createCampaign(app(), {
      prompt: 'Launch announcement',
      channels: ['tweet'],
      styleId: 'formal-pr',
    });
    expect(firstTextBody(events)).toContain('press-release');
  });

  it("threads the brand's writing style when styleId is brand", async () => {
    const server = app();
    await request(server).put(`/api/brands/${brandId}`).send({
      name: 'Acme',
      tagline: null,
      writingStyle: 'terse haiku energy',
      references: null,
    });
    const events = await createCampaign(server, {
      prompt: 'Launch announcement',
      channels: ['tweet'],
      styleId: 'brand',
    });
    expect(firstTextBody(events)).toContain('terse haiku energy');
  });

  it('rejects customStyle combined with styleId', async () => {
    const res = await request(app())
      .post(`/api/brands/${brandId}/campaigns`)
      .send({ prompt: 'Launch', channels: ['tweet'], styleId: 'casual-dev', customStyle: 'dry humor' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/brands/:id/campaigns', () => {
  it('lists campaign summaries newest first', async () => {
    const server = app();
    await createCampaign(server, { prompt: 'first launch', channels: ['tweet'] });
    await createCampaign(server, { prompt: 'second launch', channels: ['tweet'] });
    const res = await request(server).get(`/api/brands/${brandId}/campaigns`);
    const parsed = listCampaignsResponseSchema.parse(res.body);
    expect(parsed.campaigns).toHaveLength(2);
    expect(parsed.campaigns[0]!.prompt).toBe('second launch');
  });

  it('404s on an unknown brand', async () => {
    expect((await request(app()).get(`/api/brands/${crypto.randomUUID()}/campaigns`)).status).toBe(404);
  });
});

describe('asset endpoints', () => {
  let server: ReturnType<typeof createApp>;
  let campaign: Campaign;
  let spy: { specs: TextSpec[] };

  beforeEach(async () => {
    const fixture = new FixtureProvider({ latencyMs: 0 });
    spy = { specs: [] };
    const provider: ContentProvider = {
      generateText: async spec => {
        spy.specs.push(spec);
        return fixture.generateText(spec);
      },
      generateImage: spec => fixture.generateImage(spec),
    };
    server = app({ provider });
    const events = await createCampaign(server, {
      prompt: 'Launch announcement',
      channels: ['tweet'],
      styleId: 'formal-pr',
    });
    campaign = (events[0] as Extract<CampaignEvent, { type: 'campaign' }>).campaign;
  });

  it('refines with the original campaign prompt and style', async () => {
    const assetId = campaign.assets[0]!.id;
    const res = await request(server).post(`/api/assets/${assetId}/refine`).send({ prompt: 'make it punchier' });

    expect(res.status).toBe(200);
    const parsed = assetResponseSchema.parse(res.body);
    expect(parsed.asset.revisions).toHaveLength(2);
    expect(parsed.asset.revisions.at(-1)?.prompt).toBe('make it punchier');
    expect(parsed.asset.revisions.at(-1)?.source).toBe('refined');

    const refineSpec = spy.specs.at(-1)!;
    expect(refineSpec.prompt).toBe('Launch announcement');
    expect(refineSpec.style).toContain('press-release');
    expect(refineSpec.refinementPrompt).toBe('make it punchier');
    expect(refineSpec.previousBody).toBeTruthy();
  });

  it('404s refining an unknown asset', async () => {
    const res = await request(server).post(`/api/assets/${crypto.randomUUID()}/refine`).send({ prompt: 'punchier' });
    expect(res.status).toBe(404);
  });

  it('regenerates an asset as a new generated revision', async () => {
    const assetId = campaign.assets[0]!.id;
    const res = await request(server).post(`/api/assets/${assetId}/regenerate`).send();
    expect(res.status).toBe(200);
    const parsed = assetResponseSchema.parse(res.body);
    expect(parsed.asset.revisions).toHaveLength(2);
    expect(parsed.asset.revisions.at(-1)?.source).toBe('generated');
    expect(parsed.asset.status).toBe('complete');
  });

  it('saves a manual revision for text assets', async () => {
    const assetId = campaign.assets[0]!.id;
    const res = await request(server).post(`/api/assets/${assetId}/revisions`).send({ body: 'hand-edited copy' });
    expect(res.status).toBe(200);
    const parsed = assetResponseSchema.parse(res.body);
    expect(parsed.asset.revisions.at(-1)?.source).toBe('manual');
    expect(parsed.asset.kind === 'text' && parsed.asset.revisions.at(-1)?.body).toBe('hand-edited copy');
  });

  it('rejects manual revisions on image assets', async () => {
    const events = await createCampaign(server, { prompt: 'Launch', channels: ['banner'] });
    const imageAssetId = (events[0] as Extract<CampaignEvent, { type: 'campaign' }>).campaign.assets[0]!.id;
    const res = await request(server).post(`/api/assets/${imageAssetId}/revisions`).send({ body: 'nope' });
    expect(res.status).toBe(400);
  });

  it('rejects an empty manual revision', async () => {
    const res = await request(server).post(`/api/assets/${campaign.assets[0]!.id}/revisions`).send({ body: ' ' });
    expect(res.status).toBe(400);
  });
});

describe('persistence across app instances', () => {
  it('shares data through a common database', async () => {
    const db = openDatabase(':memory:');
    const first = app({ db });
    const events = await (async () => {
      const res = await request(first).post(`/api/brands/${brandId}/campaigns`).send({
        prompt: 'Launch',
        channels: ['tweet'],
      });
      return parseSseEvents(res.text);
    })();
    const campaignId = (events[0] as Extract<CampaignEvent, { type: 'campaign' }>).campaign.id;

    const second = app({ db });
    const res = await request(second).get(`/api/campaigns/${campaignId}`);
    expect(res.status).toBe(200);
    expect(getCampaignResponseSchema.parse(res.body).campaign.id).toBe(campaignId);
  });
});

describe('legacy routes', () => {
  it('no longer serves the singleton brand endpoint', async () => {
    expect((await request(app()).get('/api/brand')).status).toBe(404);
  });
});

describe('brand ingestion hook', () => {
  it('re-ingests references on brand update when an embedder is configured', async () => {
    const embedder = vi.fn(async (values: string[]) => values.map(() => new Float32Array([1, 0])));
    const server = app({ embedder });
    await request(server).put(`/api/brands/${brandId}`).send({
      name: 'Acme',
      tagline: null,
      writingStyle: null,
      references: 'We page you before your customers do.',
    });
    await vi.waitFor(() => expect(embedder).toHaveBeenCalled());
  });
});
