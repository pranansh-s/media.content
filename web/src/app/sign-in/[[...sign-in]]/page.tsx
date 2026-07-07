import { SignIn } from '@clerk/nextjs';

import { clerkEnabled } from '@/lib/auth';

export default function SignInPage() {
  if (!clerkEnabled) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted max-w-sm text-center text-sm">
          Auth is not configured yet. Add Clerk keys to web/.env.local (see .env.example), then restart the dev server.
        </p>
      </main>
    );
  }
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <SignIn />
    </main>
  );
}
