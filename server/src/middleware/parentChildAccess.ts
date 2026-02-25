import { Request, Response, NextFunction } from 'express';
import { User } from '../models';

/**
 * Lookup a parent's childId array from the database.
 * Returns the list of student IDs linked to this parent.
 */
export async function getParentChildIds(parentUserId: string): Promise<string[]> {
  const parent = await User.findOne({ id: parentUserId, rol: 'parent' }).select('childId').lean() as any;
  if (!parent || !parent.childId) return [];
  return Array.isArray(parent.childId) ? parent.childId : [parent.childId];
}

/**
 * Middleware factory that verifies parent-child ownership for a given studentId param.
 *
 * @param studentIdSource - Where to read the studentId from. Examples:
 *   'params.studentId'  → req.params.studentId
 *   'body.studentId'    → req.body.studentId
 *   'query.studentId'   → req.query.studentId
 */
export function verifyParentChildAccess(studentIdSource: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const role = user.role;

      // Admin and teacher can access all
      if (role === 'admin' || role === 'teacher') {
        return next();
      }

      // Resolve the studentId from the specified source
      const [source, field] = studentIdSource.split('.');
      let studentId: string | undefined;

      if (source === 'params') studentId = req.params[field];
      else if (source === 'body') studentId = req.body[field];
      else if (source === 'query') studentId = req.query[field] as string;

      if (!studentId) {
        res.status(400).json({ error: 'Student ID is required' });
        return;
      }

      // Student can only access own data
      if (role === 'student') {
        if (studentId !== user.userId) {
          res.status(403).json({ error: 'Bu veriye erişim yetkiniz yok' });
          return;
        }
        return next();
      }

      // Parent must have the student in their childId list
      if (role === 'parent') {
        const childIds = await getParentChildIds(user.userId);
        if (!childIds.includes(studentId)) {
          res.status(403).json({ error: 'Bu öğrencinin verilerine erişim yetkiniz yok' });
          return;
        }
        return next();
      }

      // Any other role - deny
      res.status(403).json({ error: 'Insufficient permissions' });
    } catch (error) {
      console.error('Parent-child access check error:', error);
      res.status(500).json({ error: 'Yetki kontrolü sırasında hata oluştu' });
    }
  };
}
