import { describe, it, expect } from 'vitest';
import { escapeRegex, safeSearchRegex } from '../../../utils/regex';

describe('escapeRegex', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegex('a.b*c+d?')).toBe('a\\.b\\*c\\+d\\?');
    expect(escapeRegex('(x)[y]{z}|w')).toBe('\\(x\\)\\[y\\]\\{z\\}\\|w');
    expect(escapeRegex('^start$')).toBe('\\^start\\$');
    expect(escapeRegex('back\\slash')).toBe('back\\\\slash');
  });

  it('passes plain text through unchanged', () => {
    expect(escapeRegex('hello world')).toBe('hello world');
    expect(escapeRegex('öğrenci')).toBe('öğrenci');
  });
});

describe('safeSearchRegex', () => {
  it('returns null for empty / whitespace input', () => {
    expect(safeSearchRegex('')).toBeNull();
    expect(safeSearchRegex('   ')).toBeNull();
  });

  it('returns null when input exceeds maxLength', () => {
    expect(safeSearchRegex('a'.repeat(101))).toBeNull();
    expect(safeSearchRegex('a'.repeat(50), { maxLength: 10 })).toBeNull();
  });

  it('returns a case-insensitive RegExp for valid input', () => {
    const re = safeSearchRegex('Ada');
    expect(re).toBeInstanceOf(RegExp);
    expect(re!.test('ada lovelace')).toBe(true);
    expect(re!.flags).toContain('i');
  });

  it('escapes metacharacters so search literal works', () => {
    const re = safeSearchRegex('user.id');
    expect(re).toBeInstanceOf(RegExp);
    expect(re!.test('user.id')).toBe(true);
    expect(re!.test('userXid')).toBe(false);
  });

  it('handles Turkish characters', () => {
    const re = safeSearchRegex('Öğrenci');
    expect(re!.test('öğrenci no 5')).toBe(true);
  });
});
