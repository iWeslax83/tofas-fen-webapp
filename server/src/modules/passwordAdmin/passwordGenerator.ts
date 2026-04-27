import { randomBytes } from 'crypto';

export const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export const DEFAULT_PASSWORD_LENGTH = 8;

/**
 * Generate a cryptographically random password using rejection sampling
 * to avoid modulo bias. Draws from an alphabet with confusable characters
 * removed (0/O/o, 1/l/I) for ease of dictation.
 */
export function generatePassword(length: number = DEFAULT_PASSWORD_LENGTH): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error(`generatePassword: length must be a positive integer (got ${length})`);
  }

  const n = PASSWORD_ALPHABET.length;
  // Largest multiple of n that fits in a byte; bytes above this are rejected.
  const maxUnbiased = Math.floor(256 / n) * n;
  const out: string[] = [];

  while (out.length < length) {
    // Pull extra bytes to reduce looping from rejections.
    const buf = randomBytes(length * 2);
    for (let i = 0; i < buf.length && out.length < length; i++) {
      const b = buf[i];
      if (b < maxUnbiased) {
        out.push(PASSWORD_ALPHABET[b % n]);
      }
    }
  }

  return out.join('');
}
