import logger from './logger';

export enum SecurityEvent {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
  TWO_FACTOR_SUCCESS = 'TWO_FACTOR_SUCCESS',
  TWO_FACTOR_FAILED = 'TWO_FACTOR_FAILED',
  TWO_FACTOR_CODE_SENT = 'TWO_FACTOR_CODE_SENT',
  TWO_FACTOR_CODE_RESENT = 'TWO_FACTOR_CODE_RESENT',
  TRUSTED_DEVICE_ADDED = 'TRUSTED_DEVICE_ADDED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  TCKN_MIGRATED = 'TCKN_MIGRATED',
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
  TOKEN_REUSE_DETECTED = 'TOKEN_REUSE_DETECTED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  ROLE_CHANGED = 'ROLE_CHANGED',
}

interface SecurityLogEntry {
  event: SecurityEvent;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

export function logSecurityEvent(entry: SecurityLogEntry) {
  logger.warn({
    type: 'security',
    event: entry.event,
    userId: entry.userId,
    ip: entry.ip,
    userAgent: entry.userAgent,
    details: entry.details,
    timestamp: new Date().toISOString(),
  });
}
