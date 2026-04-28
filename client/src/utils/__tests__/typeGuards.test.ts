import { describe, it, expect } from 'vitest';
import {
  isUserRole,
  isApiResponse,
  isPaginatedResponse,
  isString,
  isNumber,
  isBoolean,
  isDate,
  isFunction,
  isObject,
  isArray,
  isNull,
  isUndefined,
  isNullOrUndefined,
  isValidEmail,
  isValidPassword,
  isValidPhoneNumber,
  hasProperty,
  hasProperties,
} from '../typeGuards';

describe('isUserRole', () => {
  it('accepts the canonical 5 roles', () => {
    ['student', 'teacher', 'parent', 'admin', 'ziyaretci'].forEach((r) => {
      expect(isUserRole(r)).toBe(true);
    });
  });

  it('rejects unknown roles, non-strings, and casing variants', () => {
    expect(isUserRole('Admin')).toBe(false);
    expect(isUserRole('hizmetli')).toBe(false);
    expect(isUserRole(42)).toBe(false);
    expect(isUserRole(undefined)).toBe(false);
  });
});

describe('isApiResponse', () => {
  it('accepts shapes with success: boolean + statusCode: number', () => {
    expect(isApiResponse({ success: true, statusCode: 200 })).toBe(true);
    expect(isApiResponse({ success: false, statusCode: 500, message: 'err' })).toBe(true);
  });

  it('rejects null, primitives, or wrong-typed fields', () => {
    expect(isApiResponse(null)).toBe(false);
    expect(isApiResponse('not an object')).toBe(false);
    expect(isApiResponse({ success: 'yes', statusCode: 200 })).toBe(false);
    expect(isApiResponse({ success: true, statusCode: '200' })).toBe(false);
    expect(isApiResponse({})).toBe(false);
  });
});

describe('isPaginatedResponse', () => {
  it('accepts ApiResponse + a properly-shaped pagination block', () => {
    const r = {
      success: true,
      statusCode: 200,
      pagination: { page: 1, limit: 20, total: 100, totalPages: 5 },
    };
    expect(isPaginatedResponse(r)).toBe(true);
  });

  it('rejects when pagination is missing or malformed', () => {
    expect(isPaginatedResponse({ success: true, statusCode: 200 })).toBe(false);
    expect(
      isPaginatedResponse({
        success: true,
        statusCode: 200,
        pagination: { page: 1 }, // missing fields
      }),
    ).toBe(false);
  });
});

describe('primitive guards', () => {
  it('isString', () => {
    expect(isString('a')).toBe(true);
    expect(isString('')).toBe(true);
    expect(isString(1)).toBe(false);
    expect(isString(null)).toBe(false);
  });

  it('isNumber rejects NaN', () => {
    expect(isNumber(0)).toBe(true);
    expect(isNumber(-1.5)).toBe(true);
    expect(isNumber(Number.NaN)).toBe(false);
    expect(isNumber('1')).toBe(false);
  });

  it('isBoolean', () => {
    expect(isBoolean(true)).toBe(true);
    expect(isBoolean(false)).toBe(true);
    expect(isBoolean(0)).toBe(false);
    expect(isBoolean('false')).toBe(false);
  });

  it('isDate', () => {
    expect(isDate(new Date())).toBe(true);
    expect(isDate('2024-01-01')).toBe(false);
    expect(isDate(0)).toBe(false);
  });

  it('isFunction', () => {
    expect(isFunction(() => 1)).toBe(true);
    expect(isFunction(function () {})).toBe(true);
    expect(isFunction({})).toBe(false);
  });

  it('isObject — true plain object only (rejects arrays + null)', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ a: 1 })).toBe(true);
    expect(isObject([])).toBe(false);
    expect(isObject(null)).toBe(false);
  });

  it('isArray', () => {
    expect(isArray([])).toBe(true);
    expect(isArray([1, 2])).toBe(true);
    expect(isArray({})).toBe(false);
    expect(isArray('a')).toBe(false);
  });

  it('isNull / isUndefined / isNullOrUndefined', () => {
    expect(isNull(null)).toBe(true);
    expect(isNull(undefined)).toBe(false);
    expect(isUndefined(undefined)).toBe(true);
    expect(isUndefined(null)).toBe(false);
    expect(isNullOrUndefined(null)).toBe(true);
    expect(isNullOrUndefined(undefined)).toBe(true);
    expect(isNullOrUndefined(0)).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('accepts simple addresses', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
    expect(isValidEmail('user.name+tag@example.co')).toBe(true);
  });

  it('rejects strings without @ or domain', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nope.com')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('requires at least 8 characters', () => {
    expect(isValidPassword('1234567')).toBe(false);
    expect(isValidPassword('12345678')).toBe(true);
  });
});

describe('isValidPhoneNumber', () => {
  it('accepts a leading + and digits, ignoring whitespace', () => {
    expect(isValidPhoneNumber('+90 555 123 4567')).toBe(true);
    expect(isValidPhoneNumber('5551234567')).toBe(true);
  });

  it('rejects strings starting with 0 or with non-digit chars', () => {
    expect(isValidPhoneNumber('0 555 123')).toBe(false);
    expect(isValidPhoneNumber('+90-abc-1234')).toBe(false);
  });
});

describe('hasProperty / hasProperties', () => {
  it('hasProperty returns true only when the key exists on the object', () => {
    const o = { a: 1, b: undefined } as const;
    expect(hasProperty(o, 'a')).toBe(true);
    expect(hasProperty(o, 'b')).toBe(true); // present even if undefined
    // @ts-expect-error — checking runtime behaviour for missing key
    expect(hasProperty(o, 'c')).toBe(false);
  });

  it('hasProperties is the AND of every key', () => {
    const o = { a: 1, b: 2, c: 3 } as const;
    expect(hasProperties(o, ['a', 'b'])).toBe(true);
    // @ts-expect-error — checking runtime behaviour for missing key
    expect(hasProperties(o, ['a', 'd'])).toBe(false);
  });
});
