import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateJWT, authorizeRoles } from '../../utils/jwt';
import { pendingRollover, propose, apply, rollback, cancel } from './academicYearController';
import { validateRolloverIdParam } from './academicYearValidators';

// Adminler güvenilen operatörler — sadece DoS koruması.
const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.use(authenticateJWT, authorizeRoles(['admin']), generalLimiter);

router.get('/rollover/pending', pendingRollover);
router.post('/rollover/propose', propose);
router.post('/rollover/:rolloverId/apply', validateRolloverIdParam, apply);
router.post('/rollover/:rolloverId/rollback', validateRolloverIdParam, rollback);
router.delete('/rollover/:rolloverId', validateRolloverIdParam, cancel);

export default router;
