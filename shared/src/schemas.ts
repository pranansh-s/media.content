import { z } from 'zod';

import {
  BRAND_NAME_MAX_LENGTH,
  CUSTOM_STYLE_MAX_LENGTH,
  GENERATABLE_CHANNELS,
  IMAGE_CHANNELS,
  PRESET_STYLE_IDS,
  PROMPT_MAX_LENGTH,
  REFERENCES_MAX_LENGTH,
  REFINE_PROMPT_MAX_LENGTH,
  REVISION_BODY_MAX_LENGTH,
  TAGLINE_MAX_LENGTH,
  TEXT_CHANNELS,
  VIDEO_CHANNELS,
  WRITING_STYLE_MAX_LENGTH,
} from './constants';

export const textChannelSchema = z.enum(TEXT_CHANNELS);
export const imageChannelSchema = z.enum(IMAGE_CHANNELS);
export const videoChannelSchema = z.enum(VIDEO_CHANNELS);
export const generatableChannelSchema = z.enum(GENERATABLE_CHANNELS);

export const assetStatusSchema = z.enum(['pending', 'generating', 'complete', 'failed']);
export const campaignStatusSchema = z.enum(['pending', 'generating', 'complete', 'failed']);

export const revisionSourceSchema = z.enum(['generated', 'refined', 'manual']);

const revisionBase = {
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  prompt: z.string().nullable(),
  source: revisionSourceSchema,
};

export const textRevisionSchema = z.object({
  ...revisionBase,
  body: z.string(),
});

export const imageRevisionSchema = z.object({
  ...revisionBase,
  url: z.url().or(z.string().startsWith('/')),
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

export const styleIdSchema = z.enum(['brand', ...PRESET_STYLE_IDS]);

export const campaignPlanSchema = z.object({
  audience: z.string(),
  keyMessages: z.array(z.string()).min(1).max(5),
  tone: z.string(),
  hooks: z.array(z.string()),
});

export const campaignSchema = z.object({
  id: z.uuid(),
  brandId: z.uuid(),
  prompt: z.string(),
  styleId: styleIdSchema.nullable(),
  plan: campaignPlanSchema.nullable(),
  channels: z.array(generatableChannelSchema),
  status: campaignStatusSchema,
  assets: z.array(assetSchema),
  createdAt: z.iso.datetime(),
});

export const campaignSummarySchema = campaignSchema.omit({ assets: true });

export const brandSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(BRAND_NAME_MAX_LENGTH),
  tagline: z.string().max(TAGLINE_MAX_LENGTH).nullable(),
  writingStyle: z.string().max(WRITING_STYLE_MAX_LENGTH).nullable(),
  references: z.string().max(REFERENCES_MAX_LENGTH).nullable(),
});

export const createCampaignRequestSchema = z
  .object({
    prompt: z.string().trim().min(1).max(PROMPT_MAX_LENGTH),
    channels: z.array(generatableChannelSchema).min(1),
    styleId: styleIdSchema.optional(),
    customStyle: z.string().trim().min(1).max(CUSTOM_STYLE_MAX_LENGTH).optional(),
  })
  .refine(request => !(request.styleId && request.customStyle), {
    message: 'Provide either styleId or customStyle, not both',
    path: ['customStyle'],
  });

export const updateBrandRequestSchema = brandSchema.omit({ id: true });
export const createBrandRequestSchema = updateBrandRequestSchema;

export const refineAssetRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(REFINE_PROMPT_MAX_LENGTH),
});

export const saveRevisionRequestSchema = z.object({
  body: z.string().trim().min(1).max(REVISION_BODY_MAX_LENGTH),
});

export const assetResponseSchema = z.object({
  asset: assetSchema,
});

export const getBrandResponseSchema = z.object({
  brand: brandSchema,
});

export const listBrandsResponseSchema = z.object({
  brands: z.array(brandSchema),
});

export const listCampaignsResponseSchema = z.object({
  campaigns: z.array(campaignSummarySchema),
});

export const getCampaignResponseSchema = z.object({
  campaign: campaignSchema,
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
