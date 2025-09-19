import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, validatePhone, validateSchoolId, validateRequired } from '../../utils/validation';

describe('validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('test.example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('Password123!')).toBe(true);
      expect(validatePassword('MyStr0ng#Pass')).toBe(true);
      expect(validatePassword('Test123$')).toBe(true);
      expect(validatePassword('Strong1@')).toBe(true);
      expect(validatePassword('Abc123!@')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('password')).toBe(false); // No uppercase, number, special char
      expect(validatePassword('PASSWORD')).toBe(false); // No lowercase, number, special char
      expect(validatePassword('Password')).toBe(false); // No number, special char
      expect(validatePassword('Password123')).toBe(false); // No special char
      expect(validatePassword('Pass1!')).toBe(false); // Too short
      expect(validatePassword('')).toBe(false); // Empty
    });
  });

  describe('validatePhone', () => {
    it('should validate Turkish phone numbers', () => {
      expect(validatePhone('+905551234567')).toBe(true);
      expect(validatePhone('05551234567')).toBe(true);
      expect(validatePhone('5551234567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123456789')).toBe(false); // Too short
      expect(validatePhone('+90555123456789')).toBe(false); // Too long
      expect(validatePhone('+90555123456a')).toBe(false); // Contains letter
      expect(validatePhone('+90555123456')).toBe(false); // Wrong format
      expect(validatePhone('')).toBe(false); // Empty
    });
  });

  describe('validateSchoolId', () => {
    it('should validate correct school IDs', () => {
      expect(validateSchoolId('123456')).toBe(true); // 6 digits
      expect(validateSchoolId('ABC123')).toBe(true); // 6 alphanumeric
      expect(validateSchoolId('12345678')).toBe(true); // 8 digits
      expect(validateSchoolId('ABCD1234')).toBe(true); // 8 alphanumeric
    });

    it('should reject invalid school IDs', () => {
      expect(validateSchoolId('12345')).toBe(false); // Too short (5 chars)
      expect(validateSchoolId('123456789')).toBe(false); // Too long (9 chars)
      expect(validateSchoolId('12345!')).toBe(false); // Contains special char
      expect(validateSchoolId('')).toBe(false); // Empty
    });
  });

  describe('validateRequired', () => {
    it('should validate non-empty values', () => {
      expect(validateRequired('test')).toBe(true);
      expect(validateRequired('123')).toBe(true);
      expect(validateRequired('0')).toBe(true);
      expect(validateRequired('false')).toBe(true);
    });

    it('should reject empty values', () => {
      expect(validateRequired('')).toBe(false);
      expect(validateRequired('   ')).toBe(false);
      expect(validateRequired(null)).toBe(false);
      expect(validateRequired(undefined)).toBe(false);
    });
  });
});
