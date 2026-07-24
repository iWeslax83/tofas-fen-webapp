import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type StatusTagTone = 'ok' | 'warn' | 'accent' | 'info' | 'neutral';

const TONE_COLOR: Record<StatusTagTone, string> = {
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  accent: 'var(--accent)',
  info: 'var(--info)',
  neutral: 'var(--ink-dim)',
};

export interface StatusTagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTagTone;
}

// Durum etiketi: renkli nokta + düz metin. Chip'in dolgulu "bubble" görünümü
// yerine daha sade, gazete tipografisine yakın bir işaretleyici.
export function StatusTag({ tone = 'neutral', className, children, ...props }: StatusTagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-2)] whitespace-nowrap',
        className,
      )}
      {...props}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: TONE_COLOR[tone] }}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
