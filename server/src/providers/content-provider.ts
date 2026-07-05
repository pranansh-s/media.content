import type { BrandProfile, ImageChannel, TextChannel, WritingStyle } from '@media-content/shared';

export interface TextSpec {
  channel: TextChannel;
  prompt: string;
  brand: BrandProfile;
  style: WritingStyle | null;
  previousBody?: string;
  refinementPrompt?: string;
}

export interface ImageSpec {
  channel: ImageChannel;
  prompt: string;
  brand: BrandProfile;
  refinementPrompt?: string;
}

export interface GeneratedImage {
  url: string;
  alt: string;
}

export interface ContentProvider {
  generateText(spec: TextSpec): Promise<string>;
  generateImage(spec: ImageSpec): Promise<GeneratedImage>;
}
