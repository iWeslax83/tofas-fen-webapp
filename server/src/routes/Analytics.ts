import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { AnalyticsService, AnalyticsFilters } from '../services/AnalyticsService';
import { Analytics } from '../models/Analytics';
import { Report } from '../models/Report';
import { User } from '../models/User';
import { Club } from '../models/Club';
import { Calendar } from '../models/Calendar';
import { Notification } from '../models/Notification';
import { Note } from '../models/Note';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Get analytics dashboard overview
router.get('/dashboard', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { startDate, endDate, classLevel, classSection } = req.query;
    
    const filters: AnalyticsFilters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      classLevel: classLevel as string,
      classSection: classSection as string
    };

    // Get all metrics for dashboard
    const [academicMetrics, userMetrics, clubMetrics, systemMetrics] = await Promise.all([
      AnalyticsService.getAcademicMetrics(filters),
      AnalyticsService.getUserMetrics(filters),
      AnalyticsService.getClubMetrics(filters),
      AnalyticsService.getSystemMetrics(filters)
    ]);

    // Calculate summary statistics
    const summary = {
      totalStudents: (userMetrics.classDistribution?.value as any[])?.reduce((sum: number, item: any) => sum + item.count, 0) || 0,
      totalTeachers: (userMetrics.userActivity?.value as any[])?.find((item: any) => item._id === 'teacher')?.count || 0,
      totalClubs: (clubMetrics.clubMembership?.value as any[])?.length || 0,
      averageGrade: (academicMetrics.subjectAverages?.value as any[])?.reduce((sum: number, item: any) => sum + item.average, 0) / ((academicMetrics.subjectAverages?.value as any[])?.length || 1) || 0,
      activeUsers: (userMetrics.userActivity?.value as any[])?.reduce((sum: number, item: any) => sum + item.activeCount, 0) || 0,
      totalNotifications: (systemMetrics.notificationStats?.value as any[])?.reduce((sum: number, item: any) => sum + item.count, 0) || 0
    };

    res.json({
      success: true,
      data: {
        summary,
        academic: academicMetrics,
        user: userMetrics,
        club: clubMetrics,
        system: systemMetrics
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Dashboard analytics fetch failed'
    });
  }
});

// Get academic analytics
router.get('/academic', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const filters: AnalyticsFilters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      classLevel: req.query.classLevel as string,
      classSection: req.query.classSection as string,
      subject: req.query.subject as string,
      teacherId: req.query.teacherId as string,
      studentId: req.query.studentId as string,
      academicYear: req.query.academicYear as string,
      semester: req.query.semester as string
    };

    const metrics = await AnalyticsService.getAcademicMetrics(filters);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching academic analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Academic analytics fetch failed'
    });
  }
});

// Get user analytics
router.get('/user', requireRole(['admin']), async (req, res) => {
  try {
    const filters: AnalyticsFilters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      classLevel: req.query.classLevel as string,
      classSection: req.query.classSection as string,
      role: req.query.role as string
    };

    const metrics = await AnalyticsService.getUserMetrics(filters);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({
      success: false,
      error: 'User analytics fetch failed'
    });
  }
});

// Get club analytics
router.get('/club', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const filters: AnalyticsFilters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      clubId: req.query.clubId as string
    };

    const metrics = await AnalyticsService.getClubMetrics(filters);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching club analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Club analytics fetch failed'
    });
  }
});

// Get system analytics
router.get('/system', requireRole(['admin']), async (req, res) => {
  try {
    const filters: AnalyticsFilters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const metrics = await AnalyticsService.getSystemMetrics(filters);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching system analytics:', error);
    res.status(500).json({
      success: false,
      error: 'System analytics fetch failed'
    });
  }
});

// Generate a new report
router.post('/reports', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const {
      title,
      type,
      category,
      template,
      filters,
      schedule
    } = req.body;

    if (!title || !type || !category || !template) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, type, category, template'
      });
    }

    const analyticsFilters: AnalyticsFilters = {
      startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
      classLevel: filters?.classLevel,
      classSection: filters?.classSection,
      subject: filters?.subject,
      teacherId: filters?.teacherId,
      studentId: filters?.studentId,
      role: filters?.role,
      clubId: filters?.clubId,
      academicYear: filters?.academicYear,
      semester: filters?.semester
    };

    const report = await AnalyticsService.generateReport(
      title,
      type,
      category,
      template,
      analyticsFilters,
      req.user.userId
    );

    // If schedule is provided, update the report
    if (schedule) {
      await Report.findByIdAndUpdate(report._id, {
        schedule: {
          frequency: schedule.frequency,
          nextRun: schedule.nextRun ? new Date(schedule.nextRun) : undefined,
          recipients: schedule.recipients || [],
          emailTemplate: schedule.emailTemplate
        }
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Report generation failed'
    });
  }
});

// Get all reports
router.get('/reports', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      status,
      search
    } = req.query;

    const query: any = { isActive: true };
    
    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$text = { $search: search as string };
    }

    // Check user permissions
    if (req.user.role !== 'admin') {
      query.$or = [
        { generatedBy: req.user.userId },
        { isPublic: true },
        { allowedRoles: req.user.role }
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const [reports, total] = await Promise.all([
      Report.find(query)
        .select('id title description type category status generatedBy generatedAt isPublic allowedRoles isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      Report.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: 'Reports fetch failed'
    });
  }
});

