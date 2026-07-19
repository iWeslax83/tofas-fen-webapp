import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import '../SkeletonComponents.css';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap',
    'rounded-[var(--radius-sm)] transition-colors',
    'focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--accent)] text-white border border-[var(--accent)] hover:bg-[var(--accent-strong)] hover:border-[var(--accent-strong)]',
        secondary:
          'bg-[var(--surface)] text-[var(--ink)] border border-[var(--rule)] hover:bg-[var(--surface-2)]',
        ghost:
          'bg-transparent text-[var(--ink)] border border-transparent hover:bg-[var(--surface-2)]',
        danger:
          'bg-[var(--accent-tint)] text-[var(--accent)] border border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white',
        outline:
          'bg-transparent text-[var(--ink)] border border-[var(--rule)] hover:border-[var(--accent)]',
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
      {loading && <span aria-hidden="true" className="loadbar" style={{ width: 22, height: 3 }} />}
      {loading && <span className="sr-only">Yükleniyor</span>}
      {/* The button's own flex row only ever sees this one wrapper, so the
          wrapper has to be the row: without it an icon + label stacked
          vertically instead of sitting side by side. */}
      <span className="inline-flex items-center gap-2">{children}</span>
    </button>
  ),
);
Button.displayName = 'Button';
