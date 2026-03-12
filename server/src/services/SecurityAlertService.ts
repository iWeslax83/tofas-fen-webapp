import logger from '../utils/logger';
import { User } from '../models/User';
import { NotificationService } from './NotificationService';

/**
 * Security anomaly detection and alerting service.
 * Uses Redis for shared state in multi-instance deployments,
 * falls back to in-memory for development.
 */

interface SecurityEvent {
  type: string;
  userId?: string;
  ip?: string;
  details: Record<string, any>;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Thresholds for anomaly detection
const THRESHOLDS = {
  MASS_LOGIN_FAILURES: 20,      // in 5 minutes
  MASS_LOGIN_FAILURE_WINDOW: 5 * 60 * 1000,
  DATA_EXPORT_SPIKE: 5,         // exports per user in 1 hour
  DATA_EXPORT_WINDOW: 60 * 60 * 1000,
  OFF_HOURS_ADMIN_START: 23,    // 11 PM
  OFF_HOURS_ADMIN_END: 6,       // 6 AM
  ROLE_CHANGE_SPIKE: 3,         // role changes in 10 minutes
  ROLE_CHANGE_WINDOW: 10 * 60 * 1000,
  BRUTE_FORCE_IPS: 5,           // different IPs with failures for same user
  BRUTE_FORCE_WINDOW: 15 * 60 * 1000,
};

// In-memory fallback stores
const memLoginFailures: Array<{ ip: string; userId: string; timestamp: number }> = [];
const memDataExports: Map<string, number[]> = new Map();
const memRoleChanges: Array<{ userId: string; timestamp: number }> = [];
const memAlertCooldowns: Map<string, number> = new Map();

const ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes between same alert type

// Redis client reference
let redis: any = null;

/**
 * Initialize SecurityAlertService with Redis for distributed tracking.
 */
export function initSecurityAlertRedis(redisClient: any): void {
  redis = redisClient;
  logger.info('SecurityAlertService: Redis initialized for distributed tracking');
}

export class SecurityAlertService {
  /**
   * Track a failed login attempt.
   */
  static async trackLoginFailure(userId: string, ip: string): Promise<void> {
    const now = Date.now();

    if (redis) {
      try {
        const windowSec = Math.floor(THRESHOLDS.MASS_LOGIN_FAILURE_WINDOW / 1000);
        const bruteWindowSec = Math.floor(THRESHOLDS.BRUTE_FORCE_WINDOW / 1000);

        // Store login failure in a sorted set (score = timestamp)
        const globalKey = 'secalert:login_failures';
        const userKey = `secalert:login_failures:user:${userId}`;
        const userIpSetKey = `secalert:login_ips:${userId}`;

        await redis.multi()
          // Global login failures
          .zadd(globalKey, now, `${ip}:${userId}:${now}`)
          .zremrangebyscore(globalKey, '-inf', now - THRESHOLDS.MASS_LOGIN_FAILURE_WINDOW)
          .expire(globalKey, windowSec + 60)
          // Per-user failures
          .zadd(userKey, now, `${ip}:${now}`)
          .zremrangebyscore(userKey, '-inf', now - THRESHOLDS.BRUTE_FORCE_WINDOW)
          .expire(userKey, bruteWindowSec + 60)
          // Track unique IPs per user
          .sadd(userIpSetKey, ip)
          .expire(userIpSetKey, bruteWindowSec + 60)
          .exec();

        // Check mass login failures
        const failureCount = await redis.zcard(globalKey);
        if (failureCount >= THRESHOLDS.MASS_LOGIN_FAILURES) {
          // Get unique IPs and users from recent failures
          const entries: string[] = await redis.zrangebyscore(globalKey, now - THRESHOLDS.MASS_LOGIN_FAILURE_WINDOW, '+inf');
          const uniqueIPs = new Set(entries.map((e: string) => e.split(':')[0]));
          const uniqueUsers = new Set(entries.map((e: string) => e.split(':')[1]));

          this.triggerAlert({
            type: 'mass_login_failures',
            ip,
            details: {
              failureCount,
              windowMinutes: THRESHOLDS.MASS_LOGIN_FAILURE_WINDOW / 60000,
              uniqueIPs: uniqueIPs.size,
              uniqueUsers: uniqueUsers.size,
            },
            timestamp: new Date(),
            severity: 'critical',
          });
        }

        // Check distributed brute force
        const uniqueIPCount = await redis.scard(userIpSetKey);
        if (uniqueIPCount >= THRESHOLDS.BRUTE_FORCE_IPS) {
          const ips: string[] = await redis.smembers(userIpSetKey);
          const totalAttempts = await redis.zcard(userKey);

          this.triggerAlert({
            type: 'distributed_brute_force',
            userId,
            details: {
              uniqueIPs: uniqueIPCount,
              totalAttempts,
              ips: ips.slice(0, 10),
            },
            timestamp: new Date(),
            severity: 'critical',
          });
        }

        return;
      } catch (err) {
        logger.warn('SecurityAlertService: Redis error in trackLoginFailure, falling back to memory', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // In-memory fallback
    memLoginFailures.push({ ip, userId, timestamp: now });

    const cutoff = now - THRESHOLDS.MASS_LOGIN_FAILURE_WINDOW;
    while (memLoginFailures.length > 0 && memLoginFailures[0].timestamp < cutoff) {
      memLoginFailures.shift();
    }

    if (memLoginFailures.length >= THRESHOLDS.MASS_LOGIN_FAILURES) {
      this.triggerAlert({
        type: 'mass_login_failures',
        ip,
        details: {
          failureCount: memLoginFailures.length,
          windowMinutes: THRESHOLDS.MASS_LOGIN_FAILURE_WINDOW / 60000,
          uniqueIPs: new Set(memLoginFailures.map(f => f.ip)).size,
          uniqueUsers: new Set(memLoginFailures.map(f => f.userId)).size,
        },
        timestamp: new Date(),
        severity: 'critical',
      });
    }

    const userFailures = memLoginFailures.filter(f => f.userId === userId);
    const uniqueIPs = new Set(userFailures.map(f => f.ip));
    if (uniqueIPs.size >= THRESHOLDS.BRUTE_FORCE_IPS) {
      this.triggerAlert({
        type: 'distributed_brute_force',
        userId,
        details: {
          uniqueIPs: uniqueIPs.size,
          totalAttempts: userFailures.length,
          ips: Array.from(uniqueIPs).slice(0, 10),
        },
        timestamp: new Date(),
        severity: 'critical',
      });
    }
  }

  /**
   * Track a data export action.
   */
  static async trackDataExport(userId: string): Promise<void> {
    const now = Date.now();

    if (redis) {
      try {
        const key = `secalert:data_exports:${userId}`;
        const windowSec = Math.floor(THRESHOLDS.DATA_EXPORT_WINDOW / 1000);

        await redis.multi()
          .zadd(key, now, `${now}`)
          .zremrangebyscore(key, '-inf', now - THRESHOLDS.DATA_EXPORT_WINDOW)
          .expire(key, windowSec + 60)
          .exec();

        const exportCount = await redis.zcard(key);
        if (exportCount >= THRESHOLDS.DATA_EXPORT_SPIKE) {
          this.triggerAlert({
            type: 'data_export_spike',
            userId,
            details: {
              exportCount,
              windowMinutes: THRESHOLDS.DATA_EXPORT_WINDOW / 60000,
            },
            timestamp: new Date(),
            severity: 'high',
          });
        }

        return;
      } catch (err) {
        logger.warn('SecurityAlertService: Redis error in trackDataExport, falling back to memory', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // In-memory fallback
    const userExports = memDataExports.get(userId) || [];
    userExports.push(now);

    const cutoff = now - THRESHOLDS.DATA_EXPORT_WINDOW;
    const filtered = userExports.filter(t => t > cutoff);
    memDataExports.set(userId, filtered);

    if (filtered.length >= THRESHOLDS.DATA_EXPORT_SPIKE) {
      this.triggerAlert({
        type: 'data_export_spike',
        userId,
        details: {
          exportCount: filtered.length,
          windowMinutes: THRESHOLDS.DATA_EXPORT_WINDOW / 60000,
        },
        timestamp: new Date(),
        severity: 'high',
      });
    }
  }

  /**
   * Track admin actions and check for off-hours activity.
   */
  static trackAdminAction(userId: string, action: string, ip?: string): void {
    const now = new Date();
    // Check for Turkey timezone (UTC+3)
    const turkeyHour = (now.getUTCHours() + 3) % 24;

    if (turkeyHour >= THRESHOLDS.OFF_HOURS_ADMIN_START || turkeyHour < THRESHOLDS.OFF_HOURS_ADMIN_END) {
      this.triggerAlert({
        type: 'off_hours_admin_access',
        userId,
        ip,
        details: {
          action,
          localHour: turkeyHour,
          utcTime: now.toISOString(),
        },
        timestamp: now,
        severity: 'medium',
      });
    }
  }

  /**
   * Track role changes for spike detection.
   */
  static async trackRoleChange(userId: string, newRole: string, changedBy: string): Promise<void> {
    const now = Date.now();

    if (redis) {
      try {
        const key = 'secalert:role_changes';
        const windowSec = Math.floor(THRESHOLDS.ROLE_CHANGE_WINDOW / 1000);

        await redis.multi()
          .zadd(key, now, `${userId}:${changedBy}:${now}`)
          .zremrangebyscore(key, '-inf', now - THRESHOLDS.ROLE_CHANGE_WINDOW)
          .expire(key, windowSec + 60)
          .exec();

        const changeCount = await redis.zcard(key);
        if (changeCount >= THRESHOLDS.ROLE_CHANGE_SPIKE) {
          this.triggerAlert({
            type: 'role_change_spike',
            userId: changedBy,
            details: {
              changeCount,
              windowMinutes: THRESHOLDS.ROLE_CHANGE_WINDOW / 60000,
              lastChange: { userId, newRole },
            },
            timestamp: new Date(),
            severity: 'high',
          });
        }

        return;
      } catch (err) {
        logger.warn('SecurityAlertService: Redis error in trackRoleChange, falling back to memory', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // In-memory fallback
    memRoleChanges.push({ userId, timestamp: now });

    const cutoff = now - THRESHOLDS.ROLE_CHANGE_WINDOW;
    while (memRoleChanges.length > 0 && memRoleChanges[0].timestamp < cutoff) {
      memRoleChanges.shift();
    }

    if (memRoleChanges.length >= THRESHOLDS.ROLE_CHANGE_SPIKE) {
      this.triggerAlert({
        type: 'role_change_spike',
        userId: changedBy,
        details: {
          changeCount: memRoleChanges.length,
          windowMinutes: THRESHOLDS.ROLE_CHANGE_WINDOW / 60000,
          lastChange: { userId, newRole },
        },
        timestamp: new Date(),
        severity: 'high',
      });
    }
  }

  /**
   * Track suspicious token usage (possible token theft).
   */
  static trackSuspiciousTokenUsage(userId: string, reason: string, ip?: string): void {
    this.triggerAlert({
      type: 'suspicious_token_usage',
      userId,
      ip,
      details: { reason },
      timestamp: new Date(),
      severity: 'high',
    });
  }

  /**
   * Trigger a security alert - log and notify admins.
   * Uses Redis for distributed cooldown tracking.
   */
  private static async triggerAlert(event: SecurityEvent): Promise<void> {
    const cooldownKey = `${event.type}:${event.userId || event.ip || 'global'}`;

    // Check cooldown (Redis or memory)
    if (redis) {
      try {
        const redisCooldownKey = `secalert:cooldown:${cooldownKey}`;
        const existing = await redis.get(redisCooldownKey);
        if (existing) {
          return; // Cooldown active
        }
        await redis.setex(redisCooldownKey, Math.floor(ALERT_COOLDOWN_MS / 1000), '1');
      } catch {
        // Fall through to memory cooldown
        const lastAlert = memAlertCooldowns.get(cooldownKey);
        if (lastAlert && Date.now() - lastAlert < ALERT_COOLDOWN_MS) {
          return;
        }
        memAlertCooldowns.set(cooldownKey, Date.now());
      }
    } else {
      const lastAlert = memAlertCooldowns.get(cooldownKey);
      if (lastAlert && Date.now() - lastAlert < ALERT_COOLDOWN_MS) {
        return;
      }
      memAlertCooldowns.set(cooldownKey, Date.now());
    }

    // Log the security event
    const logMethod = event.severity === 'critical' ? 'error' : 'warn';
    logger[logMethod](`SECURITY ALERT [${event.severity.toUpperCase()}]: ${event.type}`, {
      ...event.details,
      userId: event.userId,
      ip: event.ip,
      severity: event.severity,
    });

    // Notify admin users
    try {
      const admins = await User.find({ rol: 'admin', isActive: true }).select('id').lean();
      const adminIds = admins.map((a: any) => a.id);

      if (adminIds.length > 0) {
        const severityEmoji: Record<string, string> = {
          low: 'Bilgi',
          medium: 'Uyari',
          high: 'Onemli',
          critical: 'Kritik',
        };

        const messages: Record<string, string> = {
          mass_login_failures: `Son ${THRESHOLDS.MASS_LOGIN_FAILURE_WINDOW / 60000} dakikada ${event.details.failureCount} basarisiz giris denemesi tespit edildi.`,
          distributed_brute_force: `Kullanici ${event.userId} icin ${event.details.uniqueIPs} farkli IP'den brute force saldirisi tespit edildi.`,
          data_export_spike: `Kullanici ${event.userId} son 1 saatte ${event.details.exportCount} kez veri disa aktarimi yapti.`,
          off_hours_admin_access: `Admin ${event.userId} mesai saatleri disinda (saat ${event.details.localHour}:00) islem yapti: ${event.details.action}`,
          role_change_spike: `Son ${THRESHOLDS.ROLE_CHANGE_WINDOW / 60000} dakikada ${event.details.changeCount} rol degisikligi yapildi.`,
          suspicious_token_usage: `Supheli token kullanimi: ${event.details.reason} (Kullanici: ${event.userId})`,
        };

        for (const adminId of adminIds) {
          await NotificationService.createNotification({
            userId: adminId,
            title: `Guvenlik Alarmi [${severityEmoji[event.severity]}]`,
            message: messages[event.type] || `Guvenlik olayi: ${event.type}`,
            type: 'warning',
            priority: event.severity === 'critical' ? 'urgent' : 'high',
            category: 'security',
          });
        }
      }
    } catch (error) {
      logger.error('Failed to send security alert notifications', {
        error: error instanceof Error ? error.message : String(error),
        eventType: event.type,
      });
    }
  }

  /**
   * Get current security status summary.
   */
  static async getSecurityStatus(): Promise<Record<string, any>> {
    const now = Date.now();

    if (redis) {
      try {
        const globalKey = 'secalert:login_failures';
        const roleKey = 'secalert:role_changes';

        const [failureCount, failureEntries, roleChangeCount] = await Promise.all([
          redis.zcount(globalKey, now - THRESHOLDS.MASS_LOGIN_FAILURE_WINDOW, '+inf'),
          redis.zrangebyscore(globalKey, now - THRESHOLDS.MASS_LOGIN_FAILURE_WINDOW, '+inf'),
          redis.zcount(roleKey, now - THRESHOLDS.ROLE_CHANGE_WINDOW, '+inf'),
        ]);

        const uniqueIPs = new Set((failureEntries as string[]).map((e: string) => e.split(':')[0]));
        const uniqueUsers = new Set((failureEntries as string[]).map((e: string) => e.split(':')[1]));

        return {
          recentLoginFailures: failureCount,
          uniqueFailedIPs: uniqueIPs.size,
          uniqueFailedUsers: uniqueUsers.size,
          recentRoleChanges: roleChangeCount,
          redisEnabled: true,
        };
      } catch (err) {
        logger.warn('SecurityAlertService: Redis error in getSecurityStatus, falling back to memory', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // In-memory fallback
    const recentFailures = memLoginFailures.filter(
      f => f.timestamp > now - THRESHOLDS.MASS_LOGIN_FAILURE_WINDOW
    );

    return {
      recentLoginFailures: recentFailures.length,
      uniqueFailedIPs: new Set(recentFailures.map(f => f.ip)).size,
      uniqueFailedUsers: new Set(recentFailures.map(f => f.userId)).size,
      recentRoleChanges: memRoleChanges.filter(
        r => r.timestamp > now - THRESHOLDS.ROLE_CHANGE_WINDOW
      ).length,
      activeDataExportUsers: Array.from(memDataExports.entries())
        .filter(([, times]) => times.some(t => t > now - THRESHOLDS.DATA_EXPORT_WINDOW))
        .length,
      activeAlertCooldowns: memAlertCooldowns.size,
      redisEnabled: false,
    };
  }
}
