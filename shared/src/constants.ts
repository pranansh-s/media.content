export const TEXT_CHANNELS = ['tweet', 'linkedin', 'reddit', 'devto', 'medium', 'github-release'] as const;
export const IMAGE_CHANNELS = ['banner', 'social-image'] as const;
export const VIDEO_CHANNELS = ['video', 'demo'] as const;
export const GENERATABLE_CHANNELS = [...TEXT_CHANNELS, ...IMAGE_CHANNELS] as const;
export const ALL_CHANNELS = [...GENERATABLE_CHANNELS, ...VIDEO_CHANNELS] as const;

export const PROMPT_MAX_LENGTH = 2000;
export const REFINE_PROMPT_MAX_LENGTH = 1000;
export const CUSTOM_STYLE_MAX_LENGTH = 500;
