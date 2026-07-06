import { describe, expect, it } from 'vitest';

import { PRESET_STYLES } from './constants';
import {
  assetSchema,
  brandSchema,
  campaignEventSchema,
  campaignPlanSchema,
  campaignSchema,
  campaignSummarySchema,
  createBrandRequestSchema,
  createCampaignRequestSchema,
  refineAssetRequestSchema,
  saveRevisionRequestSchema,
  styleIdSchema,
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
  revisions: [{ id: uuid(), createdAt: now(), prompt: null, source: 'generated' as const, body: 'Launch day!' }],
});

const imageAsset = () => ({
  kind: 'image' as const,
  id: uuid(),
  campaignId: uuid(),
  channel: 'banner' as const,
  status: 'complete' as const,
  revisions: [
    {
      id: uuid(),
      createdAt: now(),
      prompt: null,
      source: 'generated' as const,
      url: 'https://cdn.example.com/banner.png',
      alt: 'Banner',
    },
  ],
});

describe('styleIdSchema', () => {
  it('accepts the brand voice id', () => {
    expect(styleIdSchema.safeParse('brand').success).toBe(true);
  });

  it('accepts every preset style id', () => {
    for (const style of PRESET_STYLES) {
      expect(styleIdSchema.safeParse(style.id).success).toBe(true);
    }
  });

  it('rejects unknown style ids', () => {
    expect(styleIdSchema.safeParse('sarcastic-pirate').success).toBe(false);
  });
});

