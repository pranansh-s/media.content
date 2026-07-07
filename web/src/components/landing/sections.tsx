import Link from 'next/link';

import { CHANNEL_LABELS } from '@/constants/channels';
import { Wire } from '@/components/ui/wire';

import { HeroWire } from './hero-wire';

export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-24">
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">For teams without a press desk</p>
        <h1 className="mt-4 font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
          Your launch,
          <br />
          syndicated.
        </h1>
        <p className="mt-6 max-w-md text-lg text-muted">
          Write one brief. media.content turns it into tweets, LinkedIn posts, release notes, articles, and banners — in
          your voice, on your brand, ready to post.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/studio"
            className="inline-flex h-12 items-center rounded-md bg-accent px-7 font-sans text-base font-bold text-accent-ink transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Open the studio
          </Link>
          <a href="#wire" className="font-mono text-sm text-muted transition-colors hover:text-foreground">
            see how it works →
          </a>
        </div>
      </div>
      <HeroWire />
    </section>
  );
}

const LOG = [
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
];

export function WireLog() {
  return (
    <section id="wire" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">How it works</p>
      <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
        From brief to everywhere in just a few minutes
      </h2>
      <div className="mt-12 grid gap-10 md:grid-cols-3">
        {LOG.map(step => (
          <div key={step.time}>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-accent">{step.time}</span>
              <Wire className="flex-1" />
            </div>
            <h3 className="mt-4 font-display text-xl font-bold">{step.event}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const CHANNEL_NOTES: Record<string, string> = {
  tweet: 'Short, sharp, thread-ready.',
  linkedin: 'Professional register without the cringe.',
  reddit: 'Reads like a person, not a press release.',
  devto: 'Technical walkthroughs with real structure.',
  medium: 'Longform storytelling from your brief.',
  'github-release': 'Changelogs your users will actually read.',
  banner: 'On-brand headers, sized for each platform.',
  'social-image': 'Open-graph cards that get the click.',
};

export function Channels() {
  return (
    <section id="channels" className="border-y border-border bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Channels</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
          One story, told the way each channel expects
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(CHANNEL_NOTES).map(([channel, note]) => (
            <div key={channel} className="bg-surface p-5">
              <h3 className="font-mono text-sm text-foreground">
                {CHANNEL_LABELS[channel as keyof typeof CHANNEL_LABELS]}
              </h3>
              <p className="mt-2 text-sm text-muted">{note}</p>
            </div>
          ))}
          <div className="bg-surface p-5 sm:col-span-2 lg:col-span-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-mono text-sm text-faint">Video & product demos</h3>
              <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase text-faint">
                on the roadmap
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PERSONAS = [
  {
    role: 'Founder',
    caption: 'Shipping v1 tonight, drafting the launch tweet at midnight.',
  },
  {
    role: 'Engineer running the launch',
    caption: 'Wrote the release notes, now needs a LinkedIn post and a banner.',
  },
  {
    role: 'Two-person team',
    caption: 'No comms desk, no PR retainer, still needs to sound like a company.',
  },
];

export function Audience() {
  return (
    <section id="audience" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Made for</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Small teams, big announcements
        </h2>
        <p className="mt-4 text-muted">
          You don&rsquo;t have a comms desk. You have a launch tomorrow and a browser tab with a half-written tweet.
          media.content is built for the people doing the work — founders, indie devs, tiny teams — who need to sound
          like a real company without hiring one.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PERSONAS.map(persona => (
          <div key={persona.role} className="flex flex-col">
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-border bg-surface">
              <span className="font-mono text-xs text-faint">[ infographic ]</span>
            </div>
            <h3 className="mt-4 font-display text-lg font-bold">{persona.role}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{persona.caption}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-border bg-surface p-6">
          <span className="font-mono text-xs uppercase tracking-widest text-faint">[ before / after ]</span>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 font-mono text-xs leading-loose text-muted">
          <p>
            <span className="text-faint">reader:</span> founder shipping v1
          </p>
          <p>
            <span className="text-faint">reader:</span> engineer running the launch
          </p>
          <p>
            <span className="text-faint">reader:</span> two-person team, no comms desk
          </p>
          <p>
            <span className="text-faint">made to:</span> <span className="text-accent">skip the press-kit ritual</span>
          </p>
        </div>
      </div>
    </section>
  );
}

export function Voice() {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Brand & voice</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">Sounds like you, everywhere</h2>
        <p className="mt-4 max-w-md text-muted">
          Your brand holds who you are — name, tagline, writing style, and the references that show how you sound. A
          casual dev update and a formal press announcement come from the same brief, without retyping who you are.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-5 font-mono text-xs leading-loose text-muted">
        <p>
          <span className="text-faint">brand:</span> Acme
        </p>
        <p>
          <span className="text-faint">voice:</span> confident, technical, no hype words
        </p>
        <p>
          <span className="text-faint">styles:</span> <span className="text-accent">casual dev</span> · formal PR · hype
          launch
        </p>
        <p>
          <span className="text-faint">applies to:</span> every draft, every channel
        </p>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 font-mono text-xs text-faint sm:px-6">
        <span>
          media.content — the newsroom you didn&rsquo;t hire
        </span>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
