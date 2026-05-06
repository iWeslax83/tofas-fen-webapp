// Match sensitive segments only at underscore (or string) boundaries so that
// keys like `tokenVersion` or `cpwd` aren't redacted by substring overlap.
// Bare `token` is matched only as a suffix (e.g. `token`, `accessToken`,
// `refreshToken`) — not as a prefix (`tokenVersion`). The redactor still
// biases toward over-redacting: any key starting with `secret_`, `password_`,
// etc. is redacted on the assumption that a logging false-positive (one
// debug line shows `[REDACTED]`) is preferable to a leaked credential.
const SENSITIVE_KEY_RE =
  /(?:^|_)(?:passwords?|passwd|sifre|plaintext|secrets?|cookies?|authorization|pw|pwd|jwt|api_key|api_token)(?:_|$)|(?:^|_)tokens?$/i;

function isSensitiveKey(rawKey: string): boolean {
  // Normalize camelCase, kebab-case, and dot-separated keys to snake_case so
  // the underscore-bounded regex above matches consistently across naming
  // styles (e.g. accessToken, api-key, auth.token).
  const normalized = rawKey
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/[-.]/g, '_')
    .toLowerCase();
  return SENSITIVE_KEY_RE.test(normalized);
}

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
    if (isSensitiveKey(key)) {
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
