import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Simple CAPTCHA challenge system for after failed login attempts.
 *
 * This is a server-side math-based CAPTCHA that doesn't require external services.
 * For production, integrate with reCAPTCHA v3 or hCaptcha.
 *
 * Flow:
 * 1. After N failed login attempts (tracked per IP), require a CAPTCHA
 * 2. Server generates a math challenge and stores it with a token
 * 3. Client must solve and include captchaToken + captchaAnswer in login request
 * 4. Server validates before proceeding with login
 */

interface CaptchaChallenge {
  question: string;
  answer: number;
  createdAt: number;
  attempts: number;
}

// In-memory stores (use Redis in production)
const failedAttemptsByIP = new Map<string, { count: number; firstAt: number }>();
const captchaChallenges = new Map<string, CaptchaChallenge>();

const CAPTCHA_THRESHOLD = 3;         // Require CAPTCHA after 3 failed attempts
const FAILED_WINDOW_MS = 15 * 60 * 1000; // 15 minute window
const CAPTCHA_EXPIRY_MS = 5 * 60 * 1000; // CAPTCHA valid for 5 minutes
const MAX_CAPTCHA_ATTEMPTS = 5;

/**
 * Track a failed login attempt for an IP.
 */
export function trackFailedLogin(ip: string): void {
  const now = Date.now();
  const entry = failedAttemptsByIP.get(ip);

  if (entry && (now - entry.firstAt) < FAILED_WINDOW_MS) {
    entry.count++;
  } else {
    failedAttemptsByIP.set(ip, { count: 1, firstAt: now });
  }
}

/**
 * Reset failed login count for an IP (on successful login).
 */
export function resetFailedLogin(ip: string): void {
  failedAttemptsByIP.delete(ip);
  // Also cleanup any captcha challenges for this IP
  for (const [token, _challenge] of captchaChallenges.entries()) {
    if (token.startsWith(`captcha:${ip}:`)) {
      captchaChallenges.delete(token);
    }
  }
}

/**
 * Check if CAPTCHA is required for an IP.
 */
export function isCaptchaRequired(ip: string): boolean {
  const entry = failedAttemptsByIP.get(ip);
  if (!entry) return false;

  const now = Date.now();
  if (now - entry.firstAt > FAILED_WINDOW_MS) {
    failedAttemptsByIP.delete(ip);
    return false;
  }

  return entry.count >= CAPTCHA_THRESHOLD;
}

/**
 * Generate a new CAPTCHA challenge.
 */
export function generateCaptcha(ip: string): { token: string; question: string } {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const operators = ['+', '-', '*'] as const;
  const op = operators[Math.floor(Math.random() * operators.length)];

  let answer: number;
  let question: string;

  switch (op) {
    case '+':
      answer = a + b;
      question = `${a} + ${b} = ?`;
      break;
    case '-':
      answer = a - b;
      question = `${a} - ${b} = ?`;
      break;
    case '*':
      const smallA = Math.floor(Math.random() * 10) + 1;
      const smallB = Math.floor(Math.random() * 10) + 1;
      answer = smallA * smallB;
      question = `${smallA} x ${smallB} = ?`;
      break;
    default:
      answer = a + b;
      question = `${a} + ${b} = ?`;
  }

  const token = `captcha:${ip}:${Date.now()}:${Math.random().toString(36).substring(7)}`;

  captchaChallenges.set(token, {
    question,
    answer,
    createdAt: Date.now(),
    attempts: 0,
  });

  // Auto-cleanup after expiry
  setTimeout(() => {
    captchaChallenges.delete(token);
  }, CAPTCHA_EXPIRY_MS);

  return { token, question };
}

/**
 * Verify a CAPTCHA answer.
 */
export function verifyCaptcha(token: string, answer: number): { valid: boolean; error?: string } {
  const challenge = captchaChallenges.get(token);

  if (!challenge) {
    return { valid: false, error: 'CAPTCHA süresi dolmuş veya geçersiz. Lütfen yeni bir CAPTCHA alın.' };
  }

  // Check expiry
  if (Date.now() - challenge.createdAt > CAPTCHA_EXPIRY_MS) {
    captchaChallenges.delete(token);
    return { valid: false, error: 'CAPTCHA süresi doldu. Lütfen yeni bir CAPTCHA alın.' };
  }

  // Check max attempts
  challenge.attempts++;
  if (challenge.attempts > MAX_CAPTCHA_ATTEMPTS) {
    captchaChallenges.delete(token);
    return { valid: false, error: 'Çok fazla hatalı deneme. Lütfen yeni bir CAPTCHA alın.' };
  }

  if (challenge.answer !== answer) {
    return { valid: false, error: 'CAPTCHA yanıtı yanlış. Lütfen tekrar deneyin.' };
  }

  // Valid - consume the challenge
  captchaChallenges.delete(token);
  return { valid: true };
}

/**
 * Middleware to check and enforce CAPTCHA on login endpoint.
 */
export function captchaMiddleware(req: Request, res: Response, next: NextFunction): void {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';

  if (!isCaptchaRequired(clientIP)) {
    return next();
  }

  const { captchaToken, captchaAnswer } = req.body;

  // If no CAPTCHA provided, return a new challenge
  if (!captchaToken || captchaAnswer === undefined) {
    const challenge = generateCaptcha(clientIP);
    res.status(429).json({
      error: 'CAPTCHA gerekli',
      captchaRequired: true,
      captchaToken: challenge.token,
      captchaQuestion: challenge.question,
      message: 'Çok fazla başarısız giriş denemesi. Lütfen CAPTCHA\'yı çözün.',
    });
    return;
  }

  // Verify CAPTCHA
  const result = verifyCaptcha(captchaToken, parseInt(captchaAnswer, 10));
  if (!result.valid) {
    const challenge = generateCaptcha(clientIP);
    res.status(429).json({
      error: result.error,
      captchaRequired: true,
      captchaToken: challenge.token,
      captchaQuestion: challenge.question,
    });
    return;
  }

  // CAPTCHA valid, proceed to login
  next();
}

/**
 * Periodic cleanup of stale entries.
 */
setInterval(() => {
  const now = Date.now();

  for (const [ip, entry] of failedAttemptsByIP.entries()) {
    if (now - entry.firstAt > FAILED_WINDOW_MS) {
      failedAttemptsByIP.delete(ip);
    }
  }

  for (const [token, challenge] of captchaChallenges.entries()) {
    if (now - challenge.createdAt > CAPTCHA_EXPIRY_MS) {
      captchaChallenges.delete(token);
    }
  }
}, 60 * 1000); // Run every minute
