'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from 'next-themes';

import { clerkEnabled } from '@/lib/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const inner = (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );

  return clerkEnabled ? <ClerkProvider>{inner}</ClerkProvider> : inner;
}
