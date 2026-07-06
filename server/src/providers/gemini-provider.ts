import { google } from '@ai-sdk/google';
import {
  generateImage,
  generateText,
  NoImageGeneratedError,
  type ImageModel,
  type LanguageModel,
} from 'ai';

import { buildImagePrompt, buildTextPrompt } from '../prompts/prompts';
import type { ContentProvider, GeneratedImage, ImageSpec, TextSpec } from './content-provider';

interface GeminiProviderOptions {
  saveImage: (bytes: Uint8Array, mediaType: string) => Promise<string>;
  fallbackImage: (spec: ImageSpec) => Promise<GeneratedImage>;
  textModel?: LanguageModel;
  imageModel?: ImageModel;
}

function isImageUnavailable(error: unknown): boolean {
  if (NoImageGeneratedError.isInstance(error)) return true;
  const statusCode = (error as { statusCode?: number })?.statusCode;
  return statusCode === 403 || statusCode === 404;
}

export class GeminiProvider implements ContentProvider {
  private readonly textModel: LanguageModel;
  private readonly imageModel: ImageModel;
  private readonly saveImage: GeminiProviderOptions['saveImage'];
  private readonly fallbackImage: GeminiProviderOptions['fallbackImage'];

  constructor(options: GeminiProviderOptions) {
    this.textModel = options.textModel ?? google(process.env.GEMINI_TEXT_MODEL ?? 'gemini-2.5-flash');
    this.imageModel = options.imageModel ?? google.image(process.env.GEMINI_IMAGE_MODEL ?? 'gemini-2.5-flash-image');
    this.saveImage = options.saveImage;
    this.fallbackImage = options.fallbackImage;
  }

  async generateText(spec: TextSpec): Promise<string> {
    const { system, prompt } = buildTextPrompt(spec);
    const result = await generateText({
      model: this.textModel,
      system,
      prompt,
      maxRetries: 2,
      abortSignal: spec.signal,
    });
    return result.text.trim();
  }

  async generateImage(spec: ImageSpec): Promise<GeneratedImage> {
    const { prompt, aspectRatio } = buildImagePrompt(spec);
    try {
      const { image } = await generateImage({
        model: this.imageModel,
        prompt,
        aspectRatio,
        maxRetries: 2,
        abortSignal: spec.signal,
      });
      const url = await this.saveImage(image.uint8Array, image.mediaType);
      return { url, alt: `${spec.brand.name} ${spec.channel}: ${spec.prompt.slice(0, 80)}` };
    } catch (error) {
      if (isImageUnavailable(error)) return this.fallbackImage(spec);
      throw error;
    }
  }
}
