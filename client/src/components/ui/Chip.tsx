import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

export const chipVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 h-[22px] rounded-full text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        // Neutral tint — the default look, and Soft Modern's `chip-neutral`.
        default: 'bg-[var(--surface-2)] text-[var(--ink-2)]',
        neutral: 'bg-[var(--surface-2)] text-[var(--ink-2)]',
        // Accent tint — was a solid red fill; Soft Modern status chips are
        // tint-only (see docs/ui-overhaul-2026-07-plan.md).
        state: 'bg-[var(--accent-tint)] text-[var(--accent)]',
        accent: 'bg-[var(--accent-tint)] text-[var(--accent)]',
        ok: 'bg-[var(--ok-tint)] text-[var(--ok)]',
        warn: 'bg-[var(--warn-tint)] text-[var(--warn)]',
        info: 'bg-[var(--info-tint)] text-[var(--info)]',
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
