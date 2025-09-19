import { CalendarEvent, Calendar, ICalendarEvent, ICalendar } from '../models/Calendar';
import { NotificationService } from './NotificationService';
import { User } from '../models/User';

export interface CalendarFilters {
  startDate?: Date;
  endDate?: Date;
  type?: string;
  priority?: string;
  status?: string;
  calendarId?: string;
  search?: string;
}

export interface EventCreateData {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  type: string;
  priority: string;
  color?: string;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: string;
    interval: number;
    endDate?: Date;
    endAfter?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    monthOfYear?: number;
  };
  reminders: {
    type: string;
    minutesBefore: number;
  }[];
  attendees: {
    userId: string;
    role: string;
  }[];
  resources?: {
    room?: string;
    equipment?: string[];
    materials?: string[];
  };
  tags?: string[];
  isPublic: boolean;
  allowedRoles: string[];
  calendarId: string;
}

export class CalendarService {
  // Calendar Management
  static async createCalendar(userId: string, data: {
    name: string;
    description?: string;
    color?: string;
    isDefault?: boolean;
    isPublic?: boolean;
    allowedRoles?: string[];
    settings?: any;
  }): Promise<ICalendar> {
    const calendar = new Calendar({
      id: `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description,
      color: data.color || '#3B82F6',
      isDefault: data.isDefault || false,
      isPublic: data.isPublic || false,
      allowedRoles: data.allowedRoles || [],
      ownerId: userId,
      settings: {
        defaultView: 'month',
        defaultReminder: 15,
        workingHours: {
          start: '08:00',
          end: '17:00',
          days: [1, 2, 3, 4, 5] // Monday-Friday
        },
        timezone: 'Europe/Istanbul',
        ...data.settings
      }
    });

    return await calendar.save();
  }

  static async getUserCalendars(userId: string, userRole: string): Promise<ICalendar[]> {
    const query: any = {
      $or: [
        { ownerId: userId },
        { 'sharedWith.userId': userId },
        { isPublic: true, allowedRoles: { $in: [userRole] } }
      ]
    };

    return await Calendar.find(query).sort({ isDefault: -1, name: 1 });
  }

  static async getCalendarById(calendarId: string, userId: string, userRole: string): Promise<ICalendar | null> {
    const calendar = await Calendar.findOne({ id: calendarId });
    
    if (!calendar) return null;

    // Check access permissions
    if (calendar.ownerId === userId) return calendar;
    if (calendar.sharedWith.some(share => share.userId === userId)) return calendar;
    if (calendar.isPublic && calendar.allowedRoles.includes(userRole)) return calendar;

    return null;
  }

  static async updateCalendar(calendarId: string, userId: string, updates: any): Promise<ICalendar | null> {
    const calendar = await Calendar.findOne({ id: calendarId });
    
    if (!calendar || calendar.ownerId !== userId) return null;

    Object.assign(calendar, updates, { updatedAt: new Date() });
    return await calendar.save();
  }

  static async deleteCalendar(calendarId: string, userId: string): Promise<boolean> {
    const calendar = await Calendar.findOne({ id: calendarId });
    
    if (!calendar || calendar.ownerId !== userId) return false;

    // Delete all events in this calendar
    await CalendarEvent.deleteMany({ calendarId });
    
    // Delete the calendar
    await Calendar.deleteOne({ id: calendarId });
    
    return true;
  }

  static async shareCalendar(calendarId: string, ownerId: string, shareData: {
    userId: string;
    permission: 'read' | 'write' | 'admin';
  }): Promise<boolean> {
    const calendar = await Calendar.findOne({ id: calendarId });
    
    if (!calendar || calendar.ownerId !== ownerId) return false;

    // Check if user exists
    const user = await User.findOne({ id: shareData.userId });
    if (!user) return false;

    // Add or update share
    const existingShareIndex = calendar.sharedWith.findIndex(
      share => share.userId === shareData.userId
    );

    if (existingShareIndex >= 0) {
      calendar.sharedWith[existingShareIndex].permission = shareData.permission;
    } else {
      calendar.sharedWith.push({
        userId: shareData.userId,
        permission: shareData.permission
      });
    }

    await calendar.save();
    return true;
  }

  // Event Management
  static async createEvent(userId: string, eventData: EventCreateData): Promise<ICalendarEvent> {
    // Validate calendar access
    const calendar = await this.getCalendarById(eventData.calendarId, userId, 'admin');
    if (!calendar) {
      throw new Error('Calendar access denied');
    }

    // Check for overlapping events
    const overlappingEvents = await CalendarEvent.find({
      calendarId: eventData.calendarId,
      startDate: { $lt: eventData.endDate },
      endDate: { $gt: eventData.startDate }
    });

    if (overlappingEvents.length > 0) {
      throw new Error('Event overlaps with existing events');
    }

    const event = new CalendarEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...eventData,
      createdBy: userId
    });

    const savedEvent = await event.save();

    // Create recurring events if needed
    if (eventData.isRecurring && eventData.recurringPattern) {
      await this.createRecurringEvents(savedEvent);
    }

    // Send notifications to attendees
    await this.notifyEventAttendees(savedEvent, 'created');

    return savedEvent;
  }

  static async getEvents(
    userId: string,
    userRole: string,
    filters: CalendarFilters = {}
  ): Promise<ICalendarEvent[]> {
    const userCalendars = await this.getUserCalendars(userId, userRole);
    const calendarIds = userCalendars.map(cal => cal.id);

    const query: any = {
      calendarId: { $in: calendarIds },
      $or: [
        { createdBy: userId },
        { 'attendees.userId': userId },
        { isPublic: true, allowedRoles: { $in: [userRole] } }
      ]
    };

    if (filters.startDate && filters.endDate) {
      query.startDate = { $lte: filters.endDate };
      query.endDate = { $gte: filters.startDate };
    }

    if (filters.type) query.type = filters.type;
    if (filters.priority) query.priority = filters.priority;
    if (filters.status) query.status = filters.status;
    if (filters.calendarId) query.calendarId = filters.calendarId;

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { location: { $regex: filters.search, $options: 'i' } }
      ];
    }

    return await CalendarEvent.find(query)
      .sort({ startDate: 1 })
      .populate('attendees.userId', 'adSoyad email');
  }

  static async getEventById(eventId: string, userId: string, userRole: string): Promise<ICalendarEvent | null> {
    const event = await CalendarEvent.findOne({ id: eventId })
      .populate('attendees.userId', 'adSoyad email');

    if (!event) return null;

    // Check access permissions
    const calendar = await this.getCalendarById(event.calendarId, userId, userRole);
    if (!calendar) return null;

    return event;
  }

  static async updateEvent(
    eventId: string,
    userId: string,
    updates: Partial<EventCreateData>
  ): Promise<ICalendarEvent | null> {
    const event = await CalendarEvent.findOne({ id: eventId });
    
    if (!event) return null;

    // Check permissions
    if (event.createdBy !== userId) {
      const calendar = await Calendar.findOne({ id: event.calendarId });
      const share = calendar?.sharedWith.find(s => s.userId === userId);
      if (!share || share.permission === 'read') {
        return null;
      }
    }

    Object.assign(event, updates, { updatedAt: new Date() });
    const updatedEvent = await event.save();

    // Update recurring events if needed
    if (event.isRecurring && updates.recurringPattern) {
      await this.updateRecurringEvents(event);
    }

    // Notify attendees of changes
    await this.notifyEventAttendees(updatedEvent, 'updated');

    return updatedEvent;
  }

  static async deleteEvent(eventId: string, userId: string): Promise<boolean> {
    const event = await CalendarEvent.findOne({ id: eventId });
    
    if (!event || event.createdBy !== userId) return false;

    // Delete recurring events if this is a recurring event
    if (event.isRecurring) {
      await CalendarEvent.deleteMany({
        $or: [
          { id: eventId },
          { parentEventId: eventId }
        ]
      });
    } else {
      await CalendarEvent.deleteOne({ id: eventId });
    }

    // Notify attendees of deletion
    await this.notifyEventAttendees(event, 'deleted');

    return true;
  }

  static async respondToEvent(
    eventId: string,
    userId: string,
    response: 'accepted' | 'declined' | 'tentative'
  ): Promise<boolean> {
    const event = await CalendarEvent.findOne({ id: eventId });
    
    if (!event) return false;

    const attendeeIndex = event.attendees.findIndex(a => a.userId === userId);
    if (attendeeIndex === -1) return false;

    event.attendees[attendeeIndex].response = response;
    await event.save();

    // Notify event organizer
    await this.notifyEventOrganizer(event, 'response', { userId, response });

    return true;
  }

  // Recurring Events
  private static async createRecurringEvents(parentEvent: ICalendarEvent): Promise<void> {
    if (!parentEvent.recurringPattern) return;

    const { frequency, interval, endDate, endAfter } = parentEvent.recurringPattern;
    let currentDate = new Date(parentEvent.startDate);
    let occurrenceCount = 0;

    while (true) {
      // Calculate next occurrence
      switch (frequency) {
        case 'daily':
          currentDate = new Date(currentDate.getTime() + (interval * 24 * 60 * 60 * 1000));
          break;
        case 'weekly':
          currentDate = new Date(currentDate.getTime() + (interval * 7 * 24 * 60 * 60 * 1000));
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + interval);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + interval);
          break;
      }

      // Check end conditions
      if (endDate && currentDate > endDate) break;
      if (endAfter && occurrenceCount >= endAfter) break;

      // Create recurring event
      const eventDuration = parentEvent.endDate.getTime() - parentEvent.startDate.getTime();
      const newStartDate = new Date(currentDate);
      const newEndDate = new Date(currentDate.getTime() + eventDuration);

      const recurringEvent = new CalendarEvent({
        ...parentEvent.toObject(),
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startDate: newStartDate,
        endDate: newEndDate,
        parentEventId: parentEvent.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      delete recurringEvent._id;
      await recurringEvent.save();
      occurrenceCount++;
    }
  }

  private static async updateRecurringEvents(parentEvent: ICalendarEvent): Promise<void> {
    // Delete all existing recurring events
    await CalendarEvent.deleteMany({ parentEventId: parentEvent.id });
    
    // Recreate them with new pattern
    await this.createRecurringEvents(parentEvent);
  }

  // Reminders
  static async processReminders(): Promise<void> {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + (15 * 60 * 1000)); // 15 minutes from now

    const eventsWithReminders = await CalendarEvent.find({
      'reminders.sent': false,
      startDate: { $lte: reminderTime, $gt: now }
    }).populate('attendees.userId', 'adSoyad email');

    for (const event of eventsWithReminders) {
      for (const reminder of event.reminders) {
        if (!reminder.sent) {
          const reminderDate = new Date(event.startDate.getTime() - (reminder.minutesBefore * 60 * 1000));
          
          if (reminderDate <= now) {
            await this.sendReminder(event, reminder);
            reminder.sent = true;
          }
        }
      }
      await event.save();
    }
  }

  private static async sendReminder(event: ICalendarEvent, reminder: any): Promise<void> {
    const attendees = event.attendees.filter(a => a.response !== 'declined');
    
    for (const attendee of attendees) {
      const user = await User.findOne({ id: attendee.userId });
      if (!user) continue;

      const notificationData: any = {
        title: `Hatırlatma: ${event.title}`,
        message: `${event.title} etkinliği ${reminder.minutesBefore} dakika sonra başlayacak.`,
        type: 'reminder',
        priority: 'medium',
        category: 'administrative',
        recipients: [attendee.userId],
        sender: { id: String(event.createdBy), name: 'Calendar', role: 'system' },
        actionUrl: `/calendar/event/${event.id}`
      };

      if (reminder.type === 'email') {
        await NotificationService.sendEmailNotification(user.id, notificationData);
      } else if (reminder.type === 'push') {
        await NotificationService.createNotification(notificationData as any);
      }
    }
  }

  // Notifications
  private static async notifyEventAttendees(event: ICalendarEvent, action: string): Promise<void> {
    const attendees = event.attendees.filter(a => a.userId !== event.createdBy);
    
    for (const attendee of attendees) {
      const notificationData: any = {
        title: `Etkinlik ${action === 'created' ? 'oluşturuldu' : action === 'updated' ? 'güncellendi' : 'silindi'}`,
        message: `${event.title} etkinliği ${action === 'created' ? 'oluşturuldu' : action === 'updated' ? 'güncellendi' : 'silindi'}.`,
        type: 'announcement',
        priority: 'medium',
        category: 'administrative',
        recipients: [attendee.userId],
        sender: { id: String(event.createdBy), name: 'Calendar', role: 'system' },
        actionUrl: `/calendar/event/${event.id}`
      };

      await NotificationService.createNotification(notificationData as any);
    }
  }

  private static async notifyEventOrganizer(event: ICalendarEvent, action: string, data: any): Promise<void> {
    const notificationData: any = {
      title: 'Etkinlik yanıtı',
      message: `Bir katılımcı etkinliğinize yanıt verdi.`,
      type: 'info',
      priority: 'low',
      category: 'administrative',
      recipients: [event.createdBy],
      sender: { id: String(data.userId), name: 'Calendar', role: 'system' },
      actionUrl: `/calendar/event/${event.id}`
    };

    await NotificationService.createNotification(notificationData as any);
  }

  // Analytics
  static async getCalendarStats(userId: string, userRole: string): Promise<any> {
    const userCalendars = await this.getUserCalendars(userId, userRole);
    const calendarIds = userCalendars.map(cal => cal.id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const stats = await CalendarEvent.aggregate([
      {
        $match: {
          calendarId: { $in: calendarIds },
          $or: [
            { createdBy: userId },
            { 'attendees.userId': userId },
            { isPublic: true, allowedRoles: userRole }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          upcomingEvents: {
            $sum: {
              $cond: [
                { $gte: ['$startDate', now] },
                1,
                0
              ]
            }
          },
          eventsThisMonth: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$startDate', startOfMonth] },
                    { $lte: ['$startDate', endOfMonth] }
                  ]
                },
                1,
                0
              ]
            }
          },
          byType: {
            $push: '$type'
          },
          byPriority: {
            $push: '$priority'
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        totalEvents: 0,
        upcomingEvents: 0,
        eventsThisMonth: 0,
        typeDistribution: {},
        priorityDistribution: {}
      };
    }

    const stat = stats[0];
    const typeDistribution = stat.byType.reduce((acc: any, type: string) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const priorityDistribution = stat.byPriority.reduce((acc: any, priority: string) => {
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    return {
      totalEvents: stat.totalEvents,
      upcomingEvents: stat.upcomingEvents,
      eventsThisMonth: stat.eventsThisMonth,
      typeDistribution,
      priorityDistribution
    };
  }
}
