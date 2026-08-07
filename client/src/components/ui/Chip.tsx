import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/**
 * Durum ve etiket rozeti.
 *
 * Eskiden `rounded-full` + renkli dolgu ("hap") idi. O kalıp durum göstermek
 * için kullanılmıyor artık: köşeli, ince çerçeveli etiket. Renk çerçeve ve
 * yazıda taşınıyor, arka plan boş kalıyor. Kenar çubuğundaki rol/pansiyon
 * etiketleri de zaten bu görünümdeydi, ikisi artık aynı.
 */
export const chipVariants = cva(
  'inline-flex items-center gap-1.5 px-2 h-[22px] rounded-[3px] border text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        default: 'bg-[var(--surface-2)] text-[var(--ink-2)] border-[var(--rule)]',
        neutral: 'bg-[var(--surface-2)] text-[var(--ink-2)] border-[var(--rule)]',
        state: 'bg-transparent text-[var(--accent)] border-[var(--accent)]',
        accent: 'bg-transparent text-[var(--accent)] border-[var(--accent)]',
        ok: 'bg-transparent text-[var(--ok)] border-[var(--ok)]',
        warn: 'bg-transparent text-[var(--warn)] border-[var(--warn)]',
        info: 'bg-transparent text-[var(--info)] border-[var(--info)]',
        // Tek dolu varyant: bir şeyi öne çıkarmak için, durum göstermek için değil.
        black: 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]',
        outline: 'bg-transparent text-[var(--ink)] border-[var(--ink)]',
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
