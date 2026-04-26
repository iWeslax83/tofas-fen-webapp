import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const cardVariants = cva('relative bg-[var(--paper)] border border-[var(--rule)]', {
  variants: {
    tone: {
      default: '',
      tinted: 'bg-[var(--surface)]',
    },
  },
  defaultVariants: { tone: 'default' },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  /** Devlet'in kırmızı sol şeridi — resmi belge hissi. */
  accentBar?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, tone, accentBar, children, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ tone }), className)} {...props}>
      {accentBar && (
        <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--state)]" />
      )}
      <div className={cn(accentBar && 'pl-3')}>{children}</div>
    </div>
  ),
);
Card.displayName = 'Card';
