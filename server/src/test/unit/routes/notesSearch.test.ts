import { describe, it, expect } from 'vitest';
import { safeSearchRegex } from '../../../utils/regex';

describe('Notes search input handling (N-H3)', () => {
  it('rejects > 100-char search', () => {
    expect(safeSearchRegex('a'.repeat(101))).toBeNull();
  });

  it('escapes regex metacharacters from caller input', () => {
    const re = safeSearchRegex('.*');
    expect(re).toBeInstanceOf(RegExp);
    // The literal string ".*" should match itself, not match arbitrary text.
    expect(re!.test('.*')).toBe(true);
    expect(re!.test('xyz')).toBe(false);
  });
});
