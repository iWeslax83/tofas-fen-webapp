import crypto from 'crypto';
import logger from './logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

let warnedAboutJwtFallback = false;

/**
 * Get or generate the encryption key from environment.
 * Production REQUIRES a dedicated ENCRYPTION_KEY (hex-encoded 32 bytes).
 * Non-production environments may fall back to deriving from JWT_SECRET to
 * ease local development, but this is never allowed in production because a
 * JWT_SECRET leak would otherwise compromise every encrypted TCKN at rest.
 */
function getEncryptionKey(): Buffer {
  if (process.env.ENCRYPTION_KEY) {
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    return key;
  }

  // Fail-closed in production: never derive from JWT_SECRET.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ENCRYPTION_KEY is required in production. Generate one with: ' +
        'node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"',
    );
  }

  // Derive from JWT_SECRET as a dev-only fallback
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_KEY or JWT_SECRET required for encryption');
  }

  if (!warnedAboutJwtFallback) {
    warnedAboutJwtFallback = true;
    logger.warn(
      'ENCRYPTION_KEY not set; deriving from JWT_SECRET (dev-only). ' +
        'This MUST NOT be used in production.',
    );
  }

  return crypto.pbkdf2Sync(secret, 'tofas-fen-tckn-salt', 100000, 32, 'sha256');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns: iv:authTag:ciphertext (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    logger.error('Encryption failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt an encrypted string (iv:authTag:ciphertext format).
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return encryptedData;

  // If it doesn't look encrypted (no colons), return as-is (legacy unencrypted data)
  if (!encryptedData.includes(':')) {
    return encryptedData;
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    return encryptedData; // Not encrypted data (legacy plain value)
  }

  // Beyond this point the data LOOKS encrypted (iv:authTag:ciphertext). If we
  // cannot decrypt it, we MUST NOT return the raw ciphertext - downstream code
  // would treat it as plaintext and leak an opaque-but-stable ID into UIs,
  // exports, and audit logs. Fail closed instead.
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption failed (fail-closed)', {
      error: error instanceof Error ? error.message : String(error),
      // Never log the ciphertext itself
    });
    return '';
  }
}

/**
 * Check if a value is already encrypted (iv:authTag:ciphertext format).
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  // Check if all parts are valid hex
  return parts.every((p) => /^[0-9a-f]+$/i.test(p));
}

/**
 * Mask a TCKN for display: show first 3 and last 2 digits.
 * Example: 12345678901 -> 123*****01
 */
export function maskTckn(tckn: string): string {
  if (!tckn) return '';
  // Decrypt if encrypted
  const plain = decrypt(tckn);
  if (plain.length < 5) return '***';
  return plain.substring(0, 3) + '*'.repeat(plain.length - 5) + plain.substring(plain.length - 2);
}

/**
 * Hash a TCKN for lookup purposes (deterministic, one-way).
 * Used for searching encrypted TCKN fields.
 */
export function hashTckn(tckn: string): string {
  if (!tckn) return '';
  return crypto.createHmac('sha256', getEncryptionKey()).update(tckn).digest('hex');
}
