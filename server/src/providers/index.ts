import type { ImageSpec } from './content-provider';
import type { ContentProvider } from './content-provider';
import { FixtureProvider } from './fixture-provider';
import { GeminiProvider } from './gemini-provider';

export function isGeminiEnabled(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export function createProviderFromEnv(deps: {
  saveImage: (bytes: Uint8Array, mediaType: string) => Promise<string>;
}): ContentProvider {
  if (!isGeminiEnabled()) return new FixtureProvider();
  const fixture = new FixtureProvider({ latencyMs: 0 });
  return new GeminiProvider({
    saveImage: deps.saveImage,
    fallbackImage: (spec: ImageSpec) => fixture.generateImage(spec),
  });
}
