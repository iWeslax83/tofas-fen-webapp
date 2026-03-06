// Export all models from a single index file
export { User } from './User';
export { default as Note } from './Note';
export { default as Announcement } from './Announcement';
export { Homework } from './Homework';
export { Schedule } from './Schedule';
export { Notification } from './Notification';
export { Request } from './Request';
export { MealList } from './MealList';
export { SupervisorList } from './SupervisorList';
export { EvciRequest } from './EvciRequest';
export { CalendarEvent, Calendar } from './Calendar';
export { Message, Conversation, Email, ChatRoom, Contact } from './Communication';
export { PerformanceMetric, OptimizationLog, PerformanceConfig } from './Performance';
export { AuditLog } from './AuditLog';
export { Dilekce } from './Dilekce';

// Export interfaces for type safety
export type { IUser } from './User';
export type { INote } from './Note';
export type { IAnnouncement } from './Announcement';
export type { IHomework } from './Homework';
export type { ISchedule } from './Schedule';

export type { INotification } from './Notification';
export type { IRequest } from './Request';
export type { IMealList } from './MealList';
export type { ISupervisorList } from './SupervisorList';
export type { IEvciRequest } from './EvciRequest';
export type { ICalendarEvent, ICalendar } from './Calendar';
export type { IMessage, IConversation, IEmail, IChatRoom, IContact } from './Communication';
export type { IPerformanceMetric, IOptimizationLog, IPerformanceConfig } from './Performance';
export type { IAuditLog } from './AuditLog';
export type { IDilekce } from './Dilekce';
export { Registration } from './Registration';
export type { IRegistration } from './Registration';
export { Appointment } from './Appointment';
export type { IAppointment } from './Appointment';
