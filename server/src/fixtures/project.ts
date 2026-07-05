import type { Project } from '@media-content/shared';

export const DEFAULT_PROJECT: Project = {
  id: '0b295d18-4b0e-4c58-9f3a-2f6a4b1c8d01',
  name: 'Acme Dev Tools',
  brand: {
    name: 'Acme',
    tagline: 'Ship faster with confidence',
    links: ['https://acme.dev', 'https://github.com/acme'],
    colors: ['#0f172a', '#38bdf8'],
    logoUrl: null,
    voiceNotes: 'Confident and technical. No hype words, no exclamation marks in professional channels.',
    examples: [],
  },
  writingStyles: [
    {
      id: '4c1f9d62-8a37-4e2b-b1c4-7d5e9f0a3b12',
      name: 'casual dev',
      description: 'First person, loose, talks like an engineer in a team channel.',
    },
    {
      id: '9e8b7a60-1c2d-4f3e-a5b6-c7d8e9f0a123',
      name: 'formal PR',
      description: 'Third person, press-release register, quotable sentences.',
    },
    {
      id: 'd2c3b4a5-6f7e-4d8c-9b0a-1e2f3a4b5c6d',
      name: 'hype launch',
      description: 'High energy, short punchy lines, built for launch day.',
    },
  ],
};
