import { cva } from 'class-variance-authority';

import { cn } from '@/lib/cn';

import type { VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'focus-visible:outline-accent inline-flex items-center justify-center gap-2 rounded-md font-sans font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-ink hover:bg-accent-strong',
        secondary: 'border-border-strong bg-surface text-foreground hover:border-accent hover:text-accent border',
        ghost: 'text-muted hover:bg-surface-raised hover:text-foreground',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-5 text-sm',
        lg: 'h-12 px-7 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
