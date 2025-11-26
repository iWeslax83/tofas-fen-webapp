/**
 * Analytics Routes
 * User behavior tracking and feedback endpoints
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getAnalyticsService } from '../services/AnalyticsService';

const router = Router();

// Track page view
router.post('/track', requireAuth, async (req: Request, res: Response) => {
  try {
    const { path, metadata } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?._id?.toString();

    await getAnalyticsService().trackPageView(userId, path, metadata);

    res.json({ success: true, message: 'Event tracked' });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

// Track user action
router.post('/action', requireAuth, async (req: Request, res: Response) => {
  try {
    const { action, metadata } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?._id?.toString();

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    await getAnalyticsService().trackUserAction(userId, action, metadata);

    res.json({ success: true, message: 'Action tracked' });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

// Get user behavior metrics
router.get('/metrics', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?._id?.toString();
    const { startDate, endDate } = req.query;

    const metrics = await getAnalyticsService().getUserBehaviorMetrics(
      userId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({ success: true, data: metrics });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

// Submit feedback
router.post('/feedback', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?._id?.toString();

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { type, category, title, description, priority, metadata } = req.body;

    if (!type || !category || !title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, category, title, description',
      });
    }

    const feedback = await getAnalyticsService().submitFeedback({
      userId,
      type,
      category,
      title,
      description,
      priority: priority || 'medium',
      metadata,
    });

    res.json({ success: true, data: feedback });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

// Get feedback list
router.get('/feedback', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || (req as any).user?._id?.toString();
    const { type, status, priority } = req.query;

    const filters: any = {};
    if (userId && (req as any).user?.role !== 'admin' && (req as any).user?.rol !== 'admin') {
      filters.userId = userId; // Users can only see their own feedback
    }
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (priority) filters.priority = priority;

    const feedback = await getAnalyticsService().getFeedback(filters);

    res.json({ success: true, data: feedback });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

// Get system analytics (admin only)
router.get('/system', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const analytics = await getAnalyticsService().getSystemAnalytics();

    res.json({ success: true, data: analytics });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

export default router;
