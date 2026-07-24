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
    // Reject silently with cb(null, false) so the controller's `!req.file`
    // 400 path runs. Calling cb(new Error(...)) instead causes multer to
    // invoke next(err), which jumps straight to the global error handler
    // and surfaces a 500 to the client.
    cb(null, /\.xlsx?$/i.test(file.originalname));
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
