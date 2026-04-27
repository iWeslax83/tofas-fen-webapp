import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

export const chipVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 h-6 text-xs font-medium uppercase tracking-wider whitespace-nowrap',
  {
    variants: {
      tone: {
        default: 'bg-[var(--surface-2)] text-[var(--ink-2)] border border-[var(--rule)]',
        state: 'bg-[var(--state)] text-white',
        black: 'bg-[var(--ink)] text-[var(--paper)]',
        outline: 'bg-transparent text-[var(--ink)] border border-[var(--ink)]',
      },
    },
    defaultVariants: { tone: 'default' },
  },
);

export interface ChipProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof chipVariants> {}

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(({ className, tone, ...props }, ref) => (
  <span ref={ref} className={cn(chipVariants({ tone }), className)} {...props} />
));
Chip.displayName = 'Chip';
