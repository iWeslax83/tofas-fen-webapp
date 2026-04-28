import { describe, it, expect } from 'vitest';
import { cn } from '../cn';

describe('cn helper', () => {
  it('joins string class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values (false, undefined, null, "")', () => {
    const skip = false as const;
    expect(cn('a', skip, undefined, null, '', 'b')).toBe('a b');
  });

  it('flattens nested arrays', () => {
    expect(cn(['a', ['b', 'c']])).toBe('a b c');
  });

  it('honours object syntax (only truthy keys included)', () => {
    expect(cn({ a: true, b: false, c: 1 })).toBe('a c');
  });

  it('returns an empty string for empty input', () => {
    expect(cn()).toBe('');
    expect(cn(undefined)).toBe('');
  });

  it('merges conflicting tailwind utilities — last wins', () => {
    // tailwind-merge collapses competing color utilities
    expect(cn('text-sm text-base')).toBe('text-base');
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('preserves non-conflicting tailwind utilities', () => {
    expect(cn('flex', 'items-center', 'gap-2')).toBe('flex items-center gap-2');
  });

  it('lets a later override beat an earlier base class', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('keeps custom class tokens through the merge', () => {
    const result = cn('flex', 'custom-token', 'p-2');
    expect(result).toContain('flex');
    expect(result).toContain('custom-token');
    expect(result).toContain('p-2');
  });
});
