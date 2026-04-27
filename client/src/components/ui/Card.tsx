import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

export const cardVariants = cva('relative bg-[var(--paper)] border border-[var(--rule)]', {
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
  /** Class on the inner content wrapper. Use this for padding/spacing
   *  inside the card; `className` targets only the outer shell. */
  contentClassName?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, tone, accentBar, contentClassName, children, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ tone }), className)} {...props}>
      {accentBar && (
        <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--state)]" />
      )}
      <div className={cn(accentBar && 'pl-3', contentClassName)}>{children}</div>
    </div>
  ),
);
Card.displayName = 'Card';
