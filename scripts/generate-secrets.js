#!/usr/bin/env node

/**
 * Generate secure secrets for production deployment
 * Usage: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

console.log('🔐 Generating Production Secrets\n');
console.log('=' .repeat(60));

// Generate JWT_SECRET (minimum 32 characters)
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('\n✅ JWT_SECRET:');
console.log(jwtSecret);

// Generate JWT_REFRESH_SECRET (minimum 32 characters)
const jwtRefreshSecret = crypto.randomBytes(32).toString('hex');
console.log('\n✅ JWT_REFRESH_SECRET:');
console.log(jwtRefreshSecret);

// Generate SESSION_SECRET
const sessionSecret = crypto.randomBytes(32).toString('hex');
console.log('\n✅ SESSION_SECRET:');
console.log(sessionSecret);

// Generate MongoDB password (base64 encoded, 24 bytes = 32 chars)
const mongoPassword = crypto.randomBytes(24).toString('base64');
console.log('\n✅ MONGO_PASSWORD:');
console.log(mongoPassword);

// Generate Redis password (optional)
const redisPassword = crypto.randomBytes(16).toString('hex');
console.log('\n✅ REDIS_PASSWORD (optional):');
console.log(redisPassword);

console.log('\n' + '='.repeat(60));
console.log('\n📝 Copy these values to your production .env files');
console.log('⚠️  Keep these secrets secure and never commit them to Git!');
console.log('\n💡 Tip: Use a password manager to store these secrets securely.\n');
