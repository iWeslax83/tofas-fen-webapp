import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Devlet input — flat, alt-kenarlı. Form alanlarında kart/border yok,
 * sadece bir cetvel çizgisi. Focus'ta state rengiyle altı kalınlaşır.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full bg-transparent border-0 border-b border-[var(--rule)] px-1 py-2',
      'text-[var(--ink)] placeholder:text-[var(--ink-dim)]',
      'focus:outline-none focus:border-[var(--state)] focus:border-b-2 focus:pb-[7px]',
      'focus-visible:outline-2 focus-visible:outline-[var(--state)] focus-visible:outline-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'transition-colors',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
