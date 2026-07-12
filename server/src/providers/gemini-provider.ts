import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

import type { ContentProvider, TextSpec } from './content-provider';
import type { LanguageModel } from 'ai';

import { buildTextPrompt } from '../prompts/prompts';

interface GeminiProviderOptions {
  textModel?: LanguageModel;
}

export class GeminiProvider implements Pick<ContentProvider, 'generateText'> {
  private readonly textModel: LanguageModel;

  constructor(options: GeminiProviderOptions = {}) {
    this.textModel = options.textModel ?? google(process.env.GEMINI_TEXT_MODEL ?? 'gemini-3.1-flash-lite');
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
}
