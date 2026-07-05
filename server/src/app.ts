import {
  createCampaignRequestSchema,
  refineAssetRequestSchema,
  TEXT_CHANNELS,
  updateBrandRequestSchema,
  type Asset,
  type Campaign,
  type CampaignEvent,
  type GeneratableChannel,
  type ImageChannel,
  type Project,
  type TextChannel,
} from '@media-content/shared';
import cors from 'cors';
import express, { type Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { ZodError } from 'zod';

import { DEFAULT_PROJECT } from './fixtures/project';
import type { ContentProvider } from './providers/content-provider';
import { FixtureProvider } from './providers/fixture-provider';

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
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function pendingAsset(campaignId: string, channel: GeneratableChannel): Asset {
  const base = { id: randomUUID(), campaignId, status: 'pending' as const, revisions: [] };
  return isTextChannel(channel)
    ? { ...base, kind: 'text', channel }
    : { ...base, kind: 'image', channel: channel as ImageChannel };
}

export function createApp(options: { provider?: ContentProvider } = {}) {
  const provider = options.provider ?? new FixtureProvider();
  const assetStore = new Map<string, Asset>();
  let currentProject: Project = structuredClone(DEFAULT_PROJECT);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/projects', (_req, res) => {
    res.json({ project: currentProject });
  });

  app.put('/api/projects/:id/brand', (req, res) => {
    if (req.params.id !== currentProject.id) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const parsed = updateBrandRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return validationError(res, parsed.error);
    }
    currentProject = { ...currentProject, brand: parsed.data };
    res.json({ project: currentProject });
  });

  app.post('/api/campaigns', async (req, res) => {
    const parsed = createCampaignRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return validationError(res, parsed.error);
    }

    const { prompt, channels, writingStyleId, customStyle } = parsed.data;
    const style = customStyle
      ? { id: randomUUID(), name: 'custom', description: customStyle }
      : (currentProject.writingStyles.find(s => s.id === writingStyleId) ?? null);
    const campaignId = randomUUID();
    const campaign: Campaign = {
      id: campaignId,
      projectId: currentProject.id,
      prompt,
      writingStyleId: customStyle ? null : (style?.id ?? null),
      channels,
      status: 'generating',
      assets: channels.map(channel => pendingAsset(campaignId, channel)),
      createdAt: new Date().toISOString(),
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sendEvent(res, { type: 'campaign', campaign });

    await Promise.all(
      campaign.assets.map(async asset => {
        try {
          const revisionBase = { id: randomUUID(), createdAt: new Date().toISOString(), prompt: null };
          const completed: Asset =
            asset.kind === 'text'
              ? {
                  ...asset,
                  status: 'complete',
                  revisions: [
                    {
                      ...revisionBase,
                      body: await provider.generateText({
                        channel: asset.channel,
                        prompt,
                        brand: currentProject.brand,
                        style,
                      }),
                    },
                  ],
                }
              : {
                  ...asset,
                  status: 'complete',
                  revisions: [
                    {
                      ...revisionBase,
                      ...(await provider.generateImage({
                        channel: asset.channel,
                        prompt,
                        brand: currentProject.brand,
                      })),
                    },
                  ],
                };
          assetStore.set(completed.id, completed);
          sendEvent(res, { type: 'asset', asset: completed });
        } catch {
          const failed: Asset = { ...asset, status: 'failed' };
          assetStore.set(failed.id, failed);
          sendEvent(res, { type: 'asset', asset: failed });
        }
      })
    );

    sendEvent(res, { type: 'done' });
    res.end();
  });

  app.post('/api/assets/:id/refine', async (req, res) => {
    const parsed = refineAssetRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return validationError(res, parsed.error);
    }

    const asset = assetStore.get(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const refinementPrompt = parsed.data.prompt;
    const revisionBase = { id: randomUUID(), createdAt: new Date().toISOString(), prompt: refinementPrompt };
    const campaignPrompt = asset.revisions.at(-1)?.prompt ?? '';

    const updated: Asset =
      asset.kind === 'text'
        ? {
            ...asset,
            revisions: [
              ...asset.revisions,
              {
                ...revisionBase,
                body: await provider.generateText({
                  channel: asset.channel,
                  prompt: campaignPrompt,
                  brand: currentProject.brand,
                  style: null,
                  previousBody: asset.revisions.at(-1)?.body,
                  refinementPrompt,
                }),
              },
            ],
          }
        : {
            ...asset,
            revisions: [
              ...asset.revisions,
              {
                ...revisionBase,
                ...(await provider.generateImage({
                  channel: asset.channel,
                  prompt: campaignPrompt,
                  brand: currentProject.brand,
                  refinementPrompt,
                })),
              },
            ],
          };

    assetStore.set(updated.id, updated);
    res.json({ asset: updated });
  });

  return app;
}
