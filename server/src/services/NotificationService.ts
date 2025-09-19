import { Notification, INotification } from '../models/Notification';
import { User } from '../models';
import { sendMail } from '../mailService';
import logger from '../utils/logger';

export interface CreateNotificationData {
  userId?: string;
  recipients?: string[];
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'request' | 'approval' | 'reminder' | 'announcement';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'academic' | 'administrative' | 'social' | 'technical' | 'security' | 'general';
  actionUrl?: string;
  actionText?: string;
  icon?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  relatedEntity?: {
    type: 'user' | 'note' | 'announcement' | 'request' | 'club' | 'event';
    id: string;
  };
  sender?: {
    id: string;
    name: string;
    role: string;
  };
  sendEmail?: boolean;
  emailSubject?: string;
  emailTemplate?: string;
}

export class NotificationService {
  /**
   * Create a single notification
   */
  static async createNotification(data: CreateNotificationData): Promise<INotification> {
    try {
      const notification = new Notification({
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: (data.type as any) || 'info',
        priority: data.priority || 'medium',
        category: (data.category as any) || 'general',
        actionUrl: data.actionUrl,
        actionText: data.actionText,
        icon: data.icon,
        expiresAt: data.expiresAt,
        metadata: data.metadata,
        relatedEntity: data.relatedEntity,
        sender: data.sender,
        sentAt: new Date()
      });

      const savedNotification = await notification.save();

      // Send email if requested
      if (data.sendEmail && data.userId) {
        await this.sendEmailNotification(data.userId, data);
      }

      logger.info('Notification created', {
        notificationId: savedNotification._id,
        userId: data.userId,
        type: data.type,
        priority: data.priority
      });

      return savedNotification;
    } catch (error) {
      logger.error('Error creating notification', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Create notifications for multiple users
   */
  static async createBulkNotifications(data: Omit<CreateNotificationData, 'userId'> & { userIds: string[] }): Promise<INotification[]> {
    try {
      const notifications = data.userIds.map(userId => ({
        userId,
        title: data.title,
        message: data.message,
        type: (data.type as any) || 'info',
        priority: data.priority || 'medium',
        category: (data.category as any) || 'general',
        actionUrl: data.actionUrl,
        actionText: data.actionText,
        icon: data.icon,
        expiresAt: data.expiresAt,
        metadata: data.metadata,
        relatedEntity: data.relatedEntity,
        sender: data.sender,
        sentAt: new Date()
      }));

      const savedNotifications = await Notification.insertMany(notifications);

      // Send emails if requested
      if (data.sendEmail) {
        await Promise.all(
          data.userIds.map(userId => this.sendEmailNotification(userId, data))
        );
      }

      logger.info('Bulk notifications created', {
        count: savedNotifications.length,
        type: data.type,
        priority: data.priority
      });

      return savedNotifications;
    } catch (error) {
      logger.error('Error creating bulk notifications', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Create role-based notifications
   */
  static async createRoleBasedNotifications(data: Omit<CreateNotificationData, 'userId'> & { roles: string[] }): Promise<INotification[]> {
    try {
      // Find users with specified roles
      const users = await User.find({ rol: { $in: data.roles } });
      const userIds = users.map(user => user.id);

      return await this.createBulkNotifications({
        ...data,
        userIds
      });
    } catch (error) {
      logger.error('Error creating role-based notifications', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Send email notification
   */
  static async sendEmailNotification(userId: string, data: CreateNotificationData): Promise<void> {
    try {
      const user = await User.findOne({ id: userId });
      if (!user || !user.email) {
        logger.warn('User not found or no email for notification', { userId });
        return;
      }

      const emailSubject = data.emailSubject || data.title;
      const emailBody = this.generateEmailBody(data);

      await sendMail(user.email, emailSubject, emailBody);

      logger.info('Email notification sent', {
        userId,
        email: user.email,
        subject: emailSubject
      });
    } catch (error) {
      logger.error('Error sending email notification', { error: error.message, userId });
      // Don't throw error to avoid breaking notification creation
    }
  }

  /**
   * Generate email body
   */
  private static generateEmailBody(data: CreateNotificationData): string {
    const priorityColors = {
      low: '#6B7280',
      medium: '#3B82F6',
      high: '#F59E0B',
      urgent: '#EF4444'
    };

    const typeIcons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      request: '📝',
      approval: '👤',
      reminder: '⏰',
      announcement: '📢'
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; text-align: center;">Tofaş Fen Lisesi</h1>
        </div>
        
        <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <span style="font-size: 24px; margin-right: 10px;">${typeIcons[data.type || 'info']}</span>
            <h2 style="margin: 0; color: #1F2937;">${data.title}</h2>
          </div>
          
          <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; line-height: 1.6; color: #374151;">${data.message}</p>
          </div>
          
          ${data.actionUrl && data.actionText ? `
            <div style="text-align: center; margin: 20px 0;">
              <a href="${data.actionUrl}" style="background: ${priorityColors[data.priority || 'medium']}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                ${data.actionText}
              </a>
            </div>
          ` : ''}
          
          <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; margin-top: 20px;">
            <p style="margin: 0; color: #6B7280; font-size: 14px;">
              Bu e-posta Tofaş Fen Lisesi Bilgi Sistemi tarafından gönderilmiştir.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<INotification | null> {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      return await (notification as any).markAsRead();
    } catch (error) {
      logger.error('Error marking notification as read', { error: (error as any).message, notificationId });
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  static async markMultipleAsRead(notificationIds: string[]): Promise<void> {
    try {
      await Notification.updateMany(
        { _id: { $in: notificationIds } },
        { 
          read: true, 
          readAt: new Date() 
        }
      );

      logger.info('Multiple notifications marked as read', { count: notificationIds.length });
    } catch (error) {
      logger.error('Error marking multiple notifications as read', { error: error.message, notificationIds });
      throw error;
    }
  }

  /**
   * Archive notification
   */
  static async archiveNotification(notificationId: string): Promise<INotification | null> {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      return await (notification as any).archive();
    } catch (error) {
      logger.error('Error archiving notification', { error: (error as any).message, notificationId });
      throw error;
    }
  }

  /**
   * Get user notifications with pagination and filters
   */
  static async getUserNotifications(userId: string, options: {
    page?: number;
    limit?: number;
    read?: boolean;
    type?: string;
    category?: string;
    priority?: string;
    includeArchived?: boolean;
  } = {}): Promise<{ notifications: INotification[]; total: number; unreadCount: number }> {
    try {
      const {
        page = 1,
        limit = 20,
        read,
        type,
        category,
        priority,
        includeArchived = false
      } = options;

      const query: any = { userId };
      if (read !== undefined) query.read = read;
      if (type) query.type = type;
      if (category) query.category = category;
      if (priority) query.priority = priority;
      if (!includeArchived) query.archived = false;
      query.$or = [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ];

      const notifications = await Notification.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      const total = await Notification.countDocuments({ userId });
      const unreadCount = await Notification.countDocuments({ userId, read: false, archived: false });

      return { notifications, total, unreadCount };
    } catch (error) {
      logger.error('Error getting user notifications', { error: (error as any).message, userId });
      throw error;
    }
  }

  /**
   * Get unread count for user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      return await Notification.countDocuments({ userId, read: false, archived: false });
    } catch (error) {
      logger.error('Error getting unread count', { error: (error as any).message, userId });
      throw error;
    }
  }

  /**
   * Delete expired notifications
   */
  static async deleteExpiredNotifications(): Promise<number> {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      logger.info('Expired notifications deleted', { count: result.deletedCount });
      return result.deletedCount || 0;
    } catch (error) {
      logger.error('Error deleting expired notifications', { error: error.message });
      throw error;
    }
  }

  /**
   * Create system notification (for automated notifications)
   */
  static async createSystemNotification(data: Omit<CreateNotificationData, 'sender'>): Promise<INotification> {
    return this.createNotification({
      ...data,
      sender: {
        id: 'system',
        name: 'Sistem',
        role: 'system'
      }
    });
  }

  /**
   * Create academic notification (for grades, assignments, etc.)
   */
  static async createAcademicNotification(data: Omit<CreateNotificationData, 'category'>): Promise<INotification> {
    return this.createNotification({
      ...data,
      category: 'academic'
    });
  }

  /**
   * Create administrative notification (for announcements, policies, etc.)
   */
  static async createAdministrativeNotification(data: Omit<CreateNotificationData, 'category'>): Promise<INotification> {
    return this.createNotification({
      ...data,
      category: 'administrative'
    });
  }

  /**
   * Get admin notifications with pagination and filters
   */
  static async getAdminNotifications(options: {
    page?: number;
    limit?: number;
    type?: string;
    category?: string;
    priority?: string;
    read?: boolean;
    search?: string;
  } = {}): Promise<{ notifications: INotification[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        category,
        priority,
        read,
        search
      } = options;

      const query: any = {};
      
      if (type) query.type = type;
      if (category) query.category = category;
      if (priority) query.priority = priority;
      if (read !== undefined) query.read = read;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } }
        ];
      }

      const notifications = await Notification.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      
      const total = await Notification.countDocuments(query);

      return { notifications, total };
    } catch (error) {
      logger.error('Error getting admin notifications', { error: (error as any).message, options });
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(): Promise<{
    total: number;
    unread: number;
    sentToday: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        total,
        unread,
        sentToday,
        byType,
        byCategory,
        byPriority
      ] = await Promise.all([
        Notification.countDocuments({}),
        Notification.countDocuments({ read: false, archived: false }),
        Notification.countDocuments({ 
          createdAt: { $gte: today },
          archived: false 
        }),
        Notification.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        Notification.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        Notification.aggregate([
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ])
      ]);

      return {
        total,
        unread,
        sentToday,
        byType: byType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        byCategory: byCategory.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        byPriority: byPriority.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {})
      };
    } catch (error) {
      logger.error('Error getting notification stats', { error: (error as any).message });
      throw error;
    }
  }

  /**
   * Get notification templates
   */
  static async getTemplates(): Promise<any[]> {
    try {
      // For now, return some default templates
      // In a real implementation, you might have a separate Template model
      return [
        {
          id: '1',
          name: 'Genel Duyuru',
          title: 'Önemli Duyuru',
          message: 'Lütfen dikkatle okuyunuz.',
          type: 'announcement',
          category: 'general',
          priority: 'medium',
          icon: '📢',
          actionText: 'Detayları Görüntüle'
        },
        {
          id: '2',
          name: 'Ödev Hatırlatması',
          title: 'Ödev Teslim Tarihi Yaklaşıyor',
          message: 'Ödevinizin teslim tarihi yaklaşıyor.',
          type: 'reminder',
          category: 'academic',
          priority: 'high',
          icon: '⏰',
          actionText: 'Ödevi Görüntüle'
        },
        {
          id: '3',
          name: 'Sistem Bakımı',
          title: 'Sistem Bakımı Bildirimi',
          message: 'Sistem bakımı nedeniyle hizmet kesintisi yaşanacaktır.',
          type: 'warning',
          category: 'technical',
          priority: 'high',
          icon: '⚠️',
          actionText: 'Detayları Görüntüle'
        }
      ];
    } catch (error) {
      logger.error('Error getting notification templates', { error: (error as any).message });
      throw error;
    }
  }

  /**
   * Create notification template
   */
  static async createTemplate(templateData: any): Promise<any> {
    try {
      // For now, just return the template data with an ID
      // In a real implementation, you would save this to a Template model
      return {
        id: Date.now().toString(),
        ...templateData,
        createdAt: new Date()
      };
    } catch (error) {
      logger.error('Error creating notification template', { error: (error as any).message, templateData });
      throw error;
    }
  }

  /**
   * Mark multiple notifications as unread
   */
  static async markMultipleAsUnread(notificationIds: string[]): Promise<void> {
    try {
      await Notification.updateMany(
        { _id: { $in: notificationIds } },
        { 
          read: false, 
          readAt: undefined 
        }
      );

      logger.info('Multiple notifications marked as unread', { count: notificationIds.length });
    } catch (error) {
      logger.error('Error marking multiple notifications as unread', { error: (error as any).message, notificationIds });
      throw error;
    }
  }

  /**
   * Archive multiple notifications
   */
  static async archiveMultipleNotifications(notificationIds: string[]): Promise<void> {
    try {
      await Notification.updateMany(
        { _id: { $in: notificationIds } },
        { 
          archived: true 
        }
      );

      logger.info('Multiple notifications archived', { count: notificationIds.length });
    } catch (error) {
      logger.error('Error archiving multiple notifications', { error: (error as any).message, notificationIds });
      throw error;
    }
  }

  /**
   * Delete multiple notifications
   */
  static async deleteMultipleNotifications(notificationIds: string[]): Promise<void> {
    try {
      await Notification.deleteMany({ _id: { $in: notificationIds } });

      logger.info('Multiple notifications deleted', { count: notificationIds.length });
    } catch (error) {
      logger.error('Error deleting multiple notifications', { error: (error as any).message, notificationIds });
      throw error;
    }
  }
}
