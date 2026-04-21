import { Request, Response, NextFunction } from 'express';
import {
  resetUserPassword,
  generateUserPassword,
  bulkImportClassList,
  activateImportBatch,
  regenerateImportBatchPasswords,
  cancelImportBatch,
  listPendingBatches,
  previewClassList,
  AdminContext,
} from './passwordAdminService';
import { queryAuditLog } from './passwordAuditService';
import { buildCredentialsXlsx } from './credentialsExporter';
import { User } from '../../models';

async function getAdminContext(req: Request): Promise<AdminContext> {
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
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

function setNoStore(res: Response) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
}

function httpStatusForCode(code?: string): number {
  switch (code) {
    case 'USER_NOT_FOUND':
    case 'BATCH_NOT_FOUND':
      return 404;
    case 'ALREADY_HAS_PASSWORD':
    case 'BATCH_NOT_PENDING':
      return 409;
    default:
      return 500;
  }
}

function handleServiceError(err: unknown, res: Response) {
  const e = err as NodeJS.ErrnoException;
  const status = httpStatusForCode(e.code);
  res.status(status).json({ error: e.message, code: e.code });
}

export async function resetPassword(req: Request, res: Response, _next: NextFunction) {
  try {
    const admin = await getAdminContext(req);
    const result = await resetUserPassword({
      userId: req.params.userId,
      admin,
      reason: req.body.reason,
      reasonNote: req.body.reasonNote,
    });
    setNoStore(res);
    res.json({ password: result.password, userId: result.userId });
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function generatePasswordForUser(req: Request, res: Response) {
  try {
    const admin = await getAdminContext(req);
    const result = await generateUserPassword({
      userId: req.params.userId,
      admin,
      reason: req.body.reason ?? 'new_user',
      reasonNote: req.body.reasonNote,
    });
    setNoStore(res);
    res.json({ password: result.password, userId: result.userId });
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function bulkImport(req: Request, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi' });
    const admin = await getAdminContext(req);

    if (req.query.preview === 'true') {
      const preview = await previewClassList(req.file.buffer);
      return res.json({
        total: preview.rows.length,
        warnings: preview.warnings,
        existingIds: preview.existingIds,
        sample: preview.rows.slice(0, 20),
        classDistribution: preview.rows.reduce<Record<string, number>>((acc, r) => {
          const k = `${r.sinif}${r.sube}`;
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
      });
    }

    const result = await bulkImportClassList({ fileBuffer: req.file.buffer, admin });
    const xlsx = await buildCredentialsXlsx(result.credentialsRows);
    setNoStore(res);
    res.json({
      batchId: result.batchId,
      imported: result.credentialsRows.length,
      skipped: result.skipped,
      warnings: result.warnings,
      credentialsFileBase64: xlsx.toString('base64'),
      credentialsFilename: `credentials-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${result.batchId}.xlsx`,
    });
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function activateBatch(req: Request, res: Response) {
  try {
    const admin = await getAdminContext(req);
    const result = await activateImportBatch({ batchId: req.body.batchId, admin });
    res.json(result);
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function regenerateBatch(req: Request, res: Response) {
  try {
    const admin = await getAdminContext(req);
    const result = await regenerateImportBatchPasswords({ batchId: req.params.batchId, admin });
    const xlsx = await buildCredentialsXlsx(result.credentialsRows);
    setNoStore(res);
    res.json({
      imported: result.credentialsRows.length,
      credentialsFileBase64: xlsx.toString('base64'),
      credentialsFilename: `credentials-regen-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${req.params.batchId}.xlsx`,
    });
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function cancelBatch(req: Request, res: Response) {
  try {
    const admin = await getAdminContext(req);
    const result = await cancelImportBatch({ batchId: req.params.batchId, admin });
    res.json(result);
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function pendingBatches(_req: Request, res: Response) {
  try {
    const items = await listPendingBatches();
    res.json({ items });
  } catch (err) {
    handleServiceError(err, res);
  }
}

export async function auditLog(req: Request, res: Response) {
  try {
    const result = await queryAuditLog({
      userId: req.query.userId as string | undefined,
      adminId: req.query.adminId as string | undefined,
      action: req.query.action as undefined | 'bulk_import' | 'admin_generated' | 'admin_reset',
      reason: req.query.reason as
        | undefined
        | 'forgot'
        | 'security'
        | 'new_user'
        | 'bulk_import'
        | 'other',
      from: req.query.from ? new Date(String(req.query.from)) : undefined,
      to: req.query.to ? new Date(String(req.query.to)) : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json(result);
  } catch (err) {
    handleServiceError(err, res);
  }
}
