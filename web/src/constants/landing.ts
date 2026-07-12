import type { TextChannel } from '@media-content/shared';

export const HEADER_NAV = [
  { href: '#channels', label: 'channels' },
  { href: '#wire', label: 'how it works' },
  { href: '#audience', label: 'made for' },
];

export const HEADER_CTA = 'Open the studio';

export const HERO = {
  eyebrow: 'For teams without a press desk',
  title: ['Your launch,', 'syndicated.'],
  lead: 'Write one brief. media.content turns it into tweets, LinkedIn posts, release notes, and articles — in your voice, on your brand, ready to post.',
  primaryCta: 'Open the studio',
  secondaryCta: 'see how it works →',
};

export const HERO_WIRE = {
  status: 'on the wire',
  brief: 'brief: “we launched v2 today”',
  feed: [
    {
      tag: 'TWT',
      time: '09:42:07',
      snippet: 'Big news from Acme: v2 of the API monitor is live. Alerts in 5 minutes, not 50.',
    },
    {
      tag: 'LNK',
      time: '09:42:11',
      snippet: "We're excited to share an update from Acme. Over the past months our team…",
    },
    { tag: 'REL', time: '09:42:16', snippet: "## What's new — Streaming alerts, 4x faster ingest, new dashboard." },
    { tag: 'DEV', time: '09:42:21', snippet: '# How we built streaming alerts on a single Postgres box' },
    { tag: 'RDT', time: '09:42:24', snippet: 'We rebuilt our alerting pipeline and cut delivery to 5 minutes. AMA.' },
  ],
};

export const WIRE_LOG = {
  eyebrow: 'How it works',
  title: 'From brief to everywhere in just a few minutes',
  steps: [
    {
      time: '09:41',
      event: 'brief filed',
      detail:
        'You write what happened — a launch, a raise, a release — in plain words. Pick the channels it should reach.',
    },
    {
      time: '09:42',
      event: 'on the wire',
      detail:
        'Every channel gets its own draft, written for how that audience actually reads. Your brand voice applies everywhere.',
    },
    {
      time: '09:45',
      event: 'edited & shipped',
      detail:
        'Tighten any draft in the editor, or tell it what to change — "shorter", "more technical", "add the pricing link".',
    },
  ],
};

export const CHANNELS = {
  eyebrow: 'Channels',
  title: 'One story, told the way each channel expects',
  roadmap: {
    heading: 'Banners, social images, video & product demos',
    badge: 'on the roadmap',
  },
};

export const CHANNEL_NOTES: Record<TextChannel, string> = {
  tweet: 'Short, sharp, thread-ready.',
  linkedin: 'Professional register without the cringe.',
  reddit: 'Reads like a person, not a press release.',
  devto: 'Technical walkthroughs with real structure.',
  medium: 'Longform storytelling from your brief.',
  'github-release': 'Changelogs your users will actually read.',
};

export const AUDIENCE = {
  eyebrow: 'Made for',
  title: 'Small teams, big announcements',
  lead: "You don't have a comms desk. You have a launch tomorrow and a browser tab with a half-written tweet. media.content is built for the people doing the work — founders, indie devs, tiny teams — who need to sound like a real company without hiring one.",
  personas: [
    {
      role: 'Founder',
      caption: 'Shipping v1 tonight, drafting the launch tweet at midnight.',
    },
    {
      role: 'Engineer running the launch',
      caption: 'Wrote the release notes, now needs a LinkedIn post and a launch tweet.',
    },
    {
      role: 'Two-person team',
      caption: 'No comms desk, no PR retainer, still needs to sound like a company.',
    },
  ],
  personaPlaceholder: '[ infographic ]',
  comparisonPlaceholder: '[ before / after ]',
  specCard: {
    readers: ['founder shipping v1', 'engineer running the launch', 'two-person team, no comms desk'],
    madeToLabel: 'made to:',
    madeTo: 'skip the press-kit ritual',
  },
};

export const VOICE = {
  eyebrow: 'Brand & voice',
  title: 'Sounds like you, everywhere',
  lead: 'Your brand holds who you are — name, tagline, writing style, and the references that show how you sound. A casual dev update and a formal press announcement come from the same brief, without retyping who you are.',
  specCard: {
    brand: 'Acme',
    voice: 'confident, technical, no hype words',
    styles: {
      highlighted: 'casual dev',
      rest: '· formal PR · hype launch',
    },
    appliesTo: 'every draft, every channel',
  },
};

export const FOOTER = {
  tagline: "media.content — the newsroom you didn't hire",
};
