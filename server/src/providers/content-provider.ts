import type { Brand, CampaignPlan, ImageChannel, TextChannel } from '@media-content/shared';

export interface TextSpec {
  channel: TextChannel;
  prompt: string;
  brand: Brand;
  style: string | null;
  plan?: CampaignPlan | null;
  evidence?: string[];
  previousBody?: string;
  refinementPrompt?: string;
  signal?: AbortSignal;
}

export interface ImageSpec {
  channel: ImageChannel;
  prompt: string;
  brand: Brand;
  refinementPrompt?: string;
  signal?: AbortSignal;
}

export interface GeneratedImage {
  url: string;
  alt: string;
}

export interface ContentProvider {
  generateText(spec: TextSpec): Promise<string>;
  generateImage(spec: ImageSpec): Promise<GeneratedImage>;
}
