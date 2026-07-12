'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </ThemeProvider>
    </ClerkProvider>
  );
}
