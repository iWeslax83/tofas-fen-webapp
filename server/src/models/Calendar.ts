import mongoose, { Schema, Document } from 'mongoose';

export interface ICalendarEvent extends Document {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  type: 'class' | 'exam' | 'activity' | 'meeting' | 'holiday' | 'personal' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  color: string;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number; // Every X days/weeks/months/years
    endDate?: Date;
    endAfter?: number; // End after X occurrences
    daysOfWeek?: number[]; // For weekly: [1,3,5] for Monday, Wednesday, Friday
    dayOfMonth?: number; // For monthly: day of month
    monthOfYear?: number; // For yearly: month of year
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
  }[];
  resources: {
    room?: string;
    equipment?: string[];
    materials?: string[];
  };
  tags: string[];
  isPublic: boolean;
  allowedRoles: string[];
  createdBy: string;
  calendarId: string; // Reference to calendar
  parentEventId?: string; // For recurring events
  createdAt: Date;
  updatedAt: Date;
}

export interface ICalendar extends Document {
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
    defaultReminder: number; // minutes before
    workingHours: {
      start: string; // HH:MM
      end: string; // HH:MM
      days: number[]; // [1,2,3,4,5] for Monday-Friday
    };
    timezone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const calendarEventSchema = new Schema<ICalendarEvent>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  allDay: { type: Boolean, default: false },
  location: { type: String, trim: true },
  type: { 
    type: String, 
    required: true,
    enum: ['class', 'exam', 'activity', 'meeting', 'holiday', 'personal', 'reminder']
  },
  priority: { 
    type: String, 
    default: 'medium',
    enum: ['low', 'medium', 'high', 'urgent']
  },
  status: { 
    type: String, 
    default: 'scheduled',
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled']
  },
  color: { type: String, default: '#3B82F6' },
  isRecurring: { type: Boolean, default: false },
  recurringPattern: {
    frequency: { 
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: { type: Number, default: 1, min: 1 },
    endDate: { type: Date },
    endAfter: { type: Number, min: 1 },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0=Sunday, 1=Monday, etc.
    dayOfMonth: { type: Number, min: 1, max: 31 },
    monthOfYear: { type: Number, min: 1, max: 12 }
  },
  reminders: [{
    type: { 
      type: String,
      enum: ['email', 'push', 'sms']
    },
    minutesBefore: { type: Number, required: true, min: 0 },
    sent: { type: Boolean, default: false }
  }],
  attendees: [{
    userId: { type: String, required: true },
    role: { 
      type: String,
      enum: ['organizer', 'attendee', 'optional']
    },
    response: { 
      type: String,
      default: 'pending',
      enum: ['accepted', 'declined', 'pending', 'tentative']
    }
  }],
  resources: {
    room: { type: String },
    equipment: [{ type: String }],
    materials: [{ type: String }]
  },
  tags: [{ type: String, trim: true }],
  isPublic: { type: Boolean, default: false },
  allowedRoles: [{ type: String }],
  createdBy: { type: String, required: true },
  calendarId: { type: String, required: true },
  parentEventId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const calendarSchema = new Schema<ICalendar>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  color: { type: String, default: '#3B82F6' },
  isDefault: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  allowedRoles: [{ type: String }],
  ownerId: { type: String, required: true },
  sharedWith: [{
    userId: { type: String, required: true },
    permission: { 
      type: String,
      enum: ['read', 'write', 'admin']
    }
  }],
  settings: {
    defaultView: { 
      type: String,
      default: 'month',
      enum: ['month', 'week', 'day', 'agenda']
    },
    defaultReminder: { type: Number, default: 15 },
    workingHours: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '17:00' },
      days: [{ type: Number, min: 0, max: 6 }] // Default: Monday-Friday
    },
    timezone: { type: String, default: 'Europe/Istanbul' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for efficient querying
calendarEventSchema.index({ calendarId: 1, startDate: 1, endDate: 1 });
calendarEventSchema.index({ createdBy: 1, startDate: 1 });
calendarEventSchema.index({ attendees: 1, startDate: 1 });
calendarEventSchema.index({ type: 1, startDate: 1 });
calendarEventSchema.index({ isRecurring: 1, parentEventId: 1 });
calendarEventSchema.index({ 'reminders.sent': 1, startDate: 1 });

calendarSchema.index({ ownerId: 1 });
calendarSchema.index({ 'sharedWith.userId': 1 });
calendarSchema.index({ isPublic: 1, allowedRoles: 1 });

// Instance methods
calendarEventSchema.methods.isOverlapping = function(otherEvent: ICalendarEvent): boolean {
  return this.startDate < otherEvent.endDate && this.endDate > otherEvent.startDate;
};

calendarEventSchema.methods.getNextOccurrence = function(): Date | null {
  if (!this.isRecurring || !this.recurringPattern) return null;
  
  const now = new Date();
  const lastOccurrence = this.endDate;
  
  switch (this.recurringPattern.frequency) {
    case 'daily':
      return new Date(lastOccurrence.getTime() + (this.recurringPattern.interval * 24 * 60 * 60 * 1000));
    case 'weekly':
      return new Date(lastOccurrence.getTime() + (this.recurringPattern.interval * 7 * 24 * 60 * 60 * 1000));
    case 'monthly':
      const nextMonth = new Date(lastOccurrence);
      nextMonth.setMonth(nextMonth.getMonth() + this.recurringPattern.interval);
      return nextMonth;
    case 'yearly':
      const nextYear = new Date(lastOccurrence);
      nextYear.setFullYear(nextYear.getFullYear() + this.recurringPattern.interval);
      return nextYear;
    default:
      return null;
  }
};

// Static methods
calendarEventSchema.statics.getEventsForDateRange = function(
  calendarId: string,
  startDate: Date,
  endDate: Date,
  userId?: string
) {
  const query: any = {
    calendarId,
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  };
  
  if (userId) {
    query.$or = [
      { createdBy: userId },
      { 'attendees.userId': userId }
    ];
  }
  
  return this.find(query).sort({ startDate: 1 });
};

calendarEventSchema.statics.getUpcomingReminders = function(minutes: number = 15) {
  const now = new Date();
  const reminderTime = new Date(now.getTime() + (minutes * 60 * 1000));
  
  return this.find({
    'reminders.sent': false,
    startDate: { $lte: reminderTime, $gt: now }
  });
};

export const CalendarEvent = mongoose.model<ICalendarEvent>('CalendarEvent', calendarEventSchema);
export const Calendar = mongoose.model<ICalendar>('Calendar', calendarSchema);
