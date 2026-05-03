import { Router } from 'express';
import multer from 'multer';
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

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

router.use(authenticateJWT, authorizeRoles(['admin']));

router.post('/reset/:userId', validateUserIdParam, validateResetBody, resetPassword);
router.post('/generate/:userId', validateUserIdParam, validateResetBody, generatePasswordForUser);
router.post('/bulk-import', upload.single('file'), verifyUploadedFiles, bulkImport);
router.post('/activate-batch', validateActivateBody, activateBatch);
router.get('/batch/:batchId/credentials.xlsx', validateBatchIdParam, downloadBatchCredentials);
router.post('/batch/:batchId/regenerate', validateBatchIdParam, regenerateBatch);
router.delete('/batch/:batchId', validateBatchIdParam, cancelBatch);
router.get('/batches', pendingBatches);
router.get('/audit', validateAuditQuery, auditLog);

export default router;
