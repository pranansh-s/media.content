import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';

import { campaignPlanSchema } from '@media-content/shared';

import type { Brand, CampaignPlan, GeneratableChannel } from '@media-content/shared';
import type { LanguageModel } from 'ai';

import { buildPlanPrompt } from '../prompts/prompts';

export async function generateCampaignPlan(
  args: {
    prompt: string;
    brand: Brand;
    style: string | null;
    channels: readonly GeneratableChannel[];
    signal?: AbortSignal;
  },
  model?: LanguageModel
): Promise<CampaignPlan | null> {
  const { system, prompt } = buildPlanPrompt(args);
  try {
    const result = await generateObject({
      model: model ?? google(process.env.GEMINI_TEXT_MODEL ?? 'gemini-3.1-flash-lite'),
      schema: campaignPlanSchema,
      system,
      prompt,
      maxRetries: 2,
      abortSignal: args.signal,
    });
    return result.object;
  } catch (error) {
    if (args.signal?.aborted || (error as Error)?.name === 'AbortError') throw error;
    return null;
  }
}
