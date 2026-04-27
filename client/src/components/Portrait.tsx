import { cn } from '../utils/cn';

export interface PortraitProps {
  /** Display name; first two initials render as the fallback overlay. */
  name: string;
  /** Optional photo URL. When undefined, the SVG silhouette renders. */
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<PortraitProps['size']>, string> = {
  // 4:5 aspect ratio (resmi vesikalık oranı)
  sm: 'w-10 h-[3.125rem]',
  md: 'w-16 h-20',
  lg: 'w-24 h-30',
};

const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

/**
 * Devlet vesikalık portresi. Renders an actual photo when provided,
 * otherwise an SVG silhouette in the active surface tone.
 *
 * The silhouette reads as a low-contrast filler so a real upload feature
 * (later PR) can swap in without restyling.
 */
export function Portrait({ name, src, size = 'md', className }: PortraitProps) {
  const sizeCls = SIZE_CLASSES[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          sizeCls,
          'object-cover border border-[var(--rule)] bg-[var(--surface-2)]',
          className,
        )}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${name} (vesikalık yok, baş harfler)`}
      className={cn(
        sizeCls,
        'relative border border-[var(--rule)] bg-[var(--surface-2)] flex items-center justify-center overflow-hidden',
        className,
      )}
    >
      <svg
        viewBox="0 0 40 50"
        className="absolute inset-0 w-full h-full text-[var(--ink-dim-2)]"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="20" cy="18" r="7" fill="currentColor" opacity="0.45" />
        <path d="M 6 50 Q 6 32 20 32 Q 34 32 34 50 Z" fill="currentColor" opacity="0.45" />
      </svg>
      <span className="relative font-serif text-sm text-[var(--ink-2)]">{initialsOf(name)}</span>
    </div>
  );
}
