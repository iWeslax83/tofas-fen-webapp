import express from 'express';
import authRoutes from '../auth';
import userRoutes from '../User';
import noteRoutes from '../Notes';
import announcementRoutes from '../Announcement';
import { homeworkRoutes } from './homeworks';
import scheduleRoutes from '../Schedule';
import notificationRoutes from '../Notification';
import requestRoutes from '../Request';
import mealListRoutes from '../MealList';
import supervisorListRoutes from '../SupervisorList';
import evciRequestRoutes from '../EvciRequest';
import calendarRoutes from '../Calendar';
import communicationRoutes from '../Communication';
import performanceRoutes from '../Performance';
import monitoringRoutes from '../monitoring';
import dashboardRoutes from '../Dashboard';
import dilekceRoutes from '../Dilekce';
import dormitoryRoutes from '../Dormitory';

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/user', userRoutes); // singular alias for client compatibility
router.use('/notes', noteRoutes);
router.use('/announcements', announcementRoutes);
router.use('/homeworks', homeworkRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/schedule', scheduleRoutes); // singular alias
router.use('/notifications', notificationRoutes);
router.use('/requests', requestRoutes);
router.use('/meal-lists', mealListRoutes);
router.use('/supervisor-lists', supervisorListRoutes);
router.use('/evci-requests', evciRequestRoutes);
router.use('/calendars', calendarRoutes);
router.use('/calendar', calendarRoutes); // singular alias
router.use('/communication', communicationRoutes);
router.use('/performance', performanceRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/dilekce', dilekceRoutes);
router.use('/dormitory', dormitoryRoutes);

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
