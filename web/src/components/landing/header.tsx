import Link from 'next/link';

import { AuthControls } from '@/components/auth-controls';
import { ThemeToggle } from '@/components/ui/theme-toggle';

import { HEADER_CTA, HEADER_NAV } from '@/constants/landing';

export function Header() {
  return (
    <header className="border-border bg-background/90 sticky top-0 z-20 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-foreground flex items-baseline font-mono text-sm font-medium">
          media<span className="text-accent text-xl">.</span>content
        </Link>
        <nav className="text-muted hidden items-center gap-6 font-mono text-xs sm:flex">
          {HEADER_NAV.map(item => (
            <a key={item.href} href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <AuthControls />
          <Link
            href="/studio"
            className="bg-accent text-accent-ink hover:bg-accent-strong focus-visible:outline-accent inline-flex h-8 items-center rounded-md px-3 font-sans text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {HEADER_CTA}
          </Link>
        </div>
      </div>
    </header>
  );
}
