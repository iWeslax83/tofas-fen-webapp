import logger from '../utils/logger';
import { User } from '../models/User';
import { NotificationService } from './NotificationService';

/**
 * Security anomaly detection and alerting service.
 * Monitors for suspicious patterns and notifies administrators.
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

// In-memory event tracking
const loginFailures: Array<{ ip: string; userId: string; timestamp: number }> = [];
const dataExports: Map<string, number[]> = new Map();
const roleChanges: Array<{ userId: string; timestamp: number }> = [];
const alertCooldowns: Map<string, number> = new Map();

const ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes between same alert type

export class SecurityAlertService {
  /**
   * Track a failed login attempt.
   */
  static trackLoginFailure(userId: string, ip: string): void {
    const now = Date.now();
    loginFailures.push({ ip, userId, timestamp: now });

    // Cleanup old entries
    const cutoff = now - THRESHOLDS.MASS_LOGIN_FAILURE_WINDOW;
    while (loginFailures.length > 0 && loginFailures[0].timestamp < cutoff) {
      loginFailures.shift();
    }

    // Check for mass login failures (possible brute force attack)
    if (loginFailures.length >= THRESHOLDS.MASS_LOGIN_FAILURES) {
      this.triggerAlert({
        type: 'mass_login_failures',
        ip,
        details: {
          failureCount: loginFailures.length,
          windowMinutes: THRESHOLDS.MASS_LOGIN_FAILURE_WINDOW / 60000,
          uniqueIPs: new Set(loginFailures.map(f => f.ip)).size,
          uniqueUsers: new Set(loginFailures.map(f => f.userId)).size,
        },
        timestamp: new Date(),
        severity: 'critical',
      });
    }

    // Check for brute force on single user from multiple IPs
    const userFailures = loginFailures.filter(f => f.userId === userId);
    const uniqueIPs = new Set(userFailures.map(f => f.ip));
    if (uniqueIPs.size >= THRESHOLDS.BRUTE_FORCE_IPS) {
      this.triggerAlert({
        type: 'distributed_brute_force',
        userId,
        details: {
          uniqueIPs: uniqueIPs.size,
          totalAttempts: userFailures.length,
          ips: Array.from(uniqueIPs).slice(0, 10), // Limit to 10 for logging
        },
        timestamp: new Date(),
        severity: 'critical',
      });
    }
  }

  /**
   * Track a data export action.
   */
  static trackDataExport(userId: string): void {
    const now = Date.now();
    const userExports = dataExports.get(userId) || [];
    userExports.push(now);

    // Cleanup old entries
    const cutoff = now - THRESHOLDS.DATA_EXPORT_WINDOW;
    const filtered = userExports.filter(t => t > cutoff);
    dataExports.set(userId, filtered);

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
  static trackRoleChange(userId: string, newRole: string, changedBy: string): void {
    const now = Date.now();
    roleChanges.push({ userId, timestamp: now });

    // Cleanup old entries
    const cutoff = now - THRESHOLDS.ROLE_CHANGE_WINDOW;
    while (roleChanges.length > 0 && roleChanges[0].timestamp < cutoff) {
      roleChanges.shift();
    }

    if (roleChanges.length >= THRESHOLDS.ROLE_CHANGE_SPIKE) {
      this.triggerAlert({
        type: 'role_change_spike',
        userId: changedBy,
        details: {
          changeCount: roleChanges.length,
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
   */
  private static async triggerAlert(event: SecurityEvent): Promise<void> {
    // Check cooldown to prevent alert flooding
    const cooldownKey = `${event.type}:${event.userId || event.ip || 'global'}`;
    const lastAlert = alertCooldowns.get(cooldownKey);
    if (lastAlert && Date.now() - lastAlert < ALERT_COOLDOWN_MS) {
      return; // Skip - too soon since last alert of this type
    }
    alertCooldowns.set(cooldownKey, Date.now());

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
  static getSecurityStatus() {
    const now = Date.now();
    const recentFailures = loginFailures.filter(
      f => f.timestamp > now - THRESHOLDS.MASS_LOGIN_FAILURE_WINDOW
    );

    return {
      recentLoginFailures: recentFailures.length,
      uniqueFailedIPs: new Set(recentFailures.map(f => f.ip)).size,
      uniqueFailedUsers: new Set(recentFailures.map(f => f.userId)).size,
      recentRoleChanges: roleChanges.filter(
        r => r.timestamp > now - THRESHOLDS.ROLE_CHANGE_WINDOW
      ).length,
      activeDataExportUsers: Array.from(dataExports.entries())
        .filter(([, times]) => times.some(t => t > now - THRESHOLDS.DATA_EXPORT_WINDOW))
        .length,
      activeAlertCooldowns: alertCooldowns.size,
    };
  }
}
