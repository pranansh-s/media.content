import { cn } from '@/lib/cn';

export function Wire({ className }: { className?: string }) {
  return <div aria-hidden className={cn('wire-line w-full', className)} />;
}
