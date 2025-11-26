import { Request } from 'express';
import { AuditLog, IAuditLog } from '../models/AuditLog';

/**
 * Audit Log Service
 * Handles all audit logging operations
 */
export class AuditLogService {
  /**
   * Get client IP address from request
   */
  private static getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Create an audit log entry
   */
  static async log(
    req: Request,
    action: IAuditLog['action'],
    resourceType: IAuditLog['resourceType'],
    options: {
      resourceId?: string;
      details?: any;
      status?: 'success' | 'failure' | 'error';
      errorMessage?: string;
    } = {}
  ): Promise<void> {
    try {
      const user = (req as any).user;
      
      // If no user in request, try to get from body or params
      const userId = user?.id || user?.userId || options.details?.userId || 'system';
      const userRole = user?.rol || options.details?.userRole || 'system';
      const userName = user?.adSoyad || options.details?.userName || 'System';

      const auditLog = new AuditLog({
        userId,
        userRole,
        userName,
        action,
        resourceType,
        resourceId: options.resourceId,
        details: options.details,
        ipAddress: this.getClientIp(req),
        userAgent: req.headers['user-agent'],
        status: options.status || 'success',
        errorMessage: options.errorMessage
      });

      await auditLog.save();
    } catch (error) {
      // Don't throw error - audit logging should not break the main flow
      console.error('Audit log error:', error);
    }
  }

  /**
   * Log user action
   */
  static async logUserAction(
    req: Request,
    action: IAuditLog['action'],
    resourceType: IAuditLog['resourceType'],
    resourceId?: string,
    details?: any
  ): Promise<void> {
    await this.log(req, action, resourceType, { resourceId, details });
  }

  /**
   * Log error
   */
  static async logError(
    req: Request,
    action: IAuditLog['action'],
    resourceType: IAuditLog['resourceType'],
    errorMessage: string,
    resourceId?: string,
    details?: any
  ): Promise<void> {
    await this.log(req, action, resourceType, {
      resourceId,
      details,
      status: 'error',
      errorMessage
    });
  }

  /**
   * Get audit logs with filters
   */
  static async getLogs(filters: {
    userId?: string;
    userRole?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      userRole,
      action,
      resourceType,
      resourceId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = filters;

    const query: any = {};

    if (userId) query.userId = userId;
    if (userRole) query.userRole = userRole;
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;
    if (resourceId) query.resourceId = resourceId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get audit logs for a specific resource
   */
  static async getResourceLogs(resourceType: string, resourceId: string, limit = 50) {
    return AuditLog.find({
      resourceType,
      resourceId
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get user activity logs
   */
  static async getUserActivityLogs(userId: string, limit = 50) {
    return AuditLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

