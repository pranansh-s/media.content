import {
  createBrandRequestSchema,
  createCampaignRequestSchema,
  PRESET_STYLES,
  refineAssetRequestSchema,
  saveRevisionRequestSchema,
  TEXT_CHANNELS,
  updateBrandRequestSchema,
  type Asset,
  type Brand,
  type Campaign,
  type CampaignEvent,
  type CampaignPlan,
  type GeneratableChannel,
  type ImageChannel,
  type StyleId,
  type TextChannel,
  type TextRevision,
} from '@media-content/shared';
import type { Database } from 'better-sqlite3';
import cors from 'cors';
import express, { type Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { ZodError } from 'zod';

import { openDatabase } from './db/database';
import { createStore } from './db/store';
import { DEFAULT_IMAGE_DIR } from './images';
import { createLimiter, withRetry } from './lib/limit';
import { isGeminiEnabled } from './providers';
import type { ContentProvider } from './providers/content-provider';
import { FixtureProvider } from './providers/fixture-provider';
import { generateCampaignPlan } from './pipeline/plan';
import { createEmbedderFromEnv } from './rag/embeddings';
import { ingestBrand, ingestRevision, retrieve, type Embedder } from './rag/knowledge';

export interface AppOptions {
  provider?: ContentProvider;
  db?: Database;
  concurrency?: number;
  embedder?: Embedder | null;
  planner?: (args: {
    prompt: string;
    brand: Brand;
    style: string | null;
    channels: readonly GeneratableChannel[];
    signal?: AbortSignal;
  }) => Promise<CampaignPlan | null>;
  imageDir?: string;
}

function isTextChannel(channel: GeneratableChannel): channel is TextChannel {
  return (TEXT_CHANNELS as readonly string[]).includes(channel);
}

function validationError(res: Response, error: ZodError) {
  res.status(400).json({
    error: 'Invalid request',
    issues: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
  });
}

function sendEvent(res: Response, event: CampaignEvent) {
  if (res.writableEnded) return;
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function pendingAsset(campaignId: string, channel: GeneratableChannel): Asset {
  const base = { id: randomUUID(), campaignId, status: 'pending' as const, revisions: [] };
  return isTextChannel(channel)
    ? { ...base, kind: 'text', channel }
    : { ...base, kind: 'image', channel: channel as ImageChannel };
}

function resolveStyle(brand: Brand, styleId: StyleId | undefined, customStyle: string | undefined): string | null {
  if (customStyle) return customStyle;
  if (styleId === 'brand') return brand.writingStyle;
  return PRESET_STYLES.find(style => style.id === styleId)?.description ?? null;
}

function revisionBase(prompt: string | null, source: TextRevision['source']) {
  return { id: randomUUID(), createdAt: new Date().toISOString(), prompt, source };
}

export function createApp(options: AppOptions = {}) {
  const provider = options.provider ?? new FixtureProvider();
  const db = options.db ?? openDatabase();
  const store = createStore(db);
  store.seedDefaultBrand();
  const embedder = options.embedder !== undefined ? options.embedder : createEmbedderFromEnv();
  const planner =
    options.planner ?? (isGeminiEnabled() ? (args: Parameters<typeof generateCampaignPlan>[0]) => generateCampaignPlan(args) : async () => null);
  const concurrency =
    options.concurrency ?? (Number(process.env.GEMINI_CONCURRENCY) || (isGeminiEnabled() ? 2 : 8));

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/images', express.static(options.imageDir ?? DEFAULT_IMAGE_DIR));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/brands', (_req, res) => {
    res.json({ brands: store.listBrands() });
  });

  app.post('/api/brands', (req, res) => {
    const parsed = createBrandRequestSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const brand = store.createBrand(parsed.data);
    void ingestBrand(store, brand, embedder).catch(() => {});
    res.status(201).json({ brand });
  });

  app.get('/api/brands/:id', (req, res) => {
    const brand = store.getBrand(req.params.id);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json({ brand });
  });

  app.put('/api/brands/:id', (req, res) => {
    const parsed = updateBrandRequestSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const brand = store.updateBrand(req.params.id, parsed.data);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    void ingestBrand(store, brand, embedder).catch(() => {});
    res.json({ brand });
  });

  app.delete('/api/brands/:id', (req, res) => {
    const outcome = store.deleteBrand(req.params.id);
    if (outcome === 'not_found') return res.status(404).json({ error: 'Brand not found' });
    if (outcome === 'last_brand') return res.status(409).json({ error: 'Cannot delete the last brand' });
    res.status(204).end();
  });

  app.get('/api/brands/:id/campaigns', (req, res) => {
    if (!store.getBrand(req.params.id)) return res.status(404).json({ error: 'Brand not found' });
    res.json({ campaigns: store.listCampaigns(req.params.id) });
  });

  app.get('/api/campaigns/:id', (req, res) => {
    const campaign = store.getCampaign(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ campaign });
  });

  app.post('/api/brands/:id/campaigns', async (req, res) => {
    const brand = store.getBrand(req.params.id);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    const parsed = createCampaignRequestSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);

    const { prompt, channels, styleId, customStyle } = parsed.data;
    const style = resolveStyle(brand, styleId, customStyle);
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });
    const signal = controller.signal;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const campaignId = randomUUID();
    try {
      const evidence = await retrieve(store, brand.id, `${prompt} ${channels.join(' ')}`, embedder);
      const plan = await planner({ prompt, brand, style, channels, signal });
      const campaign: Campaign = {
        id: campaignId,
        brandId: brand.id,
        prompt,
        styleId: styleId ?? null,
        plan,
        channels,
        status: 'generating',
        assets: channels.map(channel => pendingAsset(campaignId, channel)),
        createdAt: new Date().toISOString(),
      };
      store.insertCampaign(campaign, style);
      sendEvent(res, { type: 'campaign', campaign });

      const limit = createLimiter(concurrency);
      await Promise.all(
        campaign.assets.map(asset =>
          limit(async () => {
            if (signal.aborted) {
              store.updateAssetStatus(asset.id, 'failed');
              return;
            }
            store.updateAssetStatus(asset.id, 'generating');
            sendEvent(res, { type: 'asset', asset: { ...asset, status: 'generating' } });
            try {
              let completed: Asset;
              if (asset.kind === 'text') {
                const body = await withRetry(() =>
                  provider.generateText({ channel: asset.channel, prompt, brand, style, plan, evidence, signal }),
                );
                store.updateAssetStatus(asset.id, 'complete');
                completed = store.appendRevision(asset.id, { ...revisionBase(null, 'generated'), body });
                void ingestRevision(store, brand.id, asset.channel, body, embedder).catch(() => {});
              } else {
                const image = await withRetry(() =>
                  provider.generateImage({ channel: asset.channel, prompt, brand, signal }),
                );
                store.updateAssetStatus(asset.id, 'complete');
                completed = store.appendRevision(asset.id, { ...revisionBase(null, 'generated'), ...image });
              }
              sendEvent(res, { type: 'asset', asset: completed });
            } catch {
              store.updateAssetStatus(asset.id, 'failed');
              sendEvent(res, { type: 'asset', asset: { ...asset, status: 'failed' } });
            }
          }),
        ),
      );

      store.setCampaignStatus(campaignId, signal.aborted ? 'failed' : 'complete');
      sendEvent(res, { type: 'done' });
    } catch (error) {
      if (store.getCampaign(campaignId)) store.setCampaignStatus(campaignId, 'failed');
      sendEvent(res, { type: 'error', message: error instanceof Error ? error.message : 'Generation failed' });
    } finally {
      res.end();
    }
  });

  app.post('/api/assets/:id/refine', async (req, res) => {
    const parsed = refineAssetRequestSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const context = store.getAssetContext(req.params.id);
    if (!context) return res.status(404).json({ error: 'Asset not found' });

    const { asset, campaign, brand } = context;
    const refinementPrompt = parsed.data.prompt;
    const previous = asset.revisions.at(-1);
    try {
      let updated: Asset;
      if (asset.kind === 'text') {
        const body = await withRetry(() =>
          provider.generateText({
            channel: asset.channel,
            prompt: campaign.prompt,
            brand,
            style: campaign.styleText,
            plan: campaign.plan,
            previousBody: previous && 'body' in previous ? previous.body : undefined,
            refinementPrompt,
          }),
        );
        updated = store.appendRevision(asset.id, { ...revisionBase(refinementPrompt, 'refined'), body });
      } else {
        const image = await withRetry(() =>
          provider.generateImage({ channel: asset.channel, prompt: campaign.prompt, brand, refinementPrompt }),
        );
        updated = store.appendRevision(asset.id, { ...revisionBase(refinementPrompt, 'refined'), ...image });
      }
      res.json({ asset: updated });
    } catch {
      res.status(502).json({ error: 'Refinement failed, try again' });
    }
  });

  app.post('/api/assets/:id/regenerate', async (req, res) => {
    const context = store.getAssetContext(req.params.id);
    if (!context) return res.status(404).json({ error: 'Asset not found' });

    const { asset, campaign, brand } = context;
    try {
      const evidence = await retrieve(store, brand.id, `${campaign.prompt} ${asset.channel}`, embedder);
      let updated: Asset;
      if (asset.kind === 'text') {
        const body = await withRetry(() =>
          provider.generateText({
            channel: asset.channel,
            prompt: campaign.prompt,
            brand,
            style: campaign.styleText,
            plan: campaign.plan,
            evidence,
          }),
        );
        store.updateAssetStatus(asset.id, 'complete');
        updated = store.appendRevision(asset.id, { ...revisionBase(null, 'generated'), body });
      } else {
        const image = await withRetry(() =>
          provider.generateImage({ channel: asset.channel, prompt: campaign.prompt, brand }),
        );
        store.updateAssetStatus(asset.id, 'complete');
        updated = store.appendRevision(asset.id, { ...revisionBase(null, 'generated'), ...image });
      }
      res.json({ asset: updated });
    } catch {
      res.status(502).json({ error: 'Regeneration failed, try again' });
    }
  });

  app.post('/api/assets/:id/revisions', (req, res) => {
    const parsed = saveRevisionRequestSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const context = store.getAssetContext(req.params.id);
    if (!context) return res.status(404).json({ error: 'Asset not found' });
    if (context.asset.kind !== 'text') return res.status(400).json({ error: 'Only text assets accept manual edits' });

    const updated = store.appendRevision(context.asset.id, {
      ...revisionBase(null, 'manual'),
      body: parsed.data.body,
    });
    res.json({ asset: updated });
  });

  return app;
}
