import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, disabled, ...props }, ref) => (
    <label
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-[var(--radius-full)]',
        disabled && 'opacity-60 cursor-not-allowed',
        className,
      )}
    >
      <input ref={ref} type="checkbox" disabled={disabled} className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-0 rounded-[var(--radius-full)] bg-[var(--rule-2)] transition-colors',
          'peer-checked:bg-[var(--accent)]',
          !disabled && 'cursor-pointer',
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          'relative h-[18px] w-[18px] translate-x-[3px] rounded-full bg-[var(--paper)] transition-transform',
          'peer-checked:translate-x-[23px]',
        )}
      />
    </label>
  ),
);
Switch.displayName = 'Switch';
