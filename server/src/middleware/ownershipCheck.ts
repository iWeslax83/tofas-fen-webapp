import { Request, Response, NextFunction } from 'express';
import { getParentChildIds } from './parentChildAccess';
import logger from '../utils/logger';

/**
 * Middleware that ensures users can only access their own resources.
 * Admins and teachers bypass this check.
 *
 * @param userIdSource - Where to read the target userId from.
 *   Examples: 'params.userId', 'body.userId', 'query.userId'
 * @param options - Additional options
 *   - allowParentAccess: If true, parents can access their children's resources
 *   - allowedRoles: Additional roles that can bypass the check
 */
export function requireOwnership(
  userIdSource: string,
  options?: {
    allowParentAccess?: boolean;
    allowedRoles?: string[];
  }
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const role = user.role;
      const currentUserId = user.userId;

      // Admin and teacher always pass
      if (role === 'admin' || role === 'teacher') {
        return next();
      }

      // Additional allowed roles
      if (options?.allowedRoles?.includes(role)) {
        return next();
      }

      // Resolve target userId from request
      const [source, field] = userIdSource.split('.');
      let targetUserId: string | undefined;

      if (source === 'params') targetUserId = req.params[field];
      else if (source === 'body') targetUserId = req.body[field];
      else if (source === 'query') targetUserId = req.query[field] as string;

      if (!targetUserId) {
        res.status(400).json({ error: 'User ID gereklidir' });
        return;
      }

      // Direct ownership check
      if (targetUserId === currentUserId) {
        return next();
      }

      // Parent access check
      if (options?.allowParentAccess && role === 'parent') {
        const childIds = await getParentChildIds(currentUserId);
        if (childIds.includes(targetUserId)) {
          return next();
        }
      }

      logger.warn('IDOR attempt blocked', {
        currentUserId,
        targetUserId,
        role,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(403).json({ error: 'Bu veriye erişim yetkiniz yok' });
    } catch (error) {
      logger.error('Ownership check error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Yetki kontrolü sırasında hata oluştu' });
    }
  };
}

/**
 * Middleware that ensures the authenticated user can only access resources
 * that belong to them. Checks the resource's userId/ownerId field after
 * the resource is loaded.
 *
 * Usage: Apply after loading the resource into req (e.g., res.locals.resource).
 */
export function requireResourceOwnership(
  getResourceOwnerId: (req: Request) => string | undefined | Promise<string | undefined>,
  options?: {
    allowParentAccess?: boolean;
  }
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (user.role === 'admin' || user.role === 'teacher') {
        return next();
      }

      const ownerId = await getResourceOwnerId(req);
      if (!ownerId) {
        res.status(404).json({ error: 'Kaynak bulunamadı' });
        return;
      }

      if (ownerId === user.userId) {
        return next();
      }

      if (options?.allowParentAccess && user.role === 'parent') {
        const childIds = await getParentChildIds(user.userId);
        if (childIds.includes(ownerId)) {
          return next();
        }
      }

      logger.warn('Resource IDOR attempt blocked', {
        currentUserId: user.userId,
        resourceOwnerId: ownerId,
        role: user.role,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(403).json({ error: 'Bu kaynağa erişim yetkiniz yok' });
    } catch (error) {
      logger.error('Resource ownership check error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Yetki kontrolü sırasında hata oluştu' });
    }
  };
}
