import { google } from '@ai-sdk/google';
import { campaignPlanSchema, type Brand, type CampaignPlan, type GeneratableChannel } from '@media-content/shared';
import { generateObject, type LanguageModel } from 'ai';

import { buildPlanPrompt } from '../prompts/prompts';

export async function generateCampaignPlan(
  args: {
    prompt: string;
    brand: Brand;
    style: string | null;
    channels: readonly GeneratableChannel[];
    signal?: AbortSignal;
  },
  model?: LanguageModel,
): Promise<CampaignPlan | null> {
  const { system, prompt } = buildPlanPrompt(args);
  try {
    const result = await generateObject({
      model: model ?? google(process.env.GEMINI_TEXT_MODEL ?? 'gemini-2.5-flash'),
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
