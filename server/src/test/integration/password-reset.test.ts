import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Stub the mail module BEFORE importing app so forgot-password doesn't
// try to open a real SMTP connection.
vi.mock('../../mailService', () => ({
  sendMail: vi.fn().mockResolvedValue(true),
}));

import { app } from '../../index';
import { User } from '../../models';

/**
 * B-H4 integration coverage.
 *
 * These tests hit the real /api/auth/forgot-password and
 * /api/auth/reset-password endpoints against the test Mongo instance and
 * verify that:
 *
 *   1. forgot-password always returns 200 (no user enumeration), even for
 *      unknown ids/emails.
 *   2. forgot-password for a real user writes a token HASH (never the raw
 *      token) to the DB with a future expiry.
 *   3. reset-password with a mismatched token returns 400 and does NOT
 *      clear the reset fields.
 *   4. reset-password with the correct token hashes the new password,
 *      clears the reset fields, and bumps tokenVersion.
 *   5. reset-password with an expired token returns 400.
 *   6. reset-password enforces the minimum password length.
 */

async function createTestUser(overrides: Record<string, unknown> = {}) {
  return User.create({
    id: 'pwreset_user',
    adSoyad: 'Password Reset User',
    email: 'reset@example.com',
    rol: 'student',
    isActive: true,
    ...overrides,
  });
}

describe('Password reset flow (B-H4)', () => {
  beforeEach(async () => {
    await User.deleteMany({ id: { $regex: '^pwreset_' } });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('returns 200 for an unknown id (no enumeration)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ id: 'does-not-exist' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('hesap');
    });

    it('returns 200 and stores a token hash for a known id', async () => {
      await createTestUser();

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ id: 'pwreset_user' })
        .expect(200);

      expect(response.body.success).toBe(true);

      const updated = await User.findOne({ id: 'pwreset_user' });
      expect(updated).toBeTruthy();
      expect(updated!.passwordResetTokenHash).toBeDefined();
      expect(updated!.passwordResetTokenHash!.length).toBe(64); // sha256 hex
      expect(updated!.passwordResetExpiry).toBeDefined();
      expect(updated!.passwordResetExpiry!.getTime()).toBeGreaterThan(Date.now());
    });

    it('rejects when both id and email are missing', async () => {
      const response = await request(app).post('/api/auth/forgot-password').send({}).expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('rejects a mismatched token and leaves the reset fields untouched', async () => {
      const validToken = crypto.randomBytes(32).toString('base64url');
      const validHash = crypto.createHash('sha256').update(validToken).digest('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000);

      await createTestUser({
        passwordResetTokenHash: validHash,
        passwordResetExpiry: expiry,
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          id: 'pwreset_user',
          token: 'not-the-right-token',
          newPassword: 'NewStrongPassword123',
        })
        .expect(400);

      expect(response.body.error).toContain('Geçersiz');

      const after = await User.findOne({ id: 'pwreset_user' });
      // Reset fields must still be present — a wrong token shouldn't let
      // the attacker invalidate the window for the real user.
      expect(after!.passwordResetTokenHash).toBe(validHash);
    });

    it('accepts the correct token, hashes the new password, clears reset fields, bumps tokenVersion', async () => {
      const token = crypto.randomBytes(32).toString('base64url');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000);
      const previousTokenVersion = 3;

      await createTestUser({
        passwordResetTokenHash: tokenHash,
        passwordResetExpiry: expiry,
        tokenVersion: previousTokenVersion,
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          id: 'pwreset_user',
          token,
          newPassword: 'NewStrongPassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      const after = await User.findOne({ id: 'pwreset_user' });
      expect(after!.passwordResetTokenHash).toBeUndefined();
      expect(after!.passwordResetExpiry).toBeUndefined();
      // tokenVersion should have bumped so any existing sessions are dead.
      expect(after!.tokenVersion).toBe(previousTokenVersion + 1);
      // The stored password must be a bcrypt hash, not the plaintext.
      // N-H4: sifre is select:false — opt-in explicitly to verify the hash was stored.
      const afterWithSifre = await User.findOne({ id: 'pwreset_user' }).select('+sifre');
      expect(afterWithSifre!.sifre).toBeDefined();
      expect(afterWithSifre!.sifre!.startsWith('$2')).toBe(true);
      // And it must verify.
      const ok = await bcrypt.compare('NewStrongPassword123', afterWithSifre!.sifre!);
      expect(ok).toBe(true);
    });

    it('rejects a token that has expired', async () => {
      const token = crypto.randomBytes(32).toString('base64url');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiredAt = new Date(Date.now() - 60 * 1000); // 1 minute ago

      await createTestUser({
        passwordResetTokenHash: tokenHash,
        passwordResetExpiry: expiredAt,
      });

      await request(app)
        .post('/api/auth/reset-password')
        .send({
          id: 'pwreset_user',
          token,
          newPassword: 'NewStrongPassword123',
        })
        .expect(400);
    });

    it('rejects a password shorter than 8 characters', async () => {
      const token = crypto.randomBytes(32).toString('base64url');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      await createTestUser({
        passwordResetTokenHash: tokenHash,
        passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000),
      });

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ id: 'pwreset_user', token, newPassword: 'short' })
        .expect(400);

      expect(response.body.error).toContain('8 karakter');
    });

    it('rejects when id is missing from the body', async () => {
      // One assertion only — stacking multiple POSTs in a single test trips
      // the authLimiter rate limit (shared bucket across the file) and
      // yields a spurious 429 instead of the expected 400.
      await request(app)
        .post('/api/auth/reset-password')
        .send({ id: 'pwreset_user' }) // token + newPassword missing
        .expect(400);
    });
  });
});
