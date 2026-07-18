import { describe, it, expect } from 'vitest';
import { formatDate } from '../formatDate';

describe('formatDate', () => {
  it('formats a date string in Turkish locale, not English month names', () => {
    // Turkish's own short form for Mayıs happens to read as "May" too, so
    // pick a month where the English and Turkish abbreviations differ.
    const result = formatDate('2026-12-17T00:00:00.000Z');
    expect(result).not.toMatch(/Dec\b/);
    expect(result).toContain('2026');
  });

  it('accepts a Date instance directly', () => {
    const result = formatDate(new Date('2026-01-15'));
    expect(result).toContain('2026');
  });

  it('returns an em dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('returns an em dash for an invalid date string', () => {
    expect(formatDate('not-a-real-date')).toBe('—');
  });
});
