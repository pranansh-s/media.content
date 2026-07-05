'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

import { clerkEnabled } from '@/lib/auth';

function SessionControls() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return null;

  return isSignedIn ? (
    <UserButton />
  ) : (
    <Link href="/sign-in" className="font-mono text-xs text-muted transition-colors hover:text-foreground">
      sign in
    </Link>
  );
}

export function AuthControls() {
  if (!clerkEnabled) return null;
  return <SessionControls />;
}
