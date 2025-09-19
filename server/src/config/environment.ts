import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment validation
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'MONGODB_URI',
  'NODE_ENV'
];

const optionalEnvVars = [
  'PORT',
  'CORS_ORIGIN',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'AUTH_RATE_LIMIT_WINDOW_MS',
  'AUTH_RATE_LIMIT_MAX',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'REDIS_URL',
  'FRONTEND_URL',
  'BACKEND_URL',
  'BCRYPT_ROUNDS',
  'SESSION_SECRET',
  'SENTRY_DSN',
  'LOG_LEVEL',
  'MAX_FILE_SIZE',
  'UPLOAD_PATH',
  'HEALTH_CHECK_TIMEOUT'
];

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
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,video/mp4,video/mov',
  
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
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
};

// Export environment info
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';
