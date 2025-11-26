import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../utils/jwt';
import { requireRole } from '../middleware/auth';
import { AuditLogService } from '../services/auditLogService';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * Get audit logs with filters
 * Only admin can access
 */
router.get(
  '/',
  authenticateJWT,
  requireRole(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      userId,
      userRole,
      action,
      resourceType,
      resourceId,
      status,
      startDate,
      endDate,
      page,
      limit
    } = req.query;

    const filters: any = {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50
    };

    if (userId) filters.userId = userId as string;
    if (userRole) filters.userRole = userRole as string;
    if (action) filters.action = action as string;
    if (resourceType) filters.resourceType = resourceType as string;
    if (resourceId) filters.resourceId = resourceId as string;
    if (status) filters.status = status as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const result = await AuditLogService.getLogs(filters);

    // Log this access
    await AuditLogService.log(req, 'view', 'system', {
      details: { filters }
    });

    res.json({
      success: true,
      ...result
    });
  })
);

/**
 * Get audit logs for a specific resource
 */
router.get(
  '/resource/:resourceType/:resourceId',
  authenticateJWT,
  requireRole(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { resourceType, resourceId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const logs = await AuditLogService.getResourceLogs(resourceType, resourceId, limit);

    res.json({
      success: true,
      logs
    });
  })
);

/**
 * Get user activity logs
 */
router.get(
  '/user/:userId',
  authenticateJWT,
  requireRole(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const logs = await AuditLogService.getUserActivityLogs(userId, limit);

    res.json({
      success: true,
      logs
    });
  })
);

/**
 * Get my activity logs (for current user)
 */
router.get(
  '/me',
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const logs = await AuditLogService.getUserActivityLogs(userId, limit);

    res.json({
      success: true,
      logs
    });
  })
);

export default router;

