import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authenticateJWT, authorizeRoles } from '../../utils/jwt';
import { verifyUploadedFiles } from '../../config/upload';
import {
  resetPassword,
  generatePasswordForUser,
  bulkImport,
  activateBatch,
  regenerateBatch,
  cancelBatch,
  pendingBatches,
  auditLog,
  downloadBatchCredentials,
} from './passwordAdminController';
import {
  validateResetBody,
  validateUserIdParam,
  validateBatchIdParam,
  validateActivateBody,
  validateAuditQuery,
} from './passwordAdminValidators';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // N-M7: defense in depth alongside verifyUploadedFiles magic-byte check.
    if (/\.(xlsx?|XLSX?)$/.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece XLS / XLSX dosyaları kabul edilir'));
    }
  },
});

// N-H1: generous DoS protection only — admins are trusted operators.
const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
const importLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.use(authenticateJWT, authorizeRoles(['admin']), generalLimiter);

router.post('/reset/:userId', validateUserIdParam, validateResetBody, resetPassword);
router.post('/generate/:userId', validateUserIdParam, validateResetBody, generatePasswordForUser);
router.post('/bulk-import', importLimiter, upload.single('file'), verifyUploadedFiles, bulkImport);
router.post('/activate-batch', validateActivateBody, activateBatch);
router.get('/batch/:batchId/credentials.xlsx', validateBatchIdParam, downloadBatchCredentials);
router.post('/batch/:batchId/regenerate', validateBatchIdParam, regenerateBatch);
router.delete('/batch/:batchId', validateBatchIdParam, cancelBatch);
router.get('/batches', pendingBatches);
router.get('/audit', validateAuditQuery, auditLog);

export default router;
