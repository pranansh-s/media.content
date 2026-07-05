import { z } from 'zod';

import {
  CUSTOM_STYLE_MAX_LENGTH,
  GENERATABLE_CHANNELS,
  IMAGE_CHANNELS,
  PROMPT_MAX_LENGTH,
  REFINE_PROMPT_MAX_LENGTH,
  TEXT_CHANNELS,
  VIDEO_CHANNELS,
} from './constants';

export const textChannelSchema = z.enum(TEXT_CHANNELS);
export const imageChannelSchema = z.enum(IMAGE_CHANNELS);
export const videoChannelSchema = z.enum(VIDEO_CHANNELS);
export const generatableChannelSchema = z.enum(GENERATABLE_CHANNELS);

export const assetStatusSchema = z.enum(['pending', 'generating', 'complete', 'failed']);
export const campaignStatusSchema = z.enum(['pending', 'generating', 'complete', 'failed']);

const revisionBase = {
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  prompt: z.string().nullable(),
};

export const textRevisionSchema = z.object({
  ...revisionBase,
  body: z.string(),
});

export const imageRevisionSchema = z.object({
  ...revisionBase,
  url: z.url(),
  alt: z.string(),
});

const assetBase = {
  id: z.uuid(),
  campaignId: z.uuid(),
  status: assetStatusSchema,
};

export const textAssetSchema = z.object({
  ...assetBase,
  kind: z.literal('text'),
  channel: textChannelSchema,
  revisions: z.array(textRevisionSchema),
});

export const imageAssetSchema = z.object({
  ...assetBase,
  kind: z.literal('image'),
  channel: imageChannelSchema,
  revisions: z.array(imageRevisionSchema),
});

export const assetSchema = z.discriminatedUnion('kind', [textAssetSchema, imageAssetSchema]);

export const campaignSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  prompt: z.string(),
  writingStyleId: z.uuid().nullable(),
  channels: z.array(generatableChannelSchema),
  status: campaignStatusSchema,
  assets: z.array(assetSchema),
  createdAt: z.iso.datetime(),
});

export const brandProfileSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().nullable(),
  links: z.array(z.url()),
  colors: z.array(z.string()),
  logoUrl: z.url().nullable(),
  voiceNotes: z.string().nullable(),
  examples: z.array(z.string().max(1000)).max(10),
});

export const writingStyleSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string(),
});

export const projectSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  brand: brandProfileSchema,
  writingStyles: z.array(writingStyleSchema),
});

export const createCampaignRequestSchema = z
  .object({
    prompt: z.string().trim().min(1).max(PROMPT_MAX_LENGTH),
    channels: z.array(generatableChannelSchema).min(1),
    writingStyleId: z.uuid().optional(),
    customStyle: z.string().trim().min(1).max(CUSTOM_STYLE_MAX_LENGTH).optional(),
  })
  .refine(request => !(request.writingStyleId && request.customStyle), {
    message: 'Provide either writingStyleId or customStyle, not both',
    path: ['customStyle'],
  });

export const updateBrandRequestSchema = brandProfileSchema;

export const refineAssetRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(REFINE_PROMPT_MAX_LENGTH),
});

export const refineAssetResponseSchema = z.object({
  asset: assetSchema,
});

export const getProjectResponseSchema = z.object({
  project: projectSchema,
});

export const campaignEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('campaign'), campaign: campaignSchema }),
  z.object({ type: z.literal('asset'), asset: assetSchema }),
  z.object({ type: z.literal('done') }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);

export const apiErrorSchema = z.object({
  error: z.string(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});
