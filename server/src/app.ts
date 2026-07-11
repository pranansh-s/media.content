import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import {
  createBrandRequestSchema,
  createCampaignRequestSchema,
  PRESET_STYLES,
  refineAssetRequestSchema,
  saveRevisionRequestSchema,
  TEXT_CHANNELS,
  updateBrandRequestSchema,
} from '@media-content/shared';

import type { ContentProvider } from './providers/content-provider';
import type { Embedder } from './rag/knowledge';
import type {
  Asset,
  Brand,
  Campaign,
  CampaignEvent,
  CampaignPlan,
  GeneratableChannel,
  ImageChannel,
  StyleId,
  TextChannel,
  TextRevision,
} from '@media-content/shared';
import type { Database } from 'better-sqlite3';
import type { NextFunction, Request, Response } from 'express';
import type { ZodError } from 'zod';

import { openDatabase } from './db/database';
import { createStore } from './db/store';
import { DEFAULT_IMAGE_DIR } from './images';
import { AppError, ConflictError, NotFoundError, RateLimitError, UpstreamError, ValidationError } from './lib/errors';
import { createLimiter, withRetry } from './lib/limit';
import { log } from './lib/log';
import { createRateLimiter } from './lib/rate-limit';
import { generateCampaignPlan } from './pipeline/plan';
import { createEmbedderFromEnv } from './rag/embeddings';
import { ingestBrand, ingestRevision, retrieve } from './rag/knowledge';

export interface AppOptions {
  provider: ContentProvider;
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
  campaignRateLimit?: { limit: number; windowMs: number };
  heartbeatMs?: number;
}

function isTextChannel(channel: GeneratableChannel): channel is TextChannel {
  return (TEXT_CHANNELS as readonly string[]).includes(channel);
}

