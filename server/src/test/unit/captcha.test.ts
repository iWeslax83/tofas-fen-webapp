import { describe, it, expect, beforeEach } from 'vitest';
import {
  trackFailedLogin,
  resetFailedLogin,
  isCaptchaRequired,
  generateCaptcha,
  verifyCaptcha,
} from '../../middleware/captcha';

describe('CAPTCHA System', () => {
  const testIP = '192.168.1.100';

  beforeEach(() => {
    // Reset state between tests
    resetFailedLogin(testIP);
    resetFailedLogin('10.0.0.1');
  });

  describe('trackFailedLogin / isCaptchaRequired', () => {
    it('should not require CAPTCHA initially', () => {
      expect(isCaptchaRequired(testIP)).toBe(false);
    });

    it('should not require CAPTCHA after 1-2 failures', () => {
      trackFailedLogin(testIP);
      expect(isCaptchaRequired(testIP)).toBe(false);
      trackFailedLogin(testIP);
      expect(isCaptchaRequired(testIP)).toBe(false);
    });

    it('should require CAPTCHA after 3 failures (threshold)', () => {
      trackFailedLogin(testIP);
      trackFailedLogin(testIP);
      trackFailedLogin(testIP);
      expect(isCaptchaRequired(testIP)).toBe(true);
    });

    it('should track different IPs independently', () => {
      trackFailedLogin(testIP);
      trackFailedLogin(testIP);
      trackFailedLogin(testIP);
      expect(isCaptchaRequired(testIP)).toBe(true);
      expect(isCaptchaRequired('10.0.0.1')).toBe(false);
    });
  });

  describe('resetFailedLogin', () => {
    it('should reset the CAPTCHA requirement', () => {
      trackFailedLogin(testIP);
      trackFailedLogin(testIP);
      trackFailedLogin(testIP);
      expect(isCaptchaRequired(testIP)).toBe(true);

      resetFailedLogin(testIP);
      expect(isCaptchaRequired(testIP)).toBe(false);
    });
  });

  describe('generateCaptcha', () => {
    it('should return a token and a question', () => {
      const captcha = generateCaptcha(testIP);
      expect(captcha.token).toBeTruthy();
      expect(captcha.question).toBeTruthy();
      expect(captcha.token).toContain('captcha:');
      expect(captcha.question).toContain('= ?');
    });

    it('should generate unique tokens', () => {
      const c1 = generateCaptcha(testIP);
      const c2 = generateCaptcha(testIP);
      expect(c1.token).not.toBe(c2.token);
    });
  });

  describe('verifyCaptcha', () => {
    it('should accept correct answer', () => {
      // We need to figure out the answer from the question
      // Generate a captcha and parse the question
      const captcha = generateCaptcha(testIP);
      const answer = solveCaptcha(captcha.question);
      const result = verifyCaptcha(captcha.token, answer);
      expect(result.valid).toBe(true);
    });

    it('should reject wrong answer', () => {
      const captcha = generateCaptcha(testIP);
      const answer = solveCaptcha(captcha.question);
      const result = verifyCaptcha(captcha.token, answer + 999);
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should reject invalid token', () => {
      const result = verifyCaptcha('nonexistent-token', 42);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('geçersiz');
    });

    it('should consume token after successful verification', () => {
      const captcha = generateCaptcha(testIP);
      const answer = solveCaptcha(captcha.question);

      const result1 = verifyCaptcha(captcha.token, answer);
      expect(result1.valid).toBe(true);

      // Second attempt with same token should fail
      const result2 = verifyCaptcha(captcha.token, answer);
      expect(result2.valid).toBe(false);
    });

    it('should reject after too many wrong attempts', () => {
      const captcha = generateCaptcha(testIP);

      // Make 6 wrong attempts (max is 5)
      for (let i = 0; i < 6; i++) {
        verifyCaptcha(captcha.token, -99999);
      }

      // Now even correct answer should fail (token consumed)
      const answer = solveCaptcha(captcha.question);
      const result = verifyCaptcha(captcha.token, answer);
      expect(result.valid).toBe(false);
    });
  });
});

/**
 * Helper to solve the math CAPTCHA from its question string.
 */
function solveCaptcha(question: string): number {
  // Format: "X + Y = ?", "X - Y = ?", "X x Y = ?"
  const match = question.match(/^(\d+)\s*([+\-x])\s*(\d+)\s*=\s*\?$/);
  if (!match) throw new Error(`Cannot parse captcha question: ${question}`);

  const a = parseInt(match[1], 10);
  const op = match[2];
  const b = parseInt(match[3], 10);

  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case 'x': return a * b;
    default: throw new Error(`Unknown operator: ${op}`);
  }
}
