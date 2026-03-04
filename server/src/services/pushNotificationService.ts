import { PushSubscription } from '../models/PushSubscription';
import logger from '../utils/logger';

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export class PushNotificationService {
  /**
   * Kullanıcıya push bildirimi gönder (tüm cihazlarına)
   */
  static async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    let webpush: any;
    try {
      webpush = await import('web-push');
    } catch {
      logger.warn('web-push module not installed, skipping push notification');
      return;
    }

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@tofasfen.edu.tr';

    if (!vapidPublicKey || !vapidPrivateKey) {
      logger.warn('VAPID keys not configured, skipping push notification');
      return;
    }

    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

    const subscriptions = await PushSubscription.find({ userId });
    if (subscriptions.length === 0) return;

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      icon: payload.icon || '/tofaslogo.png',
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          pushPayload
        );
      } catch (error: any) {
        // Expired/invalid subscription — temizle
        if (error?.statusCode === 410 || error?.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
          logger.info(`Removed expired push subscription for user ${userId}`);
        } else {
          logger.error(`Push notification failed for user ${userId}:`, error);
        }
      }
    }
  }
}
