import {
  apiErrorSchema,
  campaignEventSchema,
  getProjectResponseSchema,
  refineAssetResponseSchema,
  type Campaign,
  type CampaignEvent,
} from '@media-content/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from './app';
import { FixtureProvider } from './providers/fixture-provider';

const app = () => createApp({ provider: new FixtureProvider({ latencyMs: 0 }) });

function parseSseEvents(body: string): CampaignEvent[] {
  return body
    .split('\n\n')
    .filter(frame => frame.startsWith('data: '))
    .map(frame => campaignEventSchema.parse(JSON.parse(frame.slice('data: '.length))));
}

describe('GET /api/projects', () => {
  it('returns the default project matching the shared schema', async () => {
    const res = await request(app()).get('/api/projects');
    expect(res.status).toBe(200);
    const parsed = getProjectResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
  });
});

describe('POST /api/campaigns', () => {
  it('rejects an invalid payload with 400 and the shared error shape', async () => {
    const res = await request(app()).post('/api/campaigns').send({ prompt: '', channels: [] });
    expect(res.status).toBe(400);
    expect(apiErrorSchema.safeParse(res.body).success).toBe(true);
  });

  it('streams campaign, per-asset, and done events over SSE', async () => {
    const res = await request(app())
      .post('/api/campaigns')
      .send({ prompt: 'We launched v2 of our monitoring tool', channels: ['tweet', 'linkedin', 'banner'] });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');

    const events = parseSseEvents(res.text);
    expect(events[0]?.type).toBe('campaign');
    const assetEvents = events.filter(e => e.type === 'asset');
    expect(assetEvents).toHaveLength(3);
    expect(assetEvents.every(e => e.type === 'asset' && e.asset.status === 'complete')).toBe(true);
    expect(events.at(-1)?.type).toBe('done');

    const campaign = (events[0] as Extract<CampaignEvent, { type: 'campaign' }>).campaign;
    expect(campaign.assets).toHaveLength(3);
    expect(campaign.assets.every(a => a.status === 'pending')).toBe(true);
  });
});

describe('POST /api/campaigns with customStyle', () => {
  it('threads the custom style description into generated text', async () => {
    const res = await request(app())
      .post('/api/campaigns')
      .send({ prompt: 'Launch announcement', channels: ['tweet'], customStyle: 'like a tired sysadmin' });

    expect(res.status).toBe(200);
    const events = parseSseEvents(res.text);
    const assetEvent = events.find(e => e.type === 'asset') as Extract<CampaignEvent, { type: 'asset' }>;
    expect(assetEvent.asset.kind).toBe('text');
    const body = assetEvent.asset.kind === 'text' ? assetEvent.asset.revisions[0]!.body : '';
    expect(body).toContain('like a tired sysadmin');
  });

  it('rejects customStyle combined with writingStyleId', async () => {
    const res = await request(app()).post('/api/campaigns').send({
      prompt: 'Launch announcement',
      channels: ['tweet'],
      writingStyleId: crypto.randomUUID(),
      customStyle: 'dry humor',
    });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/projects/:id/brand', () => {
  const newBrand = {
    name: 'Nimbus Labs',
    tagline: 'Weather for robots',
    links: ['https://nimbus.dev'],
    colors: ['#123456'],
    logoUrl: null,
    voiceNotes: 'Playful but precise',
    examples: ['We taught the fleet to see storms coming. Literally.'],
  };

  it('updates the brand and returns the project', async () => {
    const server = app();
    const before = await request(server).get('/api/projects');
    const projectId = getProjectResponseSchema.parse(before.body).project.id;

    const res = await request(server).put(`/api/projects/${projectId}/brand`).send(newBrand);
    expect(res.status).toBe(200);
    const updated = getProjectResponseSchema.parse(res.body);
    expect(updated.project.brand.name).toBe('Nimbus Labs');
    expect(updated.project.brand.examples).toHaveLength(1);

    const after = await request(server).get('/api/projects');
    expect(getProjectResponseSchema.parse(after.body).project.brand.name).toBe('Nimbus Labs');
  });

  it('uses the updated brand for the next generation', async () => {
    const server = app();
    const before = await request(server).get('/api/projects');
    const projectId = getProjectResponseSchema.parse(before.body).project.id;
    await request(server).put(`/api/projects/${projectId}/brand`).send(newBrand);

    const res = await request(server).post('/api/campaigns').send({ prompt: 'Big launch', channels: ['tweet'] });
    const events = parseSseEvents(res.text);
    const assetEvent = events.find(e => e.type === 'asset') as Extract<CampaignEvent, { type: 'asset' }>;
    const body = assetEvent.asset.kind === 'text' ? assetEvent.asset.revisions[0]!.body : '';
    expect(body).toContain('Nimbus Labs');
  });

  it('404s on an unknown project id', async () => {
    const res = await request(app()).put(`/api/projects/${crypto.randomUUID()}/brand`).send(newBrand);
    expect(res.status).toBe(404);
  });

  it('400s on an invalid brand payload', async () => {
    const server = app();
    const before = await request(server).get('/api/projects');
    const projectId = getProjectResponseSchema.parse(before.body).project.id;
    const res = await request(server)
      .put(`/api/projects/${projectId}/brand`)
      .send({ ...newBrand, links: ['not-a-url'] });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/assets/:id/refine', () => {
  let campaign: Campaign;
  let server: ReturnType<typeof createApp>;

  beforeEach(async () => {
    server = app();
    const res = await request(server)
      .post('/api/campaigns')
      .send({ prompt: 'Launch announcement', channels: ['tweet'] });
    const events = parseSseEvents(res.text);
    campaign = (events[0] as Extract<CampaignEvent, { type: 'campaign' }>).campaign;
  });

  it('appends a new revision to a generated asset', async () => {
    const assetId = campaign.assets[0]!.id;
    const res = await request(server).post(`/api/assets/${assetId}/refine`).send({ prompt: 'make it punchier' });

    expect(res.status).toBe(200);
    const parsed = refineAssetResponseSchema.parse(res.body);
    expect(parsed.asset.id).toBe(assetId);
    expect(parsed.asset.revisions).toHaveLength(2);
    expect(parsed.asset.revisions.at(-1)?.prompt).toBe('make it punchier');
  });

  it('returns 404 for an unknown asset', async () => {
    const res = await request(server)
      .post(`/api/assets/${crypto.randomUUID()}/refine`)
      .send({ prompt: 'make it punchier' });
    expect(res.status).toBe(404);
  });

  it('rejects an empty refinement prompt with 400', async () => {
    const assetId = campaign.assets[0]!.id;
    const res = await request(server).post(`/api/assets/${assetId}/refine`).send({ prompt: '' });
    expect(res.status).toBe(400);
  });
});
