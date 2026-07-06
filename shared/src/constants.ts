export const TEXT_CHANNELS = ['tweet', 'linkedin', 'reddit', 'devto', 'medium', 'github-release'] as const;
export const IMAGE_CHANNELS = ['banner', 'social-image'] as const;
export const VIDEO_CHANNELS = ['video', 'demo'] as const;
export const GENERATABLE_CHANNELS = [...TEXT_CHANNELS, ...IMAGE_CHANNELS] as const;
export const ALL_CHANNELS = [...GENERATABLE_CHANNELS, ...VIDEO_CHANNELS] as const;

export const BRAND_NAME_MAX_LENGTH = 80;
export const TAGLINE_MAX_LENGTH = 160;
export const PROMPT_MAX_LENGTH = 2000;
export const REFINE_PROMPT_MAX_LENGTH = 1000;
export const CUSTOM_STYLE_MAX_LENGTH = 500;
export const WRITING_STYLE_MAX_LENGTH = 500;
export const REFERENCES_MAX_LENGTH = 4000;
export const REVISION_BODY_MAX_LENGTH = 20000;

export const PRESET_STYLE_IDS = ['casual-dev', 'formal-pr', 'hype-launch'] as const;

export const PRESET_STYLES: readonly {
  id: (typeof PRESET_STYLE_IDS)[number];
  name: string;
  description: string;
}[] = [
  {
    id: 'casual-dev',
    name: 'casual dev',
    description: 'First person, loose, talks like an engineer in a team channel.',
  },
  {
    id: 'formal-pr',
    name: 'formal PR',
    description: 'Third person, press-release register, quotable sentences.',
  },
  {
    id: 'hype-launch',
    name: 'hype launch',
    description: 'High energy, short punchy lines, built for launch day.',
  },
];
