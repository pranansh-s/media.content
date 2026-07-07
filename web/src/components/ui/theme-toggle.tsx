'use client';

import { useSyncExternalStore } from 'react';

import { useTheme } from 'next-themes';

import { cn } from '@/lib/cn';

const emptySubscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <button
      type="button"
      aria-label={mounted ? (isDark ? 'Switch to light theme' : 'Switch to dark theme') : 'Switch theme'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'border-border text-muted hover:border-border-strong hover:text-foreground inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-mono text-xs transition-colors',
        'focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2',
        className
      )}
    >
      <span className={cn('size-1.5 rounded-full', isDark ? 'bg-accent' : 'bg-border-strong')} />
      {mounted ? (isDark ? 'midnight' : 'daylight') : '···'}
    </button>
  );
}
