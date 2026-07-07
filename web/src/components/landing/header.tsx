import Link from 'next/link';

import { AuthControls } from '@/components/auth-controls';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-baseline font-mono text-sm font-medium text-foreground">
          media<span className="text-accent text-xl">.</span>content
        </Link>
        <nav className="hidden items-center gap-6 font-mono text-xs text-muted sm:flex">
          <a href="#channels" className="transition-colors hover:text-foreground">
            channels
          </a>
          <a href="#wire" className="transition-colors hover:text-foreground">
            how it works
          </a>
          <a href="#audience" className="transition-colors hover:text-foreground">
            made for
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <AuthControls />
          <Link
            href="/studio"
            className="inline-flex h-8 items-center rounded-md bg-accent px-3 font-sans text-xs font-bold text-accent-ink transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Open the studio
          </Link>
        </div>
      </div>
    </header>
  );
}
