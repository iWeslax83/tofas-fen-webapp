import express from 'express';
import { authRoutes } from './auth';
import { userRoutes } from './users';
import { noteRoutes } from './notes';
import { announcementRoutes } from './announcements';
import { homeworkRoutes } from './homeworks';
import { scheduleRoutes } from './schedules';
import { clubRoutes } from './clubs';
import { notificationRoutes } from './notifications';
import { requestRoutes } from './requests';
import { mealListRoutes } from './mealLists';
import { supervisorListRoutes } from './supervisorLists';
import { maintenanceRequestRoutes } from './maintenanceRequests';
import { evciRequestRoutes } from './evciRequests';
import { analyticsRoutes } from './analytics';
import { reportRoutes } from './reports';
import { calendarRoutes } from './calendars';
import { fileRoutes } from './files';
import { communicationRoutes } from './communication';
import { performanceRoutes } from './performance';
import { monitoringRoutes } from './monitoring';
import { dashboardRoutes } from './dashboard';

const router = express.Router();

// API v1 routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/notes', noteRoutes);
router.use('/announcements', announcementRoutes);
router.use('/homeworks', homeworkRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/clubs', clubRoutes);
router.use('/notifications', notificationRoutes);
router.use('/requests', requestRoutes);
router.use('/meal-lists', mealListRoutes);
router.use('/supervisor-lists', supervisorListRoutes);
router.use('/maintenance-requests', maintenanceRequestRoutes);
router.use('/evci-requests', evciRequestRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportRoutes);
router.use('/calendars', calendarRoutes);
router.use('/files', fileRoutes);
router.use('/communication', communicationRoutes);
router.use('/performance', performanceRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/dashboard', dashboardRoutes);

// API v1 health check
router.get('/health', (req, res) => {
  res.json({
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export { router as v1Routes };