describe('createCampaignRequestSchema', () => {
  it('accepts a valid request with a preset style', () => {
    const parsed = createCampaignRequestSchema.safeParse({
      prompt: 'We just launched v2 of our API monitoring tool',
      channels: ['tweet', 'linkedin', 'banner'],
      styleId: 'casual-dev',
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts the brand voice as styleId', () => {
    const parsed = createCampaignRequestSchema.safeParse({
      prompt: 'hi there',
      channels: ['tweet'],
      styleId: 'brand',
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

  it('allows omitting styleId', () => {
    expect(createCampaignRequestSchema.safeParse({ prompt: 'hi there', channels: ['reddit'] }).success).toBe(true);
  });

  it('rejects an unknown styleId', () => {
    const parsed = createCampaignRequestSchema.safeParse({
      prompt: 'hi there',
      channels: ['tweet'],
      styleId: uuid(),
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts a free-text customStyle', () => {
    const parsed = createCampaignRequestSchema.safeParse({
      prompt: 'hi there',
      channels: ['tweet'],
      customStyle: 'dry humor, short sentences, no emoji, like a tired sysadmin',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects customStyle and styleId together', () => {
    const parsed = createCampaignRequestSchema.safeParse({
      prompt: 'hi there',
      channels: ['tweet'],
      styleId: 'formal-pr',
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

  it('rejects a revision without a source', () => {
    const asset = textAsset();
    const { source: _source, ...rest } = asset.revisions[0]!;
    expect(assetSchema.safeParse({ ...asset, revisions: [rest] }).success).toBe(false);
  });

  it('rejects a revision with an unknown source', () => {
    const asset = textAsset();
    expect(
      assetSchema.safeParse({ ...asset, revisions: [{ ...asset.revisions[0]!, source: 'psychic' }] }).success,
    ).toBe(false);
  });

  it('accepts a manual revision source', () => {
    const asset = textAsset();
    expect(
      assetSchema.safeParse({ ...asset, revisions: [{ ...asset.revisions[0]!, source: 'manual' }] }).success,
    ).toBe(true);
  });

  it('accepts a locally served image url', () => {
    const asset = imageAsset();
    asset.revisions[0]!.url = '/api/images/abc.png';
    expect(assetSchema.safeParse(asset).success).toBe(true);
  });
});

const campaign = () => ({
  id: uuid(),
  brandId: uuid(),
  prompt: 'launch post',
  styleId: null,
  plan: null,
  channels: ['tweet', 'banner'] as const,
  status: 'generating' as const,
  assets: [textAsset(), imageAsset()],
  createdAt: now(),
});

describe('campaignSchema', () => {
  it('accepts a campaign with mixed assets', () => {
    expect(campaignSchema.safeParse(campaign()).success).toBe(true);
  });

  it('accepts a campaign with a generation plan', () => {
    const parsed = campaignSchema.safeParse({
      ...campaign(),
      plan: {
        audience: 'developers evaluating monitoring tools',
        keyMessages: ['v2 is faster', 'zero-config setup'],
        tone: 'confident, technical',
        hooks: ['Your dashboard should page you first'],
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a campaign without a plan field', () => {
    const { plan: _plan, ...rest } = campaign();
    expect(campaignSchema.safeParse(rest).success).toBe(false);
  });
});

describe('campaignPlanSchema', () => {
  it('rejects empty key messages', () => {
    const parsed = campaignPlanSchema.safeParse({
      audience: 'devs',
      keyMessages: [],
      tone: 'calm',
      hooks: [],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('campaignSummarySchema', () => {
  it('accepts a campaign without assets', () => {
    const { assets: _assets, ...rest } = campaign();
    expect(campaignSummarySchema.safeParse(rest).success).toBe(true);
  });
});

describe('createBrandRequestSchema', () => {
  it('accepts a brand payload without an id', () => {
    expect(
      createBrandRequestSchema.safeParse({
        name: 'Acme',
        tagline: null,
        writingStyle: null,
        references: null,
      }).success,
    ).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(
      createBrandRequestSchema.safeParse({ name: '', tagline: null, writingStyle: null, references: null }).success,
    ).toBe(false);
  });
});

describe('saveRevisionRequestSchema', () => {
  it('accepts a non-empty body', () => {
    expect(saveRevisionRequestSchema.safeParse({ body: 'edited copy' }).success).toBe(true);
  });

  it('rejects an empty body', () => {
    expect(saveRevisionRequestSchema.safeParse({ body: '   ' }).success).toBe(false);
  });

  it('rejects a body over the length cap', () => {
    expect(saveRevisionRequestSchema.safeParse({ body: 'x'.repeat(20001) }).success).toBe(false);
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
  id: uuid(),
  name: 'Acme',
  tagline: 'Ship faster',
  writingStyle: 'Confident, technical, no hype',
  references:
    'https://acme.dev\nhttps://x.com/acme/status/123\nWe shipped v2 today. It pages you before your customers do.',
});

describe('brandSchema', () => {
  it('accepts a full brand', () => {
    expect(brandSchema.safeParse(brand()).success).toBe(true);
  });

  it('accepts null tagline, writingStyle, and references', () => {
    const parsed = brandSchema.safeParse({ ...brand(), tagline: null, writingStyle: null, references: null });
    expect(parsed.success).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(brandSchema.safeParse({ ...brand(), name: '' }).success).toBe(false);
  });
});

describe('updateBrandRequestSchema', () => {
  it('accepts a brand payload without an id', () => {
    const { id: _id, ...rest } = brand();
    expect(updateBrandRequestSchema.safeParse(rest).success).toBe(true);
  });

  it('rejects a missing name', () => {
    const { id: _id, name: _name, ...rest } = brand();
    expect(updateBrandRequestSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects references over the length cap', () => {
    const { id: _id, ...rest } = brand();
    expect(updateBrandRequestSchema.safeParse({ ...rest, references: 'x'.repeat(4001) }).success).toBe(false);
  });

  it('rejects a name over the length cap', () => {
    const { id: _id, ...rest } = brand();
    expect(updateBrandRequestSchema.safeParse({ ...rest, name: 'x'.repeat(81) }).success).toBe(false);
  });

  it('accepts a name at the length cap', () => {
    const { id: _id, ...rest } = brand();
    expect(updateBrandRequestSchema.safeParse({ ...rest, name: 'x'.repeat(80) }).success).toBe(true);
  });

  it('rejects a tagline over the length cap', () => {
    const { id: _id, ...rest } = brand();
    expect(updateBrandRequestSchema.safeParse({ ...rest, tagline: 'x'.repeat(161) }).success).toBe(false);
  });

  it('rejects a writing style over the length cap', () => {
    const { id: _id, ...rest } = brand();
    expect(updateBrandRequestSchema.safeParse({ ...rest, writingStyle: 'x'.repeat(501) }).success).toBe(false);
  });
});
