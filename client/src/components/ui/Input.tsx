import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Soft Modern input — filled box. Paper bg (dark: surface-2), 1px rule
 * border all around, focus = accent border + tint ring.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full bg-[var(--paper)] dark:bg-[var(--surface-2)] border border-[var(--rule)] rounded-[var(--radius-sm)] px-3 py-2',
      'text-[var(--ink)] placeholder:text-[var(--ink-dim)]',
      'focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-tint)]',
      'focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'transition-colors',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
