import { cn } from '@/lib/cn';

type ChipProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export function Chip({ selected = false, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-mono text-xs transition-colors',
        'focus-visible:outline-accent focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:pointer-events-none disabled:opacity-40',
        selected
          ? 'border-accent bg-accent-soft text-foreground'
          : 'border-border bg-surface text-muted hover:border-border-strong hover:text-foreground',
        className
      )}
      {...props}
    />
  );
}
