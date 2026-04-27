import express from 'express';

// Route imports
import authRoutes from '../modules/auth/routes/authRoutes';
import userRoutes from '../routes/User';
import notificationRoutes from '../routes/Notification';
import requestRoutes from '../routes/Request';
import homeworkRoutes from '../routes/Homework';
import announcementRoutes from '../routes/Announcement';
import notesRoutes from '../routes/Notes';
import evciRequestRoutes from '../routes/EvciRequest';
import dormitoryRoutes from '../routes/Dormitory';
import monitoringRoutes from '../routes/monitoring';
import scheduleRoutes from '../routes/Schedule';
import mealListRoutes from '../routes/MealList';
import supervisorListRoutes from '../routes/SupervisorList';
import calendarRoutes from '../routes/Calendar';
import communicationRoutes from '../routes/Communication';
import performanceRoutes from '../routes/Performance';
import auditLogRoutes from '../routes/AuditLog';
import dilekceRoutes from '../routes/Dilekce';
import pushSubscriptionRoutes from '../routes/PushSubscription';
import registrationRoutes from '../routes/Registration';
import appointmentRoutes from '../routes/Appointment';
import visitorChatRoutes from '../routes/VisitorChat';
import dashboardRoutes from '../routes/Dashboard';
import kvkkRoutes from '../routes/Kvkk';
import passwordAdminRoutes from '../modules/passwordAdmin/passwordAdminRoutes';

/**
 * Register all API routes on the Express app.
 * Extracted from index.ts for modularity.
 */
export function registerRoutes(app: express.Express): void {
  // Authentication
  app.use('/api/auth', authRoutes);

  // Core resources
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/homework', homeworkRoutes);
  app.use('/api/homeworks', homeworkRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/notes', notesRoutes);
  app.use('/api/evci-requests', evciRequestRoutes);
  app.use('/api/dormitory', dormitoryRoutes);
  app.use('/api/schedule', scheduleRoutes);
  app.use('/api/meals', mealListRoutes);
  app.use('/api/supervisors', supervisorListRoutes);
  app.use('/api/monitoring', monitoringRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/communication', communicationRoutes);
  app.use('/api/performance', performanceRoutes);
  app.use('/api/audit-logs', auditLogRoutes);
  app.use('/api/dilekce', dilekceRoutes);
  app.use('/api/push', pushSubscriptionRoutes);
  app.use('/api/registrations', registrationRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/visitor-chat', visitorChatRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // KVKK (Turkish GDPR) compliance routes
  app.use('/api/kvkk', kvkkRoutes);

  // Admin password management
  app.use('/api/admin/passwords', passwordAdminRoutes);
}
