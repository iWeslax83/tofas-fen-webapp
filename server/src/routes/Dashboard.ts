import express from 'express';
import { User } from '../models/User';
import { CalendarEvent } from '../models/Calendar';
import { AuditLog } from '../models/AuditLog';
import { requireAuth, requireRole } from '../middleware/auth';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Dashboard Stats Endpoint - admin/teacher only
router.get(
  '/stats',
  requireAuth,
  requireRole(['admin', 'teacher']),
  asyncHandler(async (req, res) => {
    try {
      // Basic counts
      const totalStudents = await User.countDocuments({ rol: 'student' });
      const totalTeachers = await User.countDocuments({ rol: 'teacher' });
      const totalParents = await User.countDocuments({ rol: 'parent' });

      // For now, simple counts or 0 if models complex to query quickly without inspecting
      // Assuming generic query for upcoming events
      const upcomingEvents = await CalendarEvent.countDocuments({
        startDate: { $gte: new Date() },
      }).catch(() => 0); // Fallback if model/query fails

      // Recent activities (last 24h)
      const recentActivities = await AuditLog.countDocuments({
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }).catch(() => 0);

      res.json({
        data: {
          totalStudents,
          totalTeachers,
          totalParents,
          upcomingEvents,
          recentActivities,
        },
      });
    } catch (error) {
      logger.error('Dashboard stats error', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'İstatistikler alınırken hata oluştu' });
    }
  }),
);

export default router;
