import { param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Doğrulama hatası', details: errors.array() });
  }
  next();
}

export const validateRolloverIdParam = [
  param('rolloverId').isUUID().withMessage('Geçersiz rolloverId'),
  handleValidationErrors,
];
