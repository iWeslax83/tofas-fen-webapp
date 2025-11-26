import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../services/auditLogService';

/**
 * Audit Log Middleware
 * Automatically logs certain actions
 */
export const auditLogMiddleware = (
  action: string,
  resourceType: string,
  getResourceId?: (req: Request) => string | undefined
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to log after response
    res.json = function (body: any) {
      // Log the action
      const resourceId = getResourceId ? getResourceId(req) : undefined;
      
      // Determine status based on response
      let status: 'success' | 'failure' | 'error' = 'success';
      if (res.statusCode >= 400 && res.statusCode < 500) {
        status = 'failure';
      } else if (res.statusCode >= 500) {
        status = 'error';
      }

      AuditLogService.log(req, action as any, resourceType as any, {
        resourceId,
        status,
        details: {
          statusCode: res.statusCode,
          response: body
        }
      }).catch(err => {
        console.error('Audit log middleware error:', err);
      });

      // Call original json method
      return originalJson(body);
    };

    next();
  };
};

