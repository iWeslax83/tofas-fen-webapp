import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Web Application Firewall (WAF) middleware.
 * Uses Redis for shared state in multi-instance deployments,
 * falls back to in-memory for development.
 */

// In-memory fallback stores
const memoryBlockedIPs = new Set<string>();
const memorySuspiciousIPCounts = new Map<string, { count: number; firstSeen: number }>();

const SUSPICIOUS_THRESHOLD = 50; // requests with suspicious patterns
const SUSPICIOUS_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Redis client reference (set via initWafRedis)
let redisClient: any = null;

/**
 * Initialize WAF with Redis for distributed IP blocking.
 * Call this after Redis is connected.
 */
export function initWafRedis(redis: any): void {
  redisClient = redis;
  logger.info('WAF: Redis initialized for distributed IP tracking');
}

// Suspicious patterns in request paths and query strings
const SUSPICIOUS_PATTERNS = [
  /\.\.\//, // Directory traversal
  /<script/i, // XSS attempt
  /union\s+select/i, // SQL injection
  /\bexec\b.*\(/i, // Command injection
  /\bdrop\b.*\btable\b/i, // SQL drop table
  /\b(cmd|powershell|bash)\b/i, // Shell injection
  /\/etc\/passwd/i, // Path traversal
  /\/proc\/self/i, // Linux proc traversal
  /\beval\s*\(/i, // Code injection
  /\$\{.*\}/, // Template injection
  /\bphpinfo\b/i, // PHP probing
  /\.env\b/, // Env file probing
  /wp-admin|wp-login/i, // WordPress probing
  /\.git\//, // Git directory probing
];

/**
 * Check if a string contains suspicious patterns.
 */
function hasSuspiciousPattern(input: string): boolean {
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Check if IP is blocked in Redis. Returns null if Redis is unavailable so
 * callers can distinguish "not blocked" from "Redis down, fall back to memory".
 */
async function isIPBlockedInRedis(ip: string): Promise<boolean | null> {
  if (!redisClient) return null;
  try {
    const blocked = await redisClient.get(`waf:blocked:${ip}`);
    return blocked === '1';
  } catch (err) {
    logger.warn('WAF: Redis block-check failed, falling back to in-memory list', {
      ip,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * WAF middleware - blocks suspicious requests.
 *
 * Block decisions consult the in-memory deny list synchronously first, then
 * await the Redis deny list. Awaiting Redis (rather than fire-and-forget) is
 * required so that the very first request from a distributed-blocked IP is
 * actually rejected instead of slipping through while memory catches up.
 * Redis failures fall back to in-memory and are logged, not swallowed.
 */
export async function wafMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';

  // 1a. Fast path: in-memory deny list
  if (memoryBlockedIPs.has(clientIP)) {
    logger.warn('WAF: Blocked IP attempted access (memory)', { ip: clientIP, path: req.path });
    res.status(403).json({ error: 'Erişim engellendi' });
    return;
  }

  // 1b. Distributed deny list (Redis). Await so blocks are enforced on the
  // first request, not the second.
  const redisBlocked = await isIPBlockedInRedis(clientIP);
  if (redisBlocked === true) {
    memoryBlockedIPs.add(clientIP); // sync memory for faster subsequent checks
    logger.warn('WAF: Blocked IP attempted access (redis)', { ip: clientIP, path: req.path });
    res.status(403).json({ error: 'Erişim engellendi' });
    return;
  }

  // 2. Check request path for suspicious patterns
  const fullPath = req.originalUrl || req.path;
  if (hasSuspiciousPattern(fullPath)) {
    trackSuspiciousActivity(clientIP, 'path', fullPath);
    logger.warn('WAF: Suspicious path pattern detected', { ip: clientIP, path: fullPath });
    res.status(403).json({ error: 'Geçersiz istek' });
    return;
  }

  // 3. Check query parameters
  const queryString = JSON.stringify(req.query);
  if (hasSuspiciousPattern(queryString)) {
    trackSuspiciousActivity(clientIP, 'query', queryString);
    logger.warn('WAF: Suspicious query pattern detected', { ip: clientIP, query: queryString });
    res.status(403).json({ error: 'Geçersiz istek parametreleri' });
    return;
  }

  // 4. Check request body (for POST/PUT/PATCH)
  if (req.body && typeof req.body === 'object') {
    const bodyString = JSON.stringify(req.body);
    if (bodyString.length > 0 && hasSuspiciousPattern(bodyString)) {
      trackSuspiciousActivity(clientIP, 'body', bodyString.substring(0, 200));
      logger.warn('WAF: Suspicious body pattern detected', { ip: clientIP });
      res.status(403).json({ error: 'Geçersiz istek içeriği' });
      return;
    }
  }

  // 5. Check for oversized requests (beyond Express limits)
  const contentLength = parseInt(req.get('content-length') || '0', 10);
  if (contentLength > 50 * 1024 * 1024) {
    // 50MB absolute max
    logger.warn('WAF: Oversized request blocked', { ip: clientIP, contentLength });
    res.status(413).json({ error: 'İstek boyutu çok büyük' });
    return;
  }

  // 6. Block requests with no User-Agent (likely bots)
  if (!req.get('User-Agent') && req.path !== '/health' && req.path !== '/metrics') {
    trackSuspiciousActivity(clientIP, 'no-ua', req.path);
  }

  next();
}

/**
 * Track suspicious activity and auto-block if threshold exceeded.
 */
function trackSuspiciousActivity(ip: string, type: string, detail: string): void {
  const now = Date.now();
  const entry = memorySuspiciousIPCounts.get(ip);

  if (entry && now - entry.firstSeen < SUSPICIOUS_WINDOW_MS) {
    entry.count++;
    if (entry.count >= SUSPICIOUS_THRESHOLD) {
      // Block in memory
      memoryBlockedIPs.add(ip);
      logger.error('WAF: IP auto-blocked due to suspicious activity', {
        ip,
        count: entry.count,
        lastType: type,
      });

      // Block in Redis for distributed awareness
      if (redisClient) {
        const blockDurationSec = Math.floor(BLOCK_DURATION_MS / 1000);
        redisClient.setex(`waf:blocked:${ip}`, blockDurationSec, '1').catch((err: unknown) =>
          logger.warn('WAF: Redis setex failed while recording block', {
            ip,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }

      // Auto-unblock from memory after duration
      setTimeout(() => {
        memoryBlockedIPs.delete(ip);
        memorySuspiciousIPCounts.delete(ip);
        logger.info('WAF: IP auto-unblocked', { ip });
      }, BLOCK_DURATION_MS);
    }
  } else {
    memorySuspiciousIPCounts.set(ip, { count: 1, firstSeen: now });
  }

  // Track in Redis for distributed counting
  if (redisClient) {
    const key = `waf:suspicious:${ip}`;
    redisClient
      .multi()
      .incr(key)
      .expire(key, Math.floor(SUSPICIOUS_WINDOW_MS / 1000))
      .exec()
      .catch((err: unknown) =>
        logger.warn('WAF: Redis multi() failed while tracking suspicious activity', {
          ip,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
  }
}

/**
 * Manually block an IP address.
 */
export function blockIP(ip: string, durationMs?: number): void {
  memoryBlockedIPs.add(ip);
  logger.info('WAF: IP manually blocked', { ip });

  if (redisClient) {
    const ttl = durationMs ? Math.floor(durationMs / 1000) : Math.floor(BLOCK_DURATION_MS / 1000);
    redisClient.setex(`waf:blocked:${ip}`, ttl, '1').catch((err: unknown) =>
      logger.warn('WAF: Redis setex failed during manual block', {
        ip,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }

  if (durationMs) {
    setTimeout(() => {
      memoryBlockedIPs.delete(ip);
      logger.info('WAF: IP auto-unblocked (manual block expired)', { ip });
    }, durationMs);
  }
}

/**
 * Manually unblock an IP address.
 */
export function unblockIP(ip: string): void {
  memoryBlockedIPs.delete(ip);
  memorySuspiciousIPCounts.delete(ip);
  logger.info('WAF: IP manually unblocked', { ip });

  if (redisClient) {
    redisClient.del(`waf:blocked:${ip}`, `waf:suspicious:${ip}`).catch((err: unknown) =>
      logger.warn('WAF: Redis del failed during manual unblock', {
        ip,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

/**
 * Get current WAF status.
 */
export function getWafStatus() {
  return {
    blockedIPs: Array.from(memoryBlockedIPs),
    suspiciousIPs: Array.from(memorySuspiciousIPCounts.entries()).map(([ip, data]) => ({
      ip,
      count: data.count,
      firstSeen: new Date(data.firstSeen).toISOString(),
    })),
    redisEnabled: !!redisClient,
  };
}

/**
 * Cloudflare-specific headers trust middleware.
 * When behind Cloudflare, trust CF-Connecting-IP for real client IP.
 */
export function cloudflareHeaders(req: Request, _res: Response, next: NextFunction): void {
  // If behind Cloudflare, use CF-Connecting-IP
  const cfIP = req.get('CF-Connecting-IP');
  if (cfIP && process.env.TRUST_CLOUDFLARE === 'true') {
    // Express will use this for req.ip
    req.headers['x-forwarded-for'] = cfIP;
  }
  next();
}
