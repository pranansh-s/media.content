'use client';

import { motion } from 'framer-motion';

import { arriveOnWire, stagger } from '@/lib/motion';

import { HERO_WIRE } from '@/constants/landing';

export function HeroWire() {
  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} aria-hidden className="relative min-w-0">
      <div className="border-border bg-surface rounded-lg border p-4">
        <div className="border-border text-muted flex items-center gap-2 border-b pb-3 font-mono text-xs">
          <span className="bg-accent size-1.5 shrink-0 animate-pulse rounded-full" />
          <span>{HERO_WIRE.status}</span>
          <span className="text-faint ml-auto min-w-0 truncate">{HERO_WIRE.brief}</span>
        </div>
        <ul className="divide-border divide-y">
          {HERO_WIRE.feed.map(item => (
            <motion.li key={item.tag} variants={arriveOnWire} className="flex items-center gap-3 py-3">
              <span className="border-border bg-surface-raised text-accent inline-flex w-10 shrink-0 justify-center rounded border py-0.5 font-mono text-[10px]">
                {item.tag}
              </span>
              <p className="text-muted min-w-0 truncate text-sm">{item.snippet}</p>
              <span className="text-faint ml-auto shrink-0 font-mono text-[10px]">{item.time}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
