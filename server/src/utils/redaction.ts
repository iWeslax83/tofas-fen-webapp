const SENSITIVE_KEY_RE =
  /(password|sifre|pw|plaintext|token|secret|api[_-]?key|authorization|cookie)/i;
const REDACTED = '[REDACTED]';
const CIRCULAR = '[CIRCULAR]';
const DEPTH_LIMIT = '[DEPTH_LIMIT]';
const MAX_DEPTH = 8;

function clone(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (depth >= MAX_DEPTH) return DEPTH_LIMIT;
  if (value === null || typeof value !== 'object') return value;

  const obj = value as object;
  if (seen.has(obj)) return CIRCULAR;
  seen.add(obj);

  if (Array.isArray(value)) {
    return value.map((item) => clone(item, depth + 1, seen));
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_RE.test(key)) {
      out[key] = REDACTED;
    } else {
      out[key] = clone(val, depth + 1, seen);
    }
  }
  return out;
}

/**
 * Deep-clone `input`, replacing values for keys matching the sensitive-key
 * pattern with '[REDACTED]'. Pure: never mutates input. Bounded depth.
 *
 * Use this before logging request bodies, query strings, or arbitrary
 * payloads that may carry credentials. See N-C2 in
 * CODE_REVIEW_REPORT_2026-04-29.md.
 */
export function redactSensitive<T>(input: T): T {
  return clone(input, 0, new WeakSet()) as T;
}
