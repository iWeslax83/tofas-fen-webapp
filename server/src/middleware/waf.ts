import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Web Application Firewall (WAF) middleware.
 * Provides basic request filtering and IP blocking for when
 * a dedicated WAF (Cloudflare, AWS WAF) is not yet deployed.
 */

// In-memory blocked IPs (production should use Redis)
const blockedIPs = new Set<string>();
const suspiciousIPCounts = new Map<string, { count: number; firstSeen: number }>();

const SUSPICIOUS_THRESHOLD = 50; // requests with suspicious patterns
const SUSPICIOUS_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Suspicious patterns in request paths and query strings
const SUSPICIOUS_PATTERNS = [
  /\.\.\//,                    // Directory traversal
  /<script/i,                  // XSS attempt
  /union\s+select/i,           // SQL injection
  /\bexec\b.*\(/i,             // Command injection
  /\bdrop\b.*\btable\b/i,     // SQL drop table
  /\b(cmd|powershell|bash)\b/i, // Shell injection
  /\/etc\/passwd/i,            // Path traversal
  /\/proc\/self/i,             // Linux proc traversal
  /\beval\s*\(/i,              // Code injection
  /\$\{.*\}/,                  // Template injection
  /\bphpinfo\b/i,              // PHP probing
  /\.env\b/,                   // Env file probing
  /wp-admin|wp-login/i,        // WordPress probing
  /\.git\//,                   // Git directory probing
];

// Suspicious headers
const SUSPICIOUS_HEADERS = [
  'x-forwarded-host',  // Host header injection
];

/**
 * Check if a string contains suspicious patterns.
 */
function hasSuspiciousPattern(input: string): boolean {
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * WAF middleware - blocks suspicious requests.
 */
export function wafMiddleware(req: Request, res: Response, next: NextFunction): void {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';

  // 1. Check if IP is blocked
  if (blockedIPs.has(clientIP)) {
    logger.warn('WAF: Blocked IP attempted access', { ip: clientIP, path: req.path });
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
  if (contentLength > 50 * 1024 * 1024) { // 50MB absolute max
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
  const entry = suspiciousIPCounts.get(ip);

  if (entry && (now - entry.firstSeen) < SUSPICIOUS_WINDOW_MS) {
    entry.count++;
    if (entry.count >= SUSPICIOUS_THRESHOLD) {
      blockedIPs.add(ip);
      logger.error('WAF: IP auto-blocked due to suspicious activity', {
        ip,
        count: entry.count,
        lastType: type,
      });

      // Auto-unblock after duration
      setTimeout(() => {
        blockedIPs.delete(ip);
        suspiciousIPCounts.delete(ip);
        logger.info('WAF: IP auto-unblocked', { ip });
      }, BLOCK_DURATION_MS);
    }
  } else {
    suspiciousIPCounts.set(ip, { count: 1, firstSeen: now });
  }
}

/**
 * Manually block an IP address.
 */
export function blockIP(ip: string, durationMs?: number): void {
  blockedIPs.add(ip);
  logger.info('WAF: IP manually blocked', { ip });

  if (durationMs) {
    setTimeout(() => {
      blockedIPs.delete(ip);
      logger.info('WAF: IP auto-unblocked (manual block expired)', { ip });
    }, durationMs);
  }
}

/**
 * Manually unblock an IP address.
 */
export function unblockIP(ip: string): void {
  blockedIPs.delete(ip);
  suspiciousIPCounts.delete(ip);
  logger.info('WAF: IP manually unblocked', { ip });
}

/**
 * Get current WAF status.
 */
export function getWafStatus() {
  return {
    blockedIPs: Array.from(blockedIPs),
    suspiciousIPs: Array.from(suspiciousIPCounts.entries()).map(([ip, data]) => ({
      ip,
      count: data.count,
      firstSeen: new Date(data.firstSeen).toISOString(),
    })),
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
