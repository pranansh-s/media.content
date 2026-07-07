'use client';

import Link from 'next/link';

import { UserButton, useUser } from '@clerk/nextjs';

import { clerkEnabled } from '@/lib/auth';

function SessionControls() {
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

export function AuthControls() {
  if (!clerkEnabled) return null;
  return <SessionControls />;
}
