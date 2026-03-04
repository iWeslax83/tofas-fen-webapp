import cron from 'node-cron';
import { EvciRequest, getWeekMonday } from '../models/EvciRequest';
import { User } from '../models/User';
import { NotificationService } from './NotificationService';
import { PushNotificationService } from './pushNotificationService';
import logger from '../utils/logger';

export class SchedulerService {
  /**
   * Zamanlanmış işleri başlat.
   */
  static initialize(): void {
    // Perşembe 16:00 (Europe/Istanbul) — evci hatırlatmaları
    cron.schedule('0 16 * * 4', async () => {
      logger.info('Running evci reminder job (Thursday 16:00 Turkey time)');
      try {
        await SchedulerService.sendEvciReminders();
      } catch (error) {
        logger.error('Evci reminder job failed', { error });
      }
    }, {
      timezone: 'Europe/Istanbul',
    });

    // Cuma 08:00 (Europe/Istanbul) — onaylanmamış talepleri admin'e eskalasyon
    cron.schedule('0 8 * * 5', async () => {
      logger.info('Running evci escalation job (Friday 08:00 Turkey time)');
      try {
        await SchedulerService.escalateUnapprovedRequests();
      } catch (error) {
        logger.error('Evci escalation job failed', { error });
      }
    }, {
      timezone: 'Europe/Istanbul',
    });

    logger.info('SchedulerService initialized — evci reminders (Thu 16:00), escalation (Fri 08:00)');
  }

  /**
   * Cuma sabahı hâlâ veli onayı bekleyen talepleri admin'e bildirme.
   */
  static async escalateUnapprovedRequests(): Promise<void> {
    const weekOf = getWeekMonday(new Date());

    const pendingRequests = await EvciRequest.find({
      weekOf,
      parentApproval: 'pending',
    });

    if (pendingRequests.length === 0) {
      logger.info('No unapproved evci requests to escalate');
      return;
    }

    // Admin kullanıcılarını bul
    const admins = await User.find({ rol: 'admin', isActive: true });

    for (const admin of admins) {
      try {
        await NotificationService.createNotification({
          userId: admin.id,
          title: 'Onaylanmamış Evci Talepleri',
          message: `Bu hafta ${pendingRequests.length} evci talebi hâlâ veli onayı bekliyor.`,
          type: 'warning',
          priority: 'high',
          category: 'administrative',
          sendEmail: true,
          emailSubject: `${pendingRequests.length} Evci Talebi Onay Bekliyor`,
          actionUrl: '/admin/evci-listesi',
          actionText: 'Talepleri Görüntüle',
        });

        // Push notification
        PushNotificationService.sendToUser(admin.id, {
          title: 'Onaylanmamış Evci Talepleri',
          body: `Bu hafta ${pendingRequests.length} evci talebi hâlâ veli onayı bekliyor.`,
          url: '/admin/evci-listesi',
        }).catch(() => {});
      } catch (err) {
        logger.error(`Failed to send escalation notification to admin ${admin.id}`, { error: err });
      }
    }

    logger.info(`Escalated ${pendingRequests.length} unapproved evci requests to ${admins.length} admins`);
  }

  /**
   * Bu hafta evci talebi atmayan yatılı öğrencilere hatırlatma gönder.
   */
  static async sendEvciReminders(): Promise<void> {
    const weekOf = getWeekMonday(new Date());

    // Tüm yatılı öğrencileri bul
    const boardingStudents = await User.find({
      rol: 'student',
      pansiyon: true,
      isActive: true,
    });

    if (boardingStudents.length === 0) {
      logger.info('No boarding students found, skipping reminders');
      return;
    }

    // Bu hafta talep atan öğrenci ID'leri
    const submittedRequests = await EvciRequest.find({ weekOf }).select('studentId');
    const submittedStudentIds = new Set(submittedRequests.map(r => r.studentId));

    // Talep atmayanları filtrele
    const missingStudents = boardingStudents.filter(s => !submittedStudentIds.has(s.id));

    logger.info(`Evci reminders: ${missingStudents.length} boarding students have not submitted this week`);

    for (const student of missingStudents) {
      try {
        if (student.email) {
          // Öğrencinin e-postası varsa öğrenciye gönder
          await NotificationService.createNotification({
            userId: student.id,
            title: 'Evci Talebi Hatırlatması',
            message: 'Bu hafta henüz evci talebi oluşturmadınız. Lütfen Perşembe gün sonuna kadar talebinizi oluşturun.',
            type: 'reminder',
            priority: 'high',
            category: 'administrative',
            sendEmail: true,
            emailSubject: 'Evci Talebi Hatırlatması',
            actionUrl: '/student/evci',
            actionText: 'Talep Oluştur',
          });

          // Push notification to student
          PushNotificationService.sendToUser(student.id, {
            title: 'Evci Talebi Hatırlatması',
            body: 'Bu hafta henüz evci talebi oluşturmadınız. Lütfen Perşembe gün sonuna kadar talebinizi oluşturun.',
            url: '/student/evci',
          }).catch(() => {});
        } else {
          // Öğrencinin e-postası yoksa velisi(leri)ne gönder
          const parents = await User.find({
            childId: student.id,
            rol: 'parent',
            isActive: true,
          });

          for (const parent of parents) {
            await NotificationService.createNotification({
              userId: parent.id,
              title: 'Evci Talebi Hatırlatması',
              message: `${student.adSoyad} bu hafta henüz evci talebi oluşturmadı. Lütfen kontrol edin.`,
              type: 'reminder',
              priority: 'high',
              category: 'administrative',
              sendEmail: true,
              emailSubject: `Evci Talebi Hatırlatması - ${student.adSoyad}`,
              actionUrl: '/parent/evci',
              actionText: 'Talepleri Görüntüle',
            });

            // Push notification to parent
            PushNotificationService.sendToUser(parent.id, {
              title: 'Evci Talebi Hatırlatması',
              body: `${student.adSoyad} bu hafta henüz evci talebi oluşturmadı. Lütfen kontrol edin.`,
              url: '/parent/evci',
            }).catch(() => {});
          }
        }
      } catch (err) {
        logger.error(`Failed to send evci reminder for student ${student.id}`, { error: err });
      }
    }

    logger.info(`Evci reminders sent successfully for week ${weekOf}`);
  }
}
