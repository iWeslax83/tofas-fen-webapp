export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string;
  type: 'class' | 'exam' | 'activity' | 'meeting' | 'holiday' | 'personal' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  color: string;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
    endAfter?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    monthOfYear?: number;
  };
  reminders: {
    type: 'email' | 'push' | 'sms';
    minutesBefore: number;
    sent: boolean;
  }[];
  attendees: {
    userId: string;
    role: 'organizer' | 'attendee' | 'optional';
    response: 'accepted' | 'declined' | 'pending' | 'tentative';
    user?: {
      adSoyad: string;
      email: string;
    };
  }[];
  resources?: {
    room?: string;
    equipment?: string[];
    materials?: string[];
  };
  tags: string[];
  isPublic: boolean;
  allowedRoles: string[];
  createdBy: string;
  calendarId: string;
  parentEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  color: string;
  isDefault: boolean;
  isPublic: boolean;
  allowedRoles: string[];
  ownerId: string;
  sharedWith: {
    userId: string;
    permission: 'read' | 'write' | 'admin';
  }[];
  settings: {
    defaultView: 'month' | 'week' | 'day' | 'agenda';
    defaultReminder: number;
    workingHours: {
      start: string;
      end: string;
      days: number[];
    };
    timezone: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type ViewType = 'month' | 'week' | 'day' | 'agenda';
