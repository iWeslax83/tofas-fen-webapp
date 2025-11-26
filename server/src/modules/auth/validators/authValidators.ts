import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../utils/AppError';

/**
 * Authentication Validators
 * Input validation for authentication endpoints
 */

/**
 * Validation result handler
 */
const handleValidationErrors = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    throw AppError.validation(`Validation failed: ${errorMessages.join(', ')}`);
  }
  next();
};

/**
 * Login validation rules
 */
export const validateLogin = [
  body('id')
    .notEmpty()
    .withMessage('ID gereklidir')
    .isLength({ min: 1, max: 50 })
    .withMessage('ID 1-50 karakter arasında olmalıdır')
    .trim(),
  
  body('sifre')
    .notEmpty()
    .withMessage('Şifre gereklidir')
    .isLength({ min: 1, max: 100 })
    .withMessage('Şifre 1-100 karakter arasında olmalıdır'),
  
  handleValidationErrors
];

/**
 * Refresh token validation rules
 */
export const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token gereklidir')
    .isJWT()
    .withMessage('Geçerli bir refresh token formatı gereklidir'),
  
  handleValidationErrors
];

/**
 * Change password validation rules
 */
export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mevcut şifre gereklidir')
    .isLength({ min: 1, max: 100 })
    .withMessage('Mevcut şifre 1-100 karakter arasında olmalıdır'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('Yeni şifre gereklidir')
    .isLength({ min: 6, max: 100 })
    .withMessage('Yeni şifre 6-100 karakter arasında olmalıdır')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Yeni şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir'),
  
  handleValidationErrors
];

/**
 * Request password reset validation rules
 */
export const validateRequestPasswordReset = [
  body('email')
    .notEmpty()
    .withMessage('Email adresi gereklidir')
    .isEmail()
    .withMessage('Geçerli bir email adresi gereklidir')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('Email adresi 100 karakterden kısa olmalıdır'),
  
  handleValidationErrors
];

/**
 * Reset password validation rules
 */
export const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Token gereklidir')
    .isLength({ min: 32, max: 64 })
    .withMessage('Token 32-64 karakter arasında olmalıdır'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('Yeni şifre gereklidir')
    .isLength({ min: 6, max: 100 })
    .withMessage('Yeni şifre 6-100 karakter arasında olmalıdır')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Yeni şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir'),
  
  handleValidationErrors
];

/**
 * Logout validation rules
 */
export const validateLogout = [
  body('accessToken')
    .optional()
    .isJWT()
    .withMessage('Geçerli bir access token formatı gereklidir'),
  
  body('refreshToken')
    .optional()
    .isJWT()
    .withMessage('Geçerli bir refresh token formatı gereklidir'),
  
  handleValidationErrors
];
