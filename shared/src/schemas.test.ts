import { describe, expect, it } from 'vitest';

import {
  assetSchema,
  campaignEventSchema,
  campaignSchema,
  createCampaignRequestSchema,
  projectSchema,
  refineAssetRequestSchema,
  updateBrandRequestSchema,
} from './schemas';

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const textAsset = () => ({
  kind: 'text' as const,
  id: uuid(),
  campaignId: uuid(),
  channel: 'tweet' as const,
  status: 'complete' as const,
  revisions: [{ id: uuid(), createdAt: now(), prompt: null, body: 'Launch day!' }],
});

const imageAsset = () => ({
  kind: 'image' as const,
  id: uuid(),
  campaignId: uuid(),
  channel: 'banner' as const,
  status: 'complete' as const,
  revisions: [{ id: uuid(), createdAt: now(), prompt: null, url: 'https://cdn.example.com/banner.png', alt: 'Banner' }],
});

describe('createCampaignRequestSchema', () => {
  it('accepts a valid request', () => {
    const parsed = createCampaignRequestSchema.safeParse({
      prompt: 'We just launched v2 of our API monitoring tool',
      channels: ['tweet', 'linkedin', 'banner'],
      writingStyleId: uuid(),
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an empty prompt', () => {
    expect(createCampaignRequestSchema.safeParse({ prompt: '', channels: ['tweet'] }).success).toBe(false);
  });

  it('rejects empty channels', () => {
    expect(createCampaignRequestSchema.safeParse({ prompt: 'hi there', channels: [] }).success).toBe(false);
  });

  it('rejects video channels (v2-gated)', () => {
    expect(createCampaignRequestSchema.safeParse({ prompt: 'hi there', channels: ['video'] }).success).toBe(false);
  });

  it('allows omitting writingStyleId', () => {
    expect(createCampaignRequestSchema.safeParse({ prompt: 'hi there', channels: ['reddit'] }).success).toBe(true);
  });

  it('accepts a free-text customStyle', () => {
    const parsed = createCampaignRequestSchema.safeParse({
      prompt: 'hi there',
      channels: ['tweet'],
      customStyle: 'dry humor, short sentences, no emoji, like a tired sysadmin',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects customStyle and writingStyleId together', () => {
    const parsed = createCampaignRequestSchema.safeParse({
      prompt: 'hi there',
      channels: ['tweet'],
      writingStyleId: uuid(),
      customStyle: 'dry humor',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a customStyle over 500 characters', () => {
    const parsed = createCampaignRequestSchema.safeParse({
      prompt: 'hi there',
      channels: ['tweet'],
      customStyle: 'x'.repeat(501),
    });
    expect(parsed.success).toBe(false);
  });
});

describe('assetSchema', () => {
  it('accepts a text asset', () => {
    expect(assetSchema.safeParse(textAsset()).success).toBe(true);
  });

  it('accepts an image asset', () => {
    expect(assetSchema.safeParse(imageAsset()).success).toBe(true);
  });

  it('rejects a text asset on an image channel', () => {
    expect(assetSchema.safeParse({ ...textAsset(), channel: 'banner' }).success).toBe(false);
  });

  it('rejects an image revision with an invalid url', () => {
    const asset = imageAsset();
    asset.revisions[0]!.url = 'not-a-url';
    expect(assetSchema.safeParse(asset).success).toBe(false);
  });

  it('rejects unknown status', () => {
    expect(assetSchema.safeParse({ ...textAsset(), status: 'exploded' }).success).toBe(false);
  });
});

describe('campaignSchema', () => {
  it('accepts a campaign with mixed assets', () => {
    const parsed = campaignSchema.safeParse({
      id: uuid(),
      projectId: uuid(),
      prompt: 'launch post',
      writingStyleId: null,
      channels: ['tweet', 'banner'],
      status: 'generating',
      assets: [textAsset(), imageAsset()],
      createdAt: now(),
    });
    expect(parsed.success).toBe(true);
  });
});

describe('campaignEventSchema', () => {
  it('parses an asset event', () => {
    expect(campaignEventSchema.safeParse({ type: 'asset', asset: textAsset() }).success).toBe(true);
  });

  it('parses a done event', () => {
    expect(campaignEventSchema.safeParse({ type: 'done' }).success).toBe(true);
  });

  it('rejects unknown event types', () => {
    expect(campaignEventSchema.safeParse({ type: 'mystery' }).success).toBe(false);
  });
});

describe('refineAssetRequestSchema', () => {
  it('rejects an empty prompt', () => {
    expect(refineAssetRequestSchema.safeParse({ prompt: '' }).success).toBe(false);
  });

  it('accepts a refinement prompt', () => {
    expect(refineAssetRequestSchema.safeParse({ prompt: 'make it punchier' }).success).toBe(true);
  });
});

const brand = () => ({
  name: 'Acme',
  tagline: 'Ship faster',
  links: ['https://acme.dev'],
  colors: ['#0f172a'],
  logoUrl: null,
  voiceNotes: 'Confident, technical, no hype',
  examples: ['We shipped v2 today. It ingests 4x faster and pages you before your customers do.'],
});

describe('projectSchema', () => {
  it('accepts a project with brand and styles', () => {
    const parsed = projectSchema.safeParse({
      id: uuid(),
      name: 'Acme Dev Tools',
      brand: brand(),
      writingStyles: [{ id: uuid(), name: 'casual dev', description: 'Loose, first-person, emoji-free' }],
    });
    expect(parsed.success).toBe(true);
  });
});

describe('updateBrandRequestSchema', () => {
  it('accepts a full brand profile with examples', () => {
    expect(updateBrandRequestSchema.safeParse(brand()).success).toBe(true);
  });

  it('rejects a brand without examples', () => {
    const { examples: _examples, ...rest } = brand();
    expect(updateBrandRequestSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects more than 10 examples', () => {
    expect(updateBrandRequestSchema.safeParse({ ...brand(), examples: Array(11).fill('sample') }).success).toBe(false);
  });

  it('rejects an invalid link', () => {
    expect(updateBrandRequestSchema.safeParse({ ...brand(), links: ['not-a-url'] }).success).toBe(false);
  });
});
