import { describe, it, expect } from 'vitest';
import {
  userProfileSchema,
  passwordChangeSchema,
  classChangeRequestSchema,
  roomChangeRequestSchema,
  validateForm
} from '../validation';

describe('Validation Schemas', () => {
  describe('userProfileSchema', () => {
    it('should validate valid user profile data', async () => {
      const validData = {
        adSoyad: 'Ahmet Yılmaz',
        email: 'ahmet@example.com',
        telefon: '+905551234567',
        adres: 'Bursa, Nilüfer',
        dogumTarihi: '1990-01-01',
        cinsiyet: 'erkek',
        meslek: 'Öğretmen',
        departman: 'Matematik'
      };

      const result = await userProfileSchema.validate(validData);
      expect(result).toEqual(validData);
    });

    it('should reject invalid email', async () => {
      const invalidData = {
        adSoyad: 'Ahmet Yılmaz',
        email: 'invalid-email'
      };

      await expect(userProfileSchema.validate(invalidData)).rejects.toThrow();
    });

    it('should reject short adSoyad', async () => {
      const invalidData = {
        adSoyad: 'A',
        email: 'ahmet@example.com'
      };

      await expect(userProfileSchema.validate(invalidData)).rejects.toThrow();
    });

    it('should reject invalid phone number', async () => {
      const invalidData = {
        adSoyad: 'Ahmet Yılmaz',
        email: 'ahmet@example.com',
        telefon: '123'
      };

      await expect(userProfileSchema.validate(invalidData)).rejects.toThrow();
    });
  });

  describe('passwordChangeSchema', () => {
    it('should validate valid password change data', async () => {
      const validData = {
        currentPassword: 'oldpass123',
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123'
      };

      const result = await passwordChangeSchema.validate(validData);
      expect(result).toEqual(validData);
    });

    it('should reject weak password', async () => {
      const invalidData = {
        currentPassword: 'oldpass123',
        newPassword: 'weak',
        confirmPassword: 'weak'
      };

      await expect(passwordChangeSchema.validate(invalidData)).rejects.toThrow();
    });

    it('should reject mismatched passwords', async () => {
      const invalidData = {
        currentPassword: 'oldpass123',
        newPassword: 'NewPass123',
        confirmPassword: 'DifferentPass123'
      };

      await expect(passwordChangeSchema.validate(invalidData)).rejects.toThrow();
    });
  });

  describe('classChangeRequestSchema', () => {
    it('should validate valid class change request', async () => {
      const validData = {
        sinif: '11',
        sube: 'A',
        reason: 'Bu sınıfta daha iyi performans gösterebileceğimi düşünüyorum.'
      };

      const result = await classChangeRequestSchema.validate(validData);
      expect(result).toEqual(validData);
    });

    it('should reject invalid class format', async () => {
      const invalidData = {
        sinif: '11A',
        sube: 'A',
        reason: 'Valid reason'
      };

      await expect(classChangeRequestSchema.validate(invalidData)).rejects.toThrow();
    });

    it('should reject short reason', async () => {
      const invalidData = {
        sinif: '11',
        sube: 'A',
        reason: 'Short'
      };

      await expect(classChangeRequestSchema.validate(invalidData)).rejects.toThrow();
    });
  });

  describe('roomChangeRequestSchema', () => {
    it('should validate valid room change request', async () => {
      const validData = {
        oda: '101',
        reason: 'Mevcut odada gürültü problemi yaşıyorum ve daha sakin bir ortam istiyorum.'
      };

      const result = await roomChangeRequestSchema.validate(validData);
      expect(result).toEqual(validData);
    });

    it('should reject invalid room format', async () => {
      const invalidData = {
        oda: 'A101',
        reason: 'Valid reason'
      };

      await expect(roomChangeRequestSchema.validate(invalidData)).rejects.toThrow();
    });
  });
});

describe('validateForm', () => {
  it('should return valid result for valid data', async () => {
    const validData = {
      adSoyad: 'Ahmet Yılmaz',
      email: 'ahmet@example.com'
    };

    const result = await validateForm(userProfileSchema, validData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return invalid result with errors for invalid data', async () => {
    const invalidData = {
      adSoyad: 'A',
      email: 'invalid-email'
    };

    const result = await validateForm(userProfileSchema, invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveProperty('adSoyad');
    expect(result.errors).toHaveProperty('email');
  });
});
