import { describe, it, expect } from 'vitest';
import { generatePassword, PASSWORD_ALPHABET } from '../passwordGenerator';

describe('generatePassword', () => {
  it('returns an 8-character string by default', () => {
    const pw = generatePassword();
    expect(pw).toHaveLength(8);
  });

  it('only uses characters from the allowed alphabet', () => {
    const allowed = new Set(PASSWORD_ALPHABET);
    for (let i = 0; i < 1000; i++) {
      const pw = generatePassword();
      for (const ch of pw) {
        expect(allowed.has(ch)).toBe(true);
      }
    }
  });

  it('excludes confusable characters (0, O, o, 1, l, I)', () => {
    const confusable = ['0', 'O', 'o', '1', 'l', 'I'];
    for (const ch of confusable) {
      expect(PASSWORD_ALPHABET).not.toContain(ch);
    }
  });

  it('produces statistically distinct outputs', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10000; i++) {
      seen.add(generatePassword());
    }
    expect(seen.size).toBeGreaterThan(9990);
  });

  it('supports custom length', () => {
    expect(generatePassword(12)).toHaveLength(12);
    expect(generatePassword(4)).toHaveLength(4);
  });

  it('throws when length is non-positive', () => {
    expect(() => generatePassword(0)).toThrow();
    expect(() => generatePassword(-1)).toThrow();
  });
});
