import type { TextChannel } from '@media-content/shared';

import type { ContentProvider, GeneratedImage, ImageSpec, TextSpec } from './content-provider';

const TEXT_FIXTURES: Record<TextChannel, (prompt: string, brand: string) => string> = {
  tweet: (prompt, brand) => `🚀 Big news from ${brand}: ${prompt}\n\nTry it today — link below.`,
  linkedin: (prompt, brand) =>
    `We're excited to share an update from ${brand}.\n\n${prompt}\n\nOver the past months our team has been heads-down making this real. Here's what it means for you:\n\n• Faster workflows\n• Less manual work\n• More time for what matters\n\nWe'd love your feedback.`,
  reddit: (prompt, brand) =>
    `**${brand} update — feedback welcome**\n\n${prompt}\n\nHappy to answer questions in the comments. Not trying to shill — genuinely want input from this community.`,
  devto: (prompt, brand) =>
    `# How we built it: ${prompt}\n\nAt ${brand} we recently shipped something we're proud of. This post walks through the problem, the architecture, and what we learned.\n\n## The problem\n\n...\n\n## The approach\n\n...\n\n## Lessons learned\n\n...`,
  medium: (prompt, brand) =>
    `# ${prompt}\n\nEvery team hits the moment where the old way stops scaling. At ${brand}, that moment came last quarter — and it changed how we work.\n\n...`,
  'github-release': (prompt, brand) =>
    `## What's new\n\n${prompt}\n\n### Features\n\n- Core capability shipped\n- Performance improvements\n\n### Fixes\n\n- Assorted bug fixes\n\nThanks to everyone who filed issues. — the ${brand} team`,
};

function refined(base: string, refinementPrompt: string): string {
  return `${base}\n\n[refined: ${refinementPrompt}]`;
}

export class FixtureProvider implements ContentProvider {
  private readonly latencyMs: number;

  constructor(options: { latencyMs?: number } = {}) {
    this.latencyMs = options.latencyMs ?? 700;
  }

  private async delay(): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latencyMs * (0.5 + Math.random())));
    }
  }

  async generateText(spec: TextSpec): Promise<string> {
    await this.delay();
    const base = TEXT_FIXTURES[spec.channel](spec.prompt, spec.brand.name);
    const styled = spec.style ? `${base}\n\n[voice: ${spec.style}]` : base;
    return spec.refinementPrompt ? refined(spec.previousBody ?? styled, spec.refinementPrompt) : styled;
  }

  async generateImage(spec: ImageSpec): Promise<GeneratedImage> {
    await this.delay();
    const size = spec.channel === 'banner' ? '1500/500' : '1200/630';
    return {
      url: `https://picsum.photos/seed/${encodeURIComponent(spec.brand.name)}-${spec.channel}/${size}`,
      alt: `${spec.brand.name} ${spec.channel} for: ${spec.prompt.slice(0, 80)}`,
    };
  }
}
