import type { GeneratableChannel, VideoChannel } from '@media-content/shared';

export const CHANNEL_LABELS: Record<GeneratableChannel | VideoChannel, string> = {
  tweet: 'X / Twitter',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
  devto: 'Dev.to',
  medium: 'Medium',
  'github-release': 'GitHub release',
  banner: 'Banner',
  'social-image': 'Social image',
  video: 'Video',
  demo: 'Demo',
};

export const CHANNEL_TAGS: Record<GeneratableChannel | VideoChannel, string> = {
  tweet: 'TWT',
  linkedin: 'LNK',
  reddit: 'RDT',
  devto: 'DEV',
  medium: 'MED',
  'github-release': 'REL',
  banner: 'BNR',
  'social-image': 'IMG',
  video: 'VID',
  demo: 'DMO',
};
