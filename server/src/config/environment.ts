import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment validation
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI', 'NODE_ENV'];

// Optional environment variables are used for validation but not stored in a variable
// This prevents the "declared but never used" error

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Validate JWT secrets length
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
  throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
}

// Environment configuration
export const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),

  // Database
  MONGODB_URI: process.env.MONGODB_URI!,
  MONGODB_AUTH_SOURCE: process.env.MONGODB_AUTH_SOURCE || 'admin',
  MONGODB_REPLICA_SET: process.env.MONGODB_REPLICA_SET || '',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500', 10),
  AUTH_RATE_LIMIT_WINDOW_MS: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '300000', 10), // 5 minutes
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10),
  UPLOAD_RATE_LIMIT_WINDOW_MS: parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || '3600000', 10), // 1 hour
  UPLOAD_RATE_LIMIT_MAX: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX || '10', 10),

  // Email
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@tofas-fen.com',

  // Alert emails
  ALERT_EMAIL_ENABLED: process.env.ALERT_EMAIL_ENABLED === 'true',
  ALERT_EMAIL_TO: process.env.ALERT_EMAIL_TO || '',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

  // URLs
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',

  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  SESSION_SECRET: process.env.SESSION_SECRET || process.env.JWT_SECRET!,

  // Monitoring
  SENTRY_DSN: process.env.SENTRY_DSN || '',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // File Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  ALLOWED_FILE_TYPES:
    process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,video/mp4,video/mov',

  // Health Check
  HEALTH_CHECK_TIMEOUT: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),

  // MEB E-okul (if needed)
  MEB_EOKUL_BASE_URL: process.env.MEB_EOKUL_BASE_URL || 'https://eokul.meb.gov.tr',
  MEB_EOKUL_API_KEY: process.env.MEB_EOKUL_API_KEY || '',
  MEB_EOKUL_USERNAME: process.env.MEB_EOKUL_USERNAME || '',
  MEB_EOKUL_PASSWORD: process.env.MEB_EOKUL_PASSWORD || '',
};

// Validate configuration
export const validateConfig = () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate port
  if (config.PORT < 1 || config.PORT > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  // Validate rate limits
  if (config.RATE_LIMIT_MAX_REQUESTS < 1) {
    errors.push('RATE_LIMIT_MAX_REQUESTS must be at least 1');
  }

  if (config.AUTH_RATE_LIMIT_MAX < 1) {
    errors.push('AUTH_RATE_LIMIT_MAX must be at least 1');
  }

  // Validate bcrypt rounds
  if (config.BCRYPT_ROUNDS < 10 || config.BCRYPT_ROUNDS > 15) {
    errors.push('BCRYPT_ROUNDS must be between 10 and 15');
  }

  // Validate file size
  if (config.MAX_FILE_SIZE < 1024) {
    errors.push('MAX_FILE_SIZE must be at least 1KB');
  }

  // ===== Production-specific security validations =====
  if (config.NODE_ENV === 'production') {
    // Redis must have authentication in production
    if (!config.REDIS_PASSWORD && !process.env.REDIS_URL?.includes('@')) {
      warnings.push(
        'PRODUCTION WARNING: Redis has no password configured (REDIS_PASSWORD). This is a security risk.',
      );
    }

    // Redis should use TLS in production
    if (process.env.REDIS_TLS !== 'true' && !process.env.REDIS_URL?.startsWith('rediss://')) {
      warnings.push(
        'PRODUCTION WARNING: Redis TLS is not enabled (REDIS_TLS=true). Data in transit is unencrypted.',
      );
    }

    // MongoDB should use authentication
    if (
      config.MONGODB_URI &&
      !config.MONGODB_URI.includes('@') &&
      !config.MONGODB_URI.includes('authSource')
    ) {
      warnings.push(
        'PRODUCTION WARNING: MongoDB URI does not appear to include authentication credentials.',
      );
    }

    // MongoDB should use TLS
    if (
      config.MONGODB_URI &&
      !config.MONGODB_URI.includes('tls=true') &&
      !config.MONGODB_URI.includes('ssl=true')
    ) {
      warnings.push('PRODUCTION WARNING: MongoDB connection does not use TLS/SSL.');
    }

    // MongoDB should not bind to 0.0.0.0 / public
    if (
      config.MONGODB_URI &&
      (config.MONGODB_URI.includes('0.0.0.0') || config.MONGODB_URI.includes('*'))
    ) {
      errors.push(
        'PRODUCTION ERROR: MongoDB is bound to 0.0.0.0 (publicly accessible). Use localhost or VPC address.',
      );
    }

    // CORS must be restricted
    if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN.includes('localhost')) {
      warnings.push(
        'PRODUCTION WARNING: CORS_ORIGIN includes localhost. Set to production domain only.',
      );
    }

    // Encryption key should be set
    if (!process.env.ENCRYPTION_KEY) {
      warnings.push(
        'PRODUCTION WARNING: ENCRYPTION_KEY not set. TCKN encryption will derive key from JWT_SECRET. Set a dedicated 64-char hex key for better security.',
      );
    }

    // Monitoring API key should be set
    if (!process.env.MONITORING_API_KEY) {
      warnings.push(
        'PRODUCTION WARNING: MONITORING_API_KEY not set. Monitoring endpoints are unprotected.',
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  // Log warnings but don't fail startup
  if (warnings.length > 0) {
    // Use console.warn since logger might not be initialized yet
    for (const warning of warnings) {
      console.warn(`[CONFIG] ${warning}`);
    }
  }
};

// Export environment info
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';
