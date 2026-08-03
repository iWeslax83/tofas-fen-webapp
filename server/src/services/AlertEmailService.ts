import logger from '../utils/logger';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_EMAILS_PER_TYPE = 10;

const emailSendCounts = new Map<string, { count: number; windowStart: number }>();

export class AlertEmailService {
  static async sendAlert(
    subject: string,
    body: string,
    severity: 'warning' | 'critical',
  ): Promise<void> {
    const enabled = process.env.ALERT_EMAIL_ENABLED === 'true';
    const recipients = process.env.ALERT_EMAIL_TO || '';

    if (!enabled || !recipients) return;

    const now = Date.now();
    const tracker = emailSendCounts.get(subject);
    if (tracker) {
      if (now - tracker.windowStart < RATE_LIMIT_WINDOW_MS) {
        if (tracker.count >= MAX_EMAILS_PER_TYPE) {
          logger.warn(`Alert email rate limited: ${subject}`);
          return;
        }
        tracker.count++;
      } else {
        emailSendCounts.set(subject, { count: 1, windowStart: now });
      }
    } else {
      emailSendCounts.set(subject, { count: 1, windowStart: now });
    }

    const severityPrefix = severity === 'critical' ? '[KRITIK]' : '[UYARI]';

    try {
      // Lazy-import to avoid a circular dep with mailService -> logger.
      const { sendMail } = await import('../mailService');
      await sendMail(
        recipients,
        `${severityPrefix} Tofaş Fen - ${subject}`,
        `Severity: ${severity.toUpperCase()}\nTime: ${new Date().toISOString()}\n\n${body}`,
        false,
      );
      logger.info(`Alert email sent: ${subject}`, { severity, to: recipients });
    } catch (error) {
      logger.error('Failed to send alert email', {
        error: (error as Error).message,
        subject,
      });
    }
  }

  static resetRateLimits(): void {
    emailSendCounts.clear();
  }
}
