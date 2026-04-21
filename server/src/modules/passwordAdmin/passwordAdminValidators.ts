import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { PASSWORD_AUDIT_REASONS } from '../../models';

export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Doğrulama hatası', details: errors.array() });
  }
  next();
}

export const validateResetBody = [
  body('reason').isIn(PASSWORD_AUDIT_REASONS).withMessage('Geçersiz sebep'),
  body('reasonNote')
    .optional()
    .isString()
    .isLength({ max: 280 })
    .withMessage('reasonNote en fazla 280 karakter'),
  handleValidationErrors,
];

export const validateUserIdParam = [
  param('userId').isString().notEmpty().withMessage('userId zorunlu'),
  handleValidationErrors,
];

export const validateBatchIdParam = [
  param('batchId').isUUID().withMessage('Geçersiz batchId'),
  handleValidationErrors,
];

export const validateActivateBody = [
  body('batchId').isUUID().withMessage('Geçersiz batchId'),
  handleValidationErrors,
];

export const validateAuditQuery = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('userId').optional().isString(),
  query('adminId').optional().isString(),
  query('action').optional().isIn(['bulk_import', 'admin_generated', 'admin_reset']),
  query('reason').optional().isIn(PASSWORD_AUDIT_REASONS),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  handleValidationErrors,
];
