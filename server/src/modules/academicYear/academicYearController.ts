import { Request, Response } from 'express';
import {
  proposeRollover,
  getPendingRollover,
  applyRollover,
  rollbackRollover,
  cancelRollover,
  summarizeSnapshot,
  RolloverAdminContext,
} from './academicYearService';
import { IAcademicYearRollover, User } from '../../models';
import logger from '../../utils/logger';
import { asyncHandler } from '../../middleware/errorHandler';

async function getAdminContext(req: Request): Promise<RolloverAdminContext> {
  const anyReq = req as unknown as { user?: { userId?: string } };
  const userId = anyReq.user?.userId;
  if (!userId) {
    throw new Error('Authenticated admin user missing on request');
  }
  const admin = await User.findOne({ id: userId }).select('id adSoyad').lean();
  if (!admin) {
    throw new Error('Admin user not found in database');
  }
  return {
    id: (admin as unknown as { id: string }).id,
    adSoyad: (admin as unknown as { adSoyad: string }).adSoyad,
  };
}

function httpStatusForCode(code?: string): number {
  switch (code) {
    case 'ROLLOVER_NOT_PENDING':
    case 'ROLLOVER_NOT_APPLIED':
    case 'ROLLOVER_NOT_REVERSIBLE':
      return 409;
    default:
      return 500;
  }
}

function handleServiceError(err: unknown, res: Response) {
  const e = err as NodeJS.ErrnoException;
  const status = httpStatusForCode(e.code);
  if (status >= 500) {
    logger.error('academicYear service error', { code: e.code, message: e.message });
  } else {
    logger.warn('academicYear domain error', { code: e.code, message: e.message });
  }
  res.status(status).json({ error: e.message, code: e.code });
}

function serializeRollover(rollover: IAcademicYearRollover) {
  return {
    rolloverId: rollover.rolloverId,
    fromYear: rollover.fromYear,
    toYear: rollover.toYear,
    status: rollover.status,
    proposedAt: rollover.proposedAt,
    appliedAt: rollover.appliedAt,
    counts: summarizeSnapshot(rollover.snapshot),
    snapshot: rollover.snapshot,
  };
}

export const pendingRollover = asyncHandler(async (_req, res) => {
  try {
    const rollover = await getPendingRollover();
    res.json({ rollover: rollover ? serializeRollover(rollover) : null });
  } catch (err) {
    handleServiceError(err, res);
  }
});

export const propose = asyncHandler(async (_req, res) => {
  try {
    const rollover = await proposeRollover();
    res.json({ rollover: rollover ? serializeRollover(rollover) : null });
  } catch (err) {
    handleServiceError(err, res);
  }
});

export const apply = asyncHandler(async (req, res) => {
  try {
    const admin = await getAdminContext(req);
    const result = await applyRollover({ rolloverId: req.params.rolloverId, admin });
    res.json(result);
  } catch (err) {
    handleServiceError(err, res);
  }
});

export const rollback = asyncHandler(async (req, res) => {
  try {
    const admin = await getAdminContext(req);
    const result = await rollbackRollover({ rolloverId: req.params.rolloverId, admin });
    res.json(result);
  } catch (err) {
    handleServiceError(err, res);
  }
});

export const cancel = asyncHandler(async (req, res) => {
  try {
    const admin = await getAdminContext(req);
    const result = await cancelRollover({ rolloverId: req.params.rolloverId, admin });
    res.json(result);
  } catch (err) {
    handleServiceError(err, res);
  }
});
