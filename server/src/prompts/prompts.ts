import type { Brand, CampaignPlan, GeneratableChannel, TextChannel } from '@media-content/shared';

import type { ImageSpec, TextSpec } from '../providers/content-provider';

const CHANNEL_GUIDANCE: Record<TextChannel, string> = {
  tweet: [
    'Channel: X/Twitter post.',
    'Hard limit 280 characters — count them.',
    'No markdown, no bullet lists.',
    'At most one hashtag, only if it earns its place.',
    'Lead with the strongest claim; a link placeholder like {link} may be used once.',
  ].join('\n'),
  linkedin: [
    'Channel: LinkedIn post.',
    'First line must work as a hook before the fold.',
    'Short paragraphs of one to two sentences, blank line between them.',
    'Professional but human; no corporate filler, no emoji walls.',
    'End with one concrete call to action or question.',
  ].join('\n'),
  reddit: [
    'Channel: Reddit post.',
    'First line is the post title — specific and non-clickbait, no trailing punctuation.',
    'Then a blank line, then the body.',
    'Write community-native and transparent about being the builder; invite critique.',
    'No marketing superlatives — Reddit punishes them.',
  ].join('\n'),
  devto: [
    'Channel: dev.to article.',
    'Markdown with a single # title, then ## sections.',
    'Technical, first person, concrete details and trade-offs.',
    'Use fenced code blocks where an example clarifies.',
    'Aim for 400-700 words.',
  ].join('\n'),
  medium: [
    'Channel: Medium article.',
    'Markdown with a single # title, then ## sections.',
    'Narrative arc: the problem felt by the reader, the turn, the resolution.',
    'Less code-heavy than a dev blog; explain the why.',
    'Aim for 500-800 words.',
  ].join('\n'),
  'github-release': [
    'Channel: GitHub release notes.',
    "Start with '## What's new' followed by a one-paragraph summary.",
    "Then '### Features' and '### Fixes' as markdown bullet lists.",
    'Terse, factual, changelog register; credit the community once at the end.',
    'No hype adjectives.',
  ].join('\n'),
};

function brandBlock(brand: Brand): string {
  const lines = [`Brand: ${brand.name}`];
  if (brand.tagline) lines.push(`Tagline: ${brand.tagline}`);
  if (brand.writingStyle) lines.push(`Default brand voice: ${brand.writingStyle}`);
  if (brand.references) lines.push(`Brand references (links, past posts, examples):\n${brand.references}`);
  return lines.join('\n');
}

function planBlock(plan: CampaignPlan): string {
  return [
    'Campaign plan — every asset in this campaign follows it:',
    `Audience: ${plan.audience}`,
    `Key messages:\n${plan.keyMessages.map(message => `- ${message}`).join('\n')}`,
    `Tone: ${plan.tone}`,
    plan.hooks.length ? `Candidate hooks:\n${plan.hooks.map(hook => `- ${hook}`).join('\n')}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function evidenceBlock(evidence: string[]): string {
  return [
    'Brand evidence — ground claims, voice, and facts in these excerpts; never contradict them:',
    ...evidence.map(excerpt => `- ${excerpt}`),
  ].join('\n');
}

export function buildTextPrompt(spec: TextSpec): { system: string; prompt: string } {
  const sections = [
    'You are a senior content marketer producing publish-ready copy for a software product. You write for the specified channel like a native of it, never like an ad.',
    brandBlock(spec.brand),
    spec.style ? `Voice override for this campaign — follow it over the default brand voice: ${spec.style}` : null,
    spec.plan ? planBlock(spec.plan) : null,
    spec.evidence?.length ? evidenceBlock(spec.evidence) : null,
    CHANNEL_GUIDANCE[spec.channel],
    'Output only the content itself — no preamble, no explanations, no surrounding quotes. It is published verbatim.',
  ];
  const system = sections.filter(Boolean).join('\n\n');

  const prompt = spec.refinementPrompt
    ? [
        `The campaign brief: ${spec.prompt}`,
        `Current draft:\n${spec.previousBody ?? ''}`,
        `Revise the draft per this instruction, keeping every channel constraint: ${spec.refinementPrompt}`,
      ].join('\n\n')
    : `Write the ${spec.channel} content for this brief: ${spec.prompt}`;

  return { system, prompt };
}

const IMAGE_INTENT: Record<ImageSpec['channel'], { intent: string; aspectRatio: '21:9' | '16:9' }> = {
  banner: {
    intent: 'a wide hero banner for a website or repository header',
    aspectRatio: '21:9',
  },
  'social-image': {
    intent: 'a social link-preview card image (Open Graph style)',
    aspectRatio: '16:9',
  },
};

export function buildImagePrompt(spec: ImageSpec): { prompt: string; aspectRatio: '21:9' | '16:9' } {
  const { intent, aspectRatio } = IMAGE_INTENT[spec.channel];
  const parts = [
    `Design ${intent} for the brand "${spec.brand.name}"${spec.brand.tagline ? ` (${spec.brand.tagline})` : ''}.`,
    `The announcement it promotes: ${spec.prompt}.`,
    'Modern, minimal, product-marketing quality. Strong composition, restrained palette, generous negative space.',
    'Avoid rendering long text; at most the brand name or a two-to-three word phrase.',
    spec.refinementPrompt ? `Refinement: ${spec.refinementPrompt}.` : null,
  ];
  return { prompt: parts.filter(Boolean).join(' '), aspectRatio };
}

export function buildPlanPrompt(args: {
  prompt: string;
  brand: Brand;
  style: string | null;
  channels: readonly GeneratableChannel[];
}): { system: string; prompt: string } {
  const system = [
    'You are a campaign strategist. Given a brand and an announcement brief, produce a compact plan that keeps every channel asset coherent: the audience, the key messages (max 5), the tone, and candidate hooks.',
    brandBlock(args.brand),
    args.style ? `Requested voice for this campaign: ${args.style}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');
  const prompt = `Brief: ${args.prompt}\n\nTarget channels: ${args.channels.join(', ')}`;
  return { system, prompt };
}