function zodToValidation(error: ZodError): ValidationError {
  const first = error.issues[0];
  const detail = first ? `${first.path.join('.') || 'body'}: ${first.message}` : 'Invalid request';
  return new ValidationError(detail);
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;
const asyncHandler = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

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

export function createApp(options: AppOptions) {
  const provider = options.provider;
  const db = options.db ?? openDatabase();
  const store = createStore(db);
  store.seedDefaultBrand();
  store.reconcileStuckStatuses();
  const embedder = options.embedder !== undefined ? options.embedder : createEmbedderFromEnv();
  const planner =
    options.planner ?? ((args: Parameters<typeof generateCampaignPlan>[0]) => generateCampaignPlan(args));
  const concurrency = options.concurrency ?? (Number(process.env.GEMINI_CONCURRENCY) || 2);
  const idempotencyCache = new Map<string, { campaignId: string; expiresAt: number }>();
  const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
  const heartbeatMs = options.heartbeatMs ?? Number(process.env.SSE_HEARTBEAT_MS ?? 20_000);
  const campaignLimiter = createRateLimiter(
    options.campaignRateLimit ?? {
      limit: Number(process.env.CAMPAIGN_RATE_LIMIT ?? 10),
      windowMs: Number(process.env.CAMPAIGN_RATE_WINDOW_MS ?? 60_000),
    }
  );

  const app = express();
  app.use(helmet());
  const allowlist = process.env.CORS_ORIGINS?.split(',')
    .map(o => o.trim())
    .filter(Boolean);
  app.use(cors(allowlist ? { origin: allowlist, credentials: true } : {}));
  app.use(express.json({ limit: '256kb' }));
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () =>
      log.info({ method: req.method, path: req.originalUrl, status: res.statusCode, ms: Date.now() - start }, 'request')
    );
    next();
  });
  app.use('/api/images', express.static(options.imageDir ?? DEFAULT_IMAGE_DIR));

  app.get('/api/health', (_req, res) => {
    try {
      db.prepare('SELECT 1').get();
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  app.get('/api/brands', (_req, res) => {
    res.json({ brands: store.listBrands() });
  });

  app.post('/api/brands', (req, res) => {
    const parsed = createBrandRequestSchema.safeParse(req.body);
    if (!parsed.success) throw zodToValidation(parsed.error);
    const brand = store.createBrand(parsed.data);
    void ingestBrand(store, brand, embedder).catch(err => log.warn({ err }, 'rag ingest failed'));
    res.status(201).json({ brand });
  });

  app.get('/api/brands/:id', (req, res) => {
    const brand = store.getBrand(req.params.id);
    if (!brand) throw new NotFoundError('Brand not found');
    res.json({ brand });
  });

  app.put('/api/brands/:id', (req, res) => {
    const parsed = updateBrandRequestSchema.safeParse(req.body);
    if (!parsed.success) throw zodToValidation(parsed.error);
    const brand = store.updateBrand(req.params.id, parsed.data);
    if (!brand) throw new NotFoundError('Brand not found');
    void ingestBrand(store, brand, embedder).catch(err => log.warn({ err }, 'rag ingest failed'));
    res.json({ brand });
  });

  app.delete(
    '/api/brands/:id',
    asyncHandler(async (req, res) => {
      const brandId = String(req.params.id);
      const urls = store.listImageUrlsForBrand(brandId);
      const outcome = store.deleteBrand(brandId);
      if (outcome === 'not_found') throw new NotFoundError('Brand not found');
      if (outcome === 'last_brand') throw new ConflictError('Cannot delete the last brand');
      await unlinkServed(urls);
      res.status(204).end();
    })
  );

  app.get('/api/brands/:id/campaigns', (req, res) => {
    if (!store.getBrand(req.params.id)) throw new NotFoundError('Brand not found');
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;
    res.json({ campaigns: store.listCampaigns(req.params.id, q || undefined) });
  });

  app.get('/api/campaigns/:id', (req, res) => {
    const campaign = store.getCampaign(req.params.id);
    if (!campaign) throw new NotFoundError('Campaign not found');
    res.json({ campaign });
  });

  app.get('/api/campaigns/:id/export', (req, res) => {
    const campaign = store.getCampaign(req.params.id);
    if (!campaign) throw new NotFoundError('Campaign not found');
    res.json({
      campaignId: campaign.id,
      prompt: campaign.prompt,
      createdAt: campaign.createdAt,
      assets: campaign.assets.map(asset => {
        const latest = asset.revisions.at(-1);
        return asset.kind === 'text'
          ? { channel: asset.channel, kind: 'text' as const, body: latest && 'body' in latest ? latest.body : '' }
          : {
              channel: asset.channel,
              kind: 'image' as const,
              url: latest && 'url' in latest ? latest.url : '',
              alt: latest && 'alt' in latest ? latest.alt : '',
            };
      }),
    });
  });

  const imageRoot = options.imageDir ?? DEFAULT_IMAGE_DIR;
  const unlinkServed = async (urls: string[]) => {
    for (const url of urls) {
      if (!url.startsWith('/api/images/')) continue;
      const file = basename(url);
      if (!file || file.includes('..')) continue;
      await unlink(join(imageRoot, file)).catch(err => log.warn({ err, file }, 'image cleanup failed'));
    }
  };

  app.delete(
    '/api/campaigns/:id',
    asyncHandler(async (req, res) => {
      const campaignId = String(req.params.id);
      const urls = store.listImageUrlsForCampaign(campaignId);
      const removed = store.deleteCampaign(campaignId);
      if (!removed) throw new NotFoundError('Campaign not found');
      await unlinkServed(urls);
      res.status(204).end();
    })
  );

  app.post(
    '/api/brands/:id/campaigns',
    asyncHandler(async (req, res) => {
      const brand = store.getBrand(String(req.params.id));
      if (!brand) throw new NotFoundError('Brand not found');
      const parsed = createCampaignRequestSchema.safeParse(req.body);
      if (!parsed.success) throw zodToValidation(parsed.error);

      const idempotencyKey = req.header('idempotency-key');
      if (idempotencyKey) {
        const cacheKey = `${brand.id}:${idempotencyKey}`;
        const now = Date.now();
        for (const [k, v] of idempotencyCache) if (v.expiresAt < now) idempotencyCache.delete(k);
        const cached = idempotencyCache.get(cacheKey);
        if (cached) {
          const existing = store.getCampaign(cached.campaignId);
          if (existing) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.flushHeaders();
            sendEvent(res, { type: 'campaign', campaign: existing });
            for (const asset of existing.assets) sendEvent(res, { type: 'asset', asset });
            sendEvent(res, { type: 'done' });
            return res.end();
          }
        }
      }

      const gate = campaignLimiter.check(brand.id);
      if (!gate.ok) throw new RateLimitError('Too many campaigns for this brand, slow down', gate.retryAfterSec);

      const { prompt, channels, styleId, customStyle } = parsed.data;
      const style = resolveStyle(brand, styleId, customStyle);
      const controller = new AbortController();
      const campaignId = randomUUID();
      res.on('close', () => {
        if (!res.writableEnded) {
          controller.abort();
          if (store.getCampaign(campaignId)) {
            store.failInFlightAssets(campaignId);
            store.setCampaignStatus(campaignId, 'failed');
          }
        }
      });
      const signal = controller.signal;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const heartbeat = setInterval(() => {
        if (!res.writableEnded) res.write(': ping\n\n');
      }, heartbeatMs);
      res.on('close', () => clearInterval(heartbeat));

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
        if (idempotencyKey) {
          idempotencyCache.set(`${brand.id}:${idempotencyKey}`, {
            campaignId,
            expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
          });
        }
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
                    provider.generateText({ channel: asset.channel, prompt, brand, style, plan, evidence, signal })
                  );
                  store.updateAssetStatus(asset.id, 'complete');
                  completed = store.appendRevision(asset.id, { ...revisionBase(null, 'generated'), body });
                  void ingestRevision(store, brand.id, asset.channel, body, embedder).catch(err =>
                    log.warn({ err }, 'rag ingest failed')
                  );
                } else {
                  const image = await withRetry(() =>
                    provider.generateImage({ channel: asset.channel, prompt, brand, signal })
                  );
                  store.updateAssetStatus(asset.id, 'complete');
                  completed = store.appendRevision(asset.id, { ...revisionBase(null, 'generated'), ...image });
                }
                sendEvent(res, { type: 'asset', asset: completed });
              } catch {
                store.updateAssetStatus(asset.id, 'failed');
                sendEvent(res, { type: 'asset', asset: { ...asset, status: 'failed' } });
              }
            })
          )
        );

        store.setCampaignStatus(campaignId, signal.aborted ? 'failed' : 'complete');
        sendEvent(res, { type: 'done' });
      } catch (error) {
        if (store.getCampaign(campaignId)) store.setCampaignStatus(campaignId, 'failed');
        sendEvent(res, { type: 'error', message: error instanceof Error ? error.message : 'Generation failed' });
      } finally {
        clearInterval(heartbeat);
        res.end();
      }
    })
  );

  app.post(
    '/api/assets/:id/refine',
    asyncHandler(async (req, res) => {
      const parsed = refineAssetRequestSchema.safeParse(req.body);
      if (!parsed.success) throw zodToValidation(parsed.error);
      const context = store.getAssetContext(String(req.params.id));
      if (!context) throw new NotFoundError('Asset not found');
      if (context.asset.status !== 'complete') {
        throw new ConflictError('Asset is not ready to refine');
      }

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
            })
          );
          updated = store.appendRevision(asset.id, { ...revisionBase(refinementPrompt, 'refined'), body });
        } else {
          const image = await withRetry(() =>
            provider.generateImage({ channel: asset.channel, prompt: campaign.prompt, brand, refinementPrompt })
          );
          updated = store.appendRevision(asset.id, { ...revisionBase(refinementPrompt, 'refined'), ...image });
        }
        res.json({ asset: updated });
      } catch {
        throw new UpstreamError('Refinement failed, try again');
      }
    })
  );

  app.post(
    '/api/assets/:id/regenerate',
    asyncHandler(async (req, res) => {
      const context = store.getAssetContext(String(req.params.id));
      if (!context) throw new NotFoundError('Asset not found');
      if (context.asset.status !== 'complete' && context.asset.status !== 'failed') {
        throw new ConflictError('Asset is not ready to regenerate');
      }

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
            })
          );
          store.updateAssetStatus(asset.id, 'complete');
          updated = store.appendRevision(asset.id, { ...revisionBase(null, 'generated'), body });
        } else {
          const image = await withRetry(() =>
            provider.generateImage({ channel: asset.channel, prompt: campaign.prompt, brand })
          );
          store.updateAssetStatus(asset.id, 'complete');
          updated = store.appendRevision(asset.id, { ...revisionBase(null, 'generated'), ...image });
        }
        res.json({ asset: updated });
      } catch {
        throw new UpstreamError('Regeneration failed, try again');
      }
    })
  );

  app.post('/api/assets/:id/revisions/:revisionId/restore', (req, res) => {
    const context = store.getAssetContext(req.params.id);
    if (!context) throw new NotFoundError('Asset not found');
    const source = store.getRevision(req.params.id, req.params.revisionId);
    if (!source) throw new NotFoundError('Revision not found');
    const updated =
      source.kind === 'text' && 'body' in source
        ? store.appendRevision(context.asset.id, { ...revisionBase(null, 'manual'), body: source.body })
        : source.kind === 'image' && 'url' in source
          ? store.appendRevision(context.asset.id, {
              ...revisionBase(null, 'refined'),
              url: source.url,
              alt: source.alt,
            })
          : null;
    if (!updated) throw new ValidationError('Revision cannot be restored');
    res.json({ asset: updated });
  });

  app.post('/api/assets/:id/revisions', (req, res) => {
    const parsed = saveRevisionRequestSchema.safeParse(req.body);
    if (!parsed.success) throw zodToValidation(parsed.error);
    const context = store.getAssetContext(req.params.id);
    if (!context) throw new NotFoundError('Asset not found');
    if (context.asset.kind !== 'text') throw new ValidationError('Only text assets accept manual edits');
    if (context.asset.status !== 'complete') throw new ConflictError('Asset is not ready for manual edits');

    const updated = store.appendRevision(context.asset.id, {
      ...revisionBase(null, 'manual'),
      body: parsed.data.body,
    });
    res.json({ asset: updated });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;
    if (err && typeof err === 'object' && (err as { type?: string }).type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body too large', code: 'payload_too_large' });
    }
    if (err instanceof AppError) {
      if (err.statusCode === 429 && 'retryAfter' in err) {
        res.setHeader('Retry-After', String((err as { retryAfter: number }).retryAfter));
      }
      return res.status(err.statusCode).json(err.toJSON());
    }
    log.error({ err }, 'unhandled error');
    res.status(500).json({ error: 'Internal server error', code: 'internal_error' });
  });

  return app;
}
