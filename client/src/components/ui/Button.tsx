import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap',
    'transition-colors',
    'focus-visible:outline-2 focus-visible:outline-[var(--state)] focus-visible:outline-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--ink)] text-[var(--paper)] border border-[var(--ink)] hover:bg-[var(--state)] hover:border-[var(--state)]',
        secondary:
          'bg-transparent text-[var(--ink)] border border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)]',
        ghost:
          'bg-transparent text-[var(--ink)] border border-transparent hover:bg-[var(--surface-2)]',
        danger:
          'bg-[var(--state)] text-white border border-[var(--state)] hover:bg-[var(--state-deep)] hover:border-[var(--state-deep)]',
        outline:
          'bg-transparent text-[var(--ink)] border border-[var(--rule)] hover:border-[var(--ink)]',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-5 text-base',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, fullWidth, loading, disabled, type = 'button', children, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
        />
      )}
      {loading && <span className="sr-only">Yükleniyor</span>}
      <span>{children}</span>
    </button>
  ),
);
Button.displayName = 'Button';
