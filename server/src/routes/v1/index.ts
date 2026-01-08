import express from 'express';
import authRoutes from '../auth';
import userRoutes from '../User';
import noteRoutes from '../Notes';
import announcementRoutes from '../announcements';
import homeworkRoutes from './homeworks';
import scheduleRoutes from '../Schedule';
import clubRoutes from '../clubs';
import notificationRoutes from '../Notification';
import requestRoutes from '../Request';
import mealListRoutes from '../MealList';
import supervisorListRoutes from '../SupervisorList';
import maintenanceRequestRoutes from '../MaintenanceRequest';
import evciRequestRoutes from '../EvciRequest';
import calendarRoutes from '../Calendar';
import communicationRoutes from '../Communication';
import performanceRoutes from '../Performance';
import monitoringRoutes from '../monitoring';
import dashboardRoutes from '../monitoring';

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
router.use('/calendars', calendarRoutes);
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