// Get a specific report
router.get('/reports/:id', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const report = await Report.findOne({ 
      id: req.params.id,
      isActive: true
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && 
        report.generatedBy !== req.user.userId && 
        !report.isPublic && 
        !report.allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: 'Report fetch failed'
    });
  }
});

// Update report
router.patch('/reports/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { title, description, isPublic, allowedRoles, schedule } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (allowedRoles !== undefined) updateData.allowedRoles = allowedRoles;
    if (schedule !== undefined) {
      updateData.schedule = {
        frequency: schedule.frequency,
        nextRun: schedule.nextRun ? new Date(schedule.nextRun) : undefined,
        recipients: schedule.recipients || [],
        emailTemplate: schedule.emailTemplate
      };
    }

    const report = await Report.findOneAndUpdate(
      { id: req.params.id, isActive: true },
      updateData,
      { new: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({
      success: false,
      error: 'Report update failed'
    });
  }
});

// Delete report
router.delete('/reports/:id', requireRole(['admin']), async (req, res) => {
  try {
    const report = await Report.findOneAndUpdate(
      { id: req.params.id, isActive: true },
      { isActive: false, status: 'archived' },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      error: 'Report deletion failed'
    });
  }
});

// Export report as PDF/Excel
router.get('/reports/:id/export', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { format = 'pdf' } = req.query;
    
    const report = await Report.findOne({ 
      id: req.params.id,
      isActive: true
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && 
        report.generatedBy !== req.user.userId && 
        !report.isPublic && 
        !report.allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // For now, return the report data
    // In a real implementation, you would generate PDF/Excel files
    res.json({
      success: true,
      data: {
        report,
        format,
        downloadUrl: `/api/analytics/reports/${req.params.id}/download?format=${format}`
      }
    });
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({
      success: false,
      error: 'Report export failed'
    });
  }
});

// Get analytics data by type and period
router.get('/data/:type', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { type } = req.params;
    const { 
      period = 'all-time',
      category,
      metric,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const query: any = { 
      type,
      isActive: true 
    };

    if (period !== 'all-time') query.period = period;
    if (category) query.category = category;
    if (metric) query.metric = metric;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const [data, total] = await Promise.all([
      Analytics.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      Analytics.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        analytics: data,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({
      success: false,
      error: 'Analytics data fetch failed'
    });
  }
});

// Save analytics data
router.post('/data', requireRole(['admin']), async (req, res) => {
  try {
    const {
      type,
      category,
      metric,
      value,
      period = 'all-time',
      filters = {},
      metadata = {}
    } = req.body;

    if (!type || !category || !metric || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, category, metric, value'
      });
    }

    await AnalyticsService.saveAnalytics(
      type,
      category,
      metric,
      value,
      period,
      filters,
      metadata
    );

    res.json({
      success: true,
      message: 'Analytics data saved successfully'
    });
  } catch (error) {
    console.error('Error saving analytics data:', error);
    res.status(500).json({
      success: false,
      error: 'Analytics data save failed'
    });
  }
});

// Get analytics summary
router.get('/summary', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filters: AnalyticsFilters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    };

    // Get quick summary metrics
    const [
      totalStudents,
      totalTeachers,
      totalClubs,
      totalNotifications,
      averageGrade
    ] = await Promise.all([
      User.countDocuments({ rol: 'student', isActive: true }),
      User.countDocuments({ rol: 'teacher', isActive: true }),
      Club.countDocuments({ isActive: true }),
      Notification.countDocuments(),
      Note.aggregate([
        { $group: { _id: null, avg: { $avg: '$average' } } }
      ]).then(result => result[0]?.avg || 0)
    ]);

    res.json({
      success: true,
      data: {
        totalStudents,
        totalTeachers,
        totalClubs,
        totalNotifications,
        averageGrade: Math.round(averageGrade * 100) / 100,
        period: {
          startDate: filters.startDate,
          endDate: filters.endDate
        }
      }
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Analytics summary fetch failed'
    });
  }
});

// Get real-time analytics
router.get('/realtime', requireRole(['admin']), async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      recentLogins,
      recentNotifications,
      recentGrades,
      activeUsers
    ] = await Promise.all([
      User.countDocuments({ lastLogin: { $gte: oneHourAgo } }),
      Notification.countDocuments({ createdAt: { $gte: oneHourAgo } }),
      Note.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      User.countDocuments({ lastLogin: { $gte: oneDayAgo } })
    ]);

    res.json({
      success: true,
      data: {
        recentLogins,
        recentNotifications,
        recentGrades,
        activeUsers,
        timestamp: now
      }
    });
  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Real-time analytics fetch failed'
    });
  }
});

// General dashboard stats endpoint
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [
      totalStudents,
      totalTeachers,
      totalParents,
      activeClubs,
      upcomingEvents,
      unreadNotifications,
      recentActivities
    ] = await Promise.all([
      User.countDocuments({ rol: 'student', isActive: true }),
      User.countDocuments({ rol: 'teacher', isActive: true }),
      User.countDocuments({ rol: 'parent', isActive: true }),
      Club.countDocuments({ isActive: true }),
      Calendar.countDocuments({ 
        startDate: { $gte: new Date() },
        endDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // Next 7 days
      }),
      Notification.countDocuments({ 
        isRead: false,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }),
      Notification.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      })
    ]);

    res.json({
      success: true,
      data: {
        totalStudents,
        totalTeachers,
        totalParents,
        activeClubs,
        upcomingEvents,
        unreadNotifications,
        recentActivities
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Dashboard stats fetch failed'
    });
  }
});

export default router;
