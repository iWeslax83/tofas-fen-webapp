import { describe, it, expect, beforeAll } from 'vitest';

// Set env vars before importing encryption module
process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';

import { encrypt, decrypt, isEncrypted, maskTckn, hashTckn } from '../../utils/encryption';

describe('Encryption Utility', () => {
  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt a TCKN correctly', () => {
      const tckn = '12345678901';
      const encrypted = encrypt(tckn);
      expect(encrypted).not.toBe(tckn);
      expect(encrypted).toContain(':');
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(tckn);
    });

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const tckn = '12345678901';
      const enc1 = encrypt(tckn);
      const enc2 = encrypt(tckn);
      expect(enc1).not.toBe(enc2);
      // Both should decrypt to same value
      expect(decrypt(enc1)).toBe(tckn);
      expect(decrypt(enc2)).toBe(tckn);
    });

    it('should return empty/falsy values as-is', () => {
      expect(encrypt('')).toBe('');
      expect(decrypt('')).toBe('');
    });

    it('should return non-encrypted strings as-is from decrypt', () => {
      expect(decrypt('12345678901')).toBe('12345678901');
      expect(decrypt('plaintext')).toBe('plaintext');
    });

    it('should handle special characters', () => {
      const special = 'Türkçe-Öğrenci_123';
      const encrypted = encrypt(special);
      expect(decrypt(encrypted)).toBe(special);
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted values', () => {
      const encrypted = encrypt('12345678901');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain TCKN', () => {
      expect(isEncrypted('12345678901')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });

    it('should return false for random strings', () => {
      expect(isEncrypted('hello world')).toBe(false);
      expect(isEncrypted('abc:def')).toBe(false); // only 2 parts
    });
  });

  describe('maskTckn', () => {
    it('should mask a plain TCKN correctly', () => {
      const masked = maskTckn('12345678901');
      expect(masked).toBe('123******01');
      expect(masked.length).toBe(11);
    });

    it('should mask an encrypted TCKN correctly', () => {
      const encrypted = encrypt('12345678901');
      const masked = maskTckn(encrypted);
      expect(masked).toBe('123******01');
    });

    it('should return empty string for empty input', () => {
      expect(maskTckn('')).toBe('');
    });

    it('should return *** for very short values', () => {
      expect(maskTckn('1234')).toBe('***');
    });
  });

  describe('hashTckn', () => {
    it('should produce deterministic hashes', () => {
      const hash1 = hashTckn('12345678901');
      const hash2 = hashTckn('12345678901');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different TCKNs', () => {
      const hash1 = hashTckn('12345678901');
      const hash2 = hashTckn('98765432109');
      expect(hash1).not.toBe(hash2);
    });

    it('should return hex string', () => {
      const hash = hashTckn('12345678901');
      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(hash.length).toBe(64); // SHA-256 = 64 hex chars
    });

    it('should return empty string for empty input', () => {
      expect(hashTckn('')).toBe('');
    });
  });
});
