import { describe, it, expect } from 'vitest';

// Simple utility functions for testing
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const hashPassword = async (password: string): Promise<string> => {
  // Mock password hashing
  return `hashed_${password}`;
};

describe('Simple Utility Functions', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('should handle different dates', () => {
      const date1 = new Date('2023-12-31T23:59:59Z');
      const date2 = new Date('2024-02-29T12:00:00Z');
      
      expect(formatDate(date1)).toBe('2023-12-31');
      expect(formatDate(date2)).toBe('2024-02-29');
    });
  });

  describe('generateId', () => {
    it('should generate a string ID', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBe(9);
    });

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });

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
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('hashPassword', () => {
    it('should hash password asynchronously', async () => {
      const password = 'testpassword';
      const hashed = await hashPassword(password);
      
      expect(hashed).toBe('hashed_testpassword');
      expect(hashed).not.toBe(password);
    });

    it('should hash different passwords differently', async () => {
      const password1 = 'password1';
      const password2 = 'password2';
      
      const hashed1 = await hashPassword(password1);
      const hashed2 = await hashPassword(password2);
      
      expect(hashed1).not.toBe(hashed2);
    });
  });
});
