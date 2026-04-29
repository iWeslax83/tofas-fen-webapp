import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateSchoolId,
  validateRequired,
} from '../validation';

describe('validateEmail', () => {
  it('accepts simple addresses', () => {
    expect(validateEmail('a@b.com')).toBe(true);
    expect(validateEmail('user.name+tag@sub.example.co')).toBe(true);
  });

  it('rejects malformed input', () => {
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
    expect(validateEmail('@nope.com')).toBe(false);
    expect(validateEmail('a b@c.com')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts a password with all required classes (lower, upper, digit, special, ≥8)', () => {
    expect(validatePassword('Aa1!aaaa')).toBe(true);
    expect(validatePassword('Tofa$2026')).toBe(true);
  });

  it('rejects strings under 8 characters', () => {
    expect(validatePassword('Aa1!aaa')).toBe(false);
  });

  it('rejects strings missing the lowercase class', () => {
    expect(validatePassword('AA1!AAAA')).toBe(false);
  });

  it('rejects strings missing the uppercase class', () => {
    expect(validatePassword('aa1!aaaa')).toBe(false);
  });

  it('rejects strings missing a digit', () => {
    expect(validatePassword('Aa!aaaaa')).toBe(false);
  });

  it('rejects strings missing a special char', () => {
    expect(validatePassword('Aa1aaaaa')).toBe(false);
  });
});

describe('validatePhone', () => {
  it('accepts +90-prefixed 10-digit numbers', () => {
    expect(validatePhone('+905551234567')).toBe(true);
  });

  it('accepts 0-prefixed 10-digit numbers', () => {
    expect(validatePhone('05551234567')).toBe(true);
  });

  it('accepts the bare 10-digit form', () => {
    expect(validatePhone('5551234567')).toBe(true);
  });

  it('rejects too-short / too-long / non-digit', () => {
    expect(validatePhone('555123456')).toBe(false);
    expect(validatePhone('555123456789')).toBe(false);
    expect(validatePhone('+90abcdef1234')).toBe(false);
    expect(validatePhone('')).toBe(false);
  });
});

describe('validateSchoolId', () => {
  it('accepts 6–8 alphanumeric characters', () => {
    expect(validateSchoolId('AB1234')).toBe(true);
    expect(validateSchoolId('20240001')).toBe(true);
    expect(validateSchoolId('abc123')).toBe(true);
  });

  it('rejects strings outside the 6–8 range', () => {
    expect(validateSchoolId('AB123')).toBe(false);
    expect(validateSchoolId('AB12345678')).toBe(false);
    expect(validateSchoolId('')).toBe(false);
  });

  it('rejects strings with non-alphanumeric chars', () => {
    expect(validateSchoolId('AB-1234')).toBe(false);
    expect(validateSchoolId('AB 1234')).toBe(false);
  });
});

describe('validateRequired', () => {
  it('treats null and undefined as missing', () => {
    expect(validateRequired(null)).toBe(false);
    expect(validateRequired(undefined)).toBe(false);
  });

  it('treats empty / whitespace-only strings as missing', () => {
    expect(validateRequired('')).toBe(false);
    expect(validateRequired('   ')).toBe(false);
    expect(validateRequired('\t\n')).toBe(false);
  });

  it('accepts non-empty strings', () => {
    expect(validateRequired('hello')).toBe(true);
    expect(validateRequired(' a ')).toBe(true);
  });

  it('accepts non-string values that are present', () => {
    expect(validateRequired(0)).toBe(true);
    expect(validateRequired(false)).toBe(true);
    expect(validateRequired([])).toBe(true);
    expect(validateRequired({})).toBe(true);
  });
});
