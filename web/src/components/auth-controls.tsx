'use client';

import Link from 'next/link';

import { UserButton, useUser } from '@clerk/nextjs';

export function AuthControls() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return null;

  return isSignedIn ? (
    <UserButton />
  ) : (
    <Link href="/sign-in" className="text-muted hover:text-foreground font-mono text-xs transition-colors">
      sign in
    </Link>
  );
}
