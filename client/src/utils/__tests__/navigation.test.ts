import { describe, it, expect } from 'vitest';
import { getUserRolePath } from '../navigation';

describe('getUserRolePath', () => {
  it('maps each canonical role to its dashboard path', () => {
    expect(getUserRolePath('admin')).toBe('/admin');
    expect(getUserRolePath('teacher')).toBe('/teacher');
    expect(getUserRolePath('parent')).toBe('/parent');
    expect(getUserRolePath('student')).toBe('/student');
  });

  it('falls back to /login for unknown roles', () => {
    expect(getUserRolePath('hizmetli')).toBe('/login');
    expect(getUserRolePath('ziyaretci')).toBe('/login');
    expect(getUserRolePath('Admin')).toBe('/login'); // case-sensitive
    expect(getUserRolePath('')).toBe('/login');
    expect(getUserRolePath('something-else')).toBe('/login');
  });

  it('falls back to /login when given a non-string-ish value', () => {
    // @ts-expect-error — coverage of runtime fallback for null input
    expect(getUserRolePath(null)).toBe('/login');
    // @ts-expect-error — coverage of runtime fallback for undefined input
    expect(getUserRolePath(undefined)).toBe('/login');
  });
});
