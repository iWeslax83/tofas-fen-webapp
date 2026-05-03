const META_RE = /[.*+?^${}()|[\]\\]/g;

export function escapeRegex(input: string): string {
  return input.replace(META_RE, '\\$&');
}

export interface SafeSearchOptions {
  maxLength?: number;
}

const DEFAULT_MAX_LENGTH = 100;

/**
 * Build a case-insensitive RegExp suitable for $regex queries.
 * Returns null when the trimmed input is empty or exceeds `maxLength`
 * (default 100). Callers must treat null as "no search" (e.g. skip the
 * filter, or return an empty result set).
 *
 * Closes the residual ReDoS surface called out by N-H3 / N-M8 in the
 * 2026-04-29 review.
 */
export function safeSearchRegex(input: string, opts: SafeSearchOptions = {}): RegExp | null {
  const max = opts.maxLength ?? DEFAULT_MAX_LENGTH;
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return new RegExp(escapeRegex(trimmed), 'i');
}
