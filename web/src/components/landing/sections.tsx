import Link from 'next/link';

import { Wire } from '@/components/ui/wire';

import { CHANNEL_LABELS } from '@/constants/channels';
import { AUDIENCE, CHANNEL_NOTES, CHANNELS, FOOTER, HERO, VOICE, WIRE_LOG } from '@/constants/landing';

import { HeroWire } from './hero-wire';

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pt-24">
      <div className="min-w-0">
        <p className="text-accent font-mono text-xs tracking-widest uppercase">{HERO.eyebrow}</p>
        <h1 className="font-display mt-4 text-5xl leading-[1.02] font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          {HERO.title[0]}
          <br />
          {HERO.title[1]}
        </h1>
        <p className="text-muted mt-6 max-w-md text-lg">{HERO.lead}</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/studio"
            className="bg-accent text-accent-ink hover:bg-accent-strong focus-visible:outline-accent inline-flex h-12 items-center rounded-md px-7 font-sans text-base font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {HERO.primaryCta}
          </Link>
          <a href="#wire" className="text-muted hover:text-foreground font-mono text-sm transition-colors">
            {HERO.secondaryCta}
          </a>
        </div>
      </div>
      <HeroWire />
    </section>
  );
}

export function WireLog() {
  return (
    <section id="wire" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <p className="text-accent font-mono text-xs tracking-widest uppercase">{WIRE_LOG.eyebrow}</p>
      <h2 className="font-display mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">{WIRE_LOG.title}</h2>
      <div className="mt-12 grid gap-10 md:grid-cols-3">
        {WIRE_LOG.steps.map(step => (
          <div key={step.time}>
            <div className="flex items-center gap-3">
              <span className="text-accent font-mono text-sm">{step.time}</span>
              <Wire className="flex-1" />
            </div>
            <h3 className="font-display mt-4 text-xl font-bold">{step.event}</h3>
            <p className="text-muted mt-2 text-sm leading-relaxed">{step.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Channels() {
  return (
    <section id="channels" className="border-border bg-surface border-y">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="text-accent font-mono text-xs tracking-widest uppercase">{CHANNELS.eyebrow}</p>
        <h2 className="font-display mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">{CHANNELS.title}</h2>
        <div className="border-border bg-border mt-12 grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(CHANNEL_NOTES).map(([channel, note]) => (
            <div key={channel} className="bg-surface p-5">
              <h3 className="text-foreground font-mono text-sm">
                {CHANNEL_LABELS[channel as keyof typeof CHANNEL_LABELS]}
              </h3>
              <p className="text-muted mt-2 text-sm">{note}</p>
            </div>
          ))}
          <div className="bg-surface p-5 sm:col-span-2 lg:col-span-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-faint font-mono text-sm">{CHANNELS.roadmap.heading}</h3>
              <span className="border-border text-faint rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase">
                {CHANNELS.roadmap.badge}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Audience() {
  return (
    <section id="audience" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-accent font-mono text-xs tracking-widest uppercase">{AUDIENCE.eyebrow}</p>
        <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{AUDIENCE.title}</h2>
        <p className="text-muted mt-4">{AUDIENCE.lead}</p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {AUDIENCE.personas.map(persona => (
          <div key={persona.role}>
            <div className="border-border bg-surface flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed">
              <span className="text-faint font-mono text-xs">{AUDIENCE.personaPlaceholder}</span>
            </div>
            <h3 className="font-display mt-4 text-lg font-bold">{persona.role}</h3>
            <p className="text-muted mt-2 text-sm leading-relaxed">{persona.caption}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="border-border bg-surface flex min-h-[220px] items-center justify-center rounded-lg border border-dashed p-6">
          <span className="text-faint font-mono text-xs tracking-widest uppercase">
            {AUDIENCE.comparisonPlaceholder}
          </span>
        </div>
        <div className="border-border bg-surface text-muted rounded-lg border p-5 font-mono text-xs leading-loose">
          {AUDIENCE.specCard.readers.map(reader => (
            <p key={reader}>
              <span className="text-faint">reader:</span> {reader}
            </p>
          ))}
          <p>
            <span className="text-faint">{AUDIENCE.specCard.madeToLabel}</span>{' '}
            <span className="text-accent">{AUDIENCE.specCard.madeTo}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

export function Voice() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
      <div>
        <p className="text-accent font-mono text-xs tracking-widest uppercase">{VOICE.eyebrow}</p>
        <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{VOICE.title}</h2>
        <p className="text-muted mt-4 max-w-md">{VOICE.lead}</p>
      </div>
      <div className="border-border bg-surface text-muted rounded-lg border p-5 font-mono text-xs leading-loose">
        <p>
          <span className="text-faint">brand:</span> {VOICE.specCard.brand}
        </p>
        <p>
          <span className="text-faint">voice:</span> {VOICE.specCard.voice}
        </p>
        <p>
          <span className="text-faint">styles:</span>{' '}
          <span className="text-accent">{VOICE.specCard.styles.highlighted}</span> {VOICE.specCard.styles.rest}
        </p>
        <p>
          <span className="text-faint">applies to:</span> {VOICE.specCard.appliesTo}
        </p>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-border border-t">
      <div className="text-faint mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 font-mono text-xs sm:px-6">
        <span>{FOOTER.tagline}</span>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
