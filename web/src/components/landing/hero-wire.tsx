'use client';

import { motion } from 'framer-motion';

import { arriveOnWire, stagger } from '@/lib/motion';

const FEED = [
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
  { tag: 'BNR', time: '09:42:24', snippet: '1500 x 500 launch banner, brand colors applied.' },
];

export function HeroWire() {
  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} aria-hidden className="relative min-w-0">
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center gap-2 border-b border-border pb-3 font-mono text-xs text-muted">
          <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent" />
          <span className="shrink-0">on the wire</span>
          <span className="ml-auto min-w-0 truncate text-faint">brief: &ldquo;we launched v2 today&rdquo;</span>
        </div>
        <ul className="divide-y divide-border">
          {FEED.map(item => (
            <motion.li key={item.tag} variants={arriveOnWire} className="flex items-start gap-3 py-3">
              <span className="mt-0.5 inline-flex w-10 shrink-0 justify-center rounded border border-border bg-surface-raised py-0.5 font-mono text-[10px] text-accent">
                {item.tag}
              </span>
              <p className="min-w-0 truncate text-sm text-muted">{item.snippet}</p>
              <span className="ml-auto shrink-0 font-mono text-[10px] text-faint">{item.time}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
