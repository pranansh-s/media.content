import type { z } from 'zod';

import type {
  apiErrorSchema,
  assetResponseSchema,
  assetSchema,
  assetStatusSchema,
  brandSchema,
  campaignEventSchema,
  campaignPlanSchema,
  campaignSchema,
  campaignStatusSchema,
  campaignSummarySchema,
  createBrandRequestSchema,
  createCampaignRequestSchema,
  generatableChannelSchema,
  getBrandResponseSchema,
  getCampaignResponseSchema,
  imageAssetSchema,
  imageChannelSchema,
  imageRevisionSchema,
  listBrandsResponseSchema,
  listCampaignsResponseSchema,
  refineAssetRequestSchema,
  revisionSourceSchema,
  saveRevisionRequestSchema,
  styleIdSchema,
  textAssetSchema,
  textChannelSchema,
  textRevisionSchema,
  updateBrandRequestSchema,
  videoChannelSchema,
} from './schemas';

export type TextChannel = z.infer<typeof textChannelSchema>;
export type ImageChannel = z.infer<typeof imageChannelSchema>;
export type VideoChannel = z.infer<typeof videoChannelSchema>;
export type GeneratableChannel = z.infer<typeof generatableChannelSchema>;
export type AssetStatus = z.infer<typeof assetStatusSchema>;
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;
export type RevisionSource = z.infer<typeof revisionSourceSchema>;
export type TextRevision = z.infer<typeof textRevisionSchema>;
export type ImageRevision = z.infer<typeof imageRevisionSchema>;
export type TextAsset = z.infer<typeof textAssetSchema>;
export type ImageAsset = z.infer<typeof imageAssetSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type CampaignPlan = z.infer<typeof campaignPlanSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type CampaignSummary = z.infer<typeof campaignSummarySchema>;
export type Brand = z.infer<typeof brandSchema>;
export type StyleId = z.infer<typeof styleIdSchema>;
export type CreateCampaignRequest = z.infer<typeof createCampaignRequestSchema>;
export type CreateBrandRequest = z.infer<typeof createBrandRequestSchema>;
export type UpdateBrandRequest = z.infer<typeof updateBrandRequestSchema>;
export type RefineAssetRequest = z.infer<typeof refineAssetRequestSchema>;
export type SaveRevisionRequest = z.infer<typeof saveRevisionRequestSchema>;
export type AssetResponse = z.infer<typeof assetResponseSchema>;
export type GetBrandResponse = z.infer<typeof getBrandResponseSchema>;
export type ListBrandsResponse = z.infer<typeof listBrandsResponseSchema>;
export type ListCampaignsResponse = z.infer<typeof listCampaignsResponseSchema>;
export type GetCampaignResponse = z.infer<typeof getCampaignResponseSchema>;
export type CampaignEvent = z.infer<typeof campaignEventSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
