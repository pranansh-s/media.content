import type { z } from 'zod';

import type {
  apiErrorSchema,
  assetSchema,
  assetStatusSchema,
  brandProfileSchema,
  campaignEventSchema,
  campaignSchema,
  campaignStatusSchema,
  createCampaignRequestSchema,
  generatableChannelSchema,
  getProjectResponseSchema,
  imageAssetSchema,
  imageChannelSchema,
  imageRevisionSchema,
  projectSchema,
  refineAssetRequestSchema,
  refineAssetResponseSchema,
  textAssetSchema,
  updateBrandRequestSchema,
  textChannelSchema,
  textRevisionSchema,
  videoChannelSchema,
  writingStyleSchema,
} from './schemas';

export type TextChannel = z.infer<typeof textChannelSchema>;
export type ImageChannel = z.infer<typeof imageChannelSchema>;
export type VideoChannel = z.infer<typeof videoChannelSchema>;
export type GeneratableChannel = z.infer<typeof generatableChannelSchema>;
export type AssetStatus = z.infer<typeof assetStatusSchema>;
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;
export type TextRevision = z.infer<typeof textRevisionSchema>;
export type ImageRevision = z.infer<typeof imageRevisionSchema>;
export type TextAsset = z.infer<typeof textAssetSchema>;
export type ImageAsset = z.infer<typeof imageAssetSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type BrandProfile = z.infer<typeof brandProfileSchema>;
export type WritingStyle = z.infer<typeof writingStyleSchema>;
export type Project = z.infer<typeof projectSchema>;
export type CreateCampaignRequest = z.infer<typeof createCampaignRequestSchema>;
export type UpdateBrandRequest = z.infer<typeof updateBrandRequestSchema>;
export type RefineAssetRequest = z.infer<typeof refineAssetRequestSchema>;
export type RefineAssetResponse = z.infer<typeof refineAssetResponseSchema>;
export type GetProjectResponse = z.infer<typeof getProjectResponseSchema>;
export type CampaignEvent = z.infer<typeof campaignEventSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
