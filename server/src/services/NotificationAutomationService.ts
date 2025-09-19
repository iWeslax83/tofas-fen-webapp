import { NotificationService } from './NotificationService';
import { User } from '../models';
import logger from '../utils/logger';

export interface AutomationRule {
  id: string;
  name: string;
  event: string;
  conditions: Record<string, any>;
  notification: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'request' | 'approval' | 'reminder' | 'announcement';
    category: 'academic' | 'administrative' | 'social' | 'technical' | 'security' | 'general';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    icon?: string;
    actionUrl?: string;
    actionText?: string;
  };
  recipients: {
    type: 'all' | 'role' | 'specific' | 'event_related';
    roles?: string[];
    userIds?: string[];
  };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationAutomationService {
  private static automationRules: AutomationRule[] = [
    {
      id: '1',
      name: 'Yeni Ödev Eklendi',
      event: 'homework.created',
      conditions: {},
      notification: {
        title: 'Yeni Ödev Eklendi',
        message: 'Yeni bir ödev eklendi. Lütfen kontrol ediniz.',
        type: 'announcement',
        category: 'academic',
        priority: 'medium',
        icon: '📝',
        actionText: 'Ödevi Görüntüle'
      },
      recipients: {
        type: 'role',
        roles: ['student', 'parent']
      },
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'Ödev Teslim Tarihi Yaklaşıyor',
      event: 'homework.due_soon',
      conditions: { daysBefore: 1 },
      notification: {
        title: 'Ödev Teslim Tarihi Yaklaşıyor',
        message: 'Ödevinizin teslim tarihi yaklaşıyor. Lütfen kontrol ediniz.',
        type: 'reminder',
        category: 'academic',
        priority: 'high',
        icon: '⏰',
        actionText: 'Ödevi Görüntüle'
      },
      recipients: {
        type: 'event_related'
      },
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      name: 'Not Güncellendi',
      event: 'grade.updated',
      conditions: {},
      notification: {
        title: 'Not Güncellendi',
        message: 'Yeni bir not güncellendi. Lütfen kontrol ediniz.',
        type: 'info',
        category: 'academic',
        priority: 'medium',
        icon: '📊',
        actionText: 'Notları Görüntüle'
      },
      recipients: {
        type: 'event_related'
      },
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '4',
      name: 'Yeni Duyuru Yayınlandı',
      event: 'announcement.created',
      conditions: {},
      notification: {
        title: 'Yeni Duyuru',
        message: 'Yeni bir duyuru yayınlandı. Lütfen kontrol ediniz.',
        type: 'announcement',
        category: 'administrative',
        priority: 'medium',
        icon: '📢',
        actionText: 'Duyuruyu Görüntüle'
      },
      recipients: {
        type: 'all'
      },
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '5',
      name: 'Kulüp Katılım Onayı',
      event: 'club.membership_approved',
      conditions: {},
      notification: {
        title: 'Kulüp Katılım Onaylandı',
        message: 'Kulüp katılım başvurunuz onaylandı.',
        type: 'success',
        category: 'social',
        priority: 'medium',
        icon: '✅',
        actionText: 'Kulübü Görüntüle'
      },
      recipients: {
        type: 'event_related'
      },
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '6',
      name: 'Sistem Bakımı Uyarısı',
      event: 'system.maintenance',
      conditions: {},
      notification: {
        title: 'Sistem Bakımı',
        message: 'Sistem bakımı nedeniyle hizmet kesintisi yaşanacaktır.',
        type: 'warning',
        category: 'technical',
        priority: 'high',
        icon: '⚠️',
        actionText: 'Detayları Görüntüle'
      },
      recipients: {
        type: 'all'
      },
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  /**
   * Process an event and trigger relevant notifications
   */
  static async processEvent(event: string, data: any): Promise<void> {
    try {
      const relevantRules = this.automationRules.filter(rule => 
        rule.enabled && rule.event === event
      );

      for (const rule of relevantRules) {
        if (await this.evaluateConditions(rule.conditions, data)) {
          await this.triggerNotification(rule, data);
        }
      }
    } catch (error) {
      logger.error('Error processing notification event', { 
        error: (error as any).message, 
        event, 
        data 
      });
    }
  }

  /**
   * Evaluate rule conditions
   */
  private static async evaluateConditions(conditions: Record<string, any>, data: any): Promise<boolean> {
    try {
      // Check days before condition for homework due dates
      if (conditions.daysBefore && data.dueDate) {
        const dueDate = new Date(data.dueDate);
        const now = new Date();
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays <= conditions.daysBefore;
      }

      // Add more condition types as needed
      return true;
    } catch (error) {
      logger.error('Error evaluating notification conditions', { 
        error: (error as any).message, 
        conditions, 
        data 
      });
      return false;
    }
  }

  /**
   * Trigger notification based on rule
   */
  private static async triggerNotification(rule: AutomationRule, data: any): Promise<void> {
    try {
      const notificationData = {
        title: this.interpolateString(rule.notification.title, data),
        message: this.interpolateString(rule.notification.message, data),
        type: rule.notification.type,
        category: rule.notification.category,
        priority: rule.notification.priority,
        icon: rule.notification.icon,
        actionUrl: rule.notification.actionUrl ? this.interpolateString(rule.notification.actionUrl, data) : undefined,
        actionText: rule.notification.actionText,
        sender: {
          id: 'system',
          name: 'Sistem',
          role: 'system'
        }
      };

      // Determine recipients
      let recipients: string[] = [];

      switch (rule.recipients.type) {
        case 'all':
          const allUsers = await User.find({}, 'id');
          recipients = allUsers.map(user => user.id);
          break;
        case 'role':
          if (rule.recipients.roles) {
            const roleUsers = await User.find({ 
              rol: { $in: rule.recipients.roles } 
            }, 'id');
            recipients = roleUsers.map(user => user.id);
          }
          break;
        case 'specific':
          if (rule.recipients.userIds) {
            recipients = rule.recipients.userIds;
          }
          break;
        case 'event_related':
          recipients = await this.getEventRelatedRecipients(rule.event, data);
          break;
      }

      if (recipients.length > 0) {
        await NotificationService.createBulkNotifications({
          ...notificationData,
          userIds: recipients
        });

        logger.info('Automated notification triggered', {
          ruleId: rule.id,
          ruleName: rule.name,
          event: rule.event,
          recipientCount: recipients.length
        });
      }
    } catch (error) {
      logger.error('Error triggering automated notification', { 
        error: (error as any).message, 
        ruleId: rule.id, 
        data 
      });
    }
  }

  /**
   * Get recipients related to the event
   */
  private static async getEventRelatedRecipients(event: string, data: any): Promise<string[]> {
    try {
      switch (event) {
        case 'homework.created':
        case 'homework.due_soon':
          // Get all students and parents
          const students = await User.find({ rol: 'student' }, 'id');
          const parents = await User.find({ rol: 'parent' }, 'id');
          return [...students.map(s => s.id), ...parents.map(p => p.id)];

        case 'grade.updated':
          // Get the specific student and their parent
          if (data.studentId) {
            const student = await User.findOne({ id: data.studentId }, 'id');
            const parent = await User.findOne({ 
              rol: 'parent', 
              // Assuming there's a relationship field
              // This would need to be adjusted based on your data model
            }, 'id');
            
            const recipients = [student?.id].filter(Boolean);
            if (parent) recipients.push(parent.id);
            return recipients;
          }
          break;

        case 'club.membership_approved':
          // Get the specific user who was approved
          if (data.userId) {
            return [data.userId];
          }
          break;

        case 'announcement.created':
        case 'system.maintenance':
          // Get all users
          const allUsers = await User.find({}, 'id');
          return allUsers.map(user => user.id);

        default:
          return [];
      }

      return [];
    } catch (error) {
      logger.error('Error getting event-related recipients', { 
        error: (error as any).message, 
        event, 
        data 
      });
      return [];
    }
  }

  /**
   * Interpolate string with data variables
   */
  private static interpolateString(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * Get all automation rules
   */
  static getRules(): AutomationRule[] {
    return this.automationRules;
  }

  /**
   * Get rule by ID
   */
  static getRule(id: string): AutomationRule | undefined {
    return this.automationRules.find(rule => rule.id === id);
  }

  /**
   * Update rule
   */
  static updateRule(id: string, updates: Partial<AutomationRule>): boolean {
    const index = this.automationRules.findIndex(rule => rule.id === id);
    if (index !== -1) {
      this.automationRules[index] = {
        ...this.automationRules[index],
        ...updates,
        updatedAt: new Date()
      };
      return true;
    }
    return false;
  }

  /**
   * Add new rule
   */
  static addRule(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>): AutomationRule {
    const newRule: AutomationRule = {
      ...rule,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.automationRules.push(newRule);
    return newRule;
  }

  /**
   * Delete rule
   */
  static deleteRule(id: string): boolean {
    const index = this.automationRules.findIndex(rule => rule.id === id);
    if (index !== -1) {
      this.automationRules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Enable/disable rule
   */
  static toggleRule(id: string, enabled: boolean): boolean {
    const rule = this.getRule(id);
    if (rule) {
      rule.enabled = enabled;
      rule.updatedAt = new Date();
      return true;
    }
    return false;
  }
}
