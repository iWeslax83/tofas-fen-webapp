import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { User, PasswordAuditReason, PasswordImportBatch, IPasswordImportBatch } from '../../models';
import { generatePassword } from './passwordGenerator';
import { recordPasswordEvent } from './passwordAuditService';
import { parseClassListFile, ParsedStudentRow } from './classListParser';
import { CredentialsRow } from './credentialsExporter';

const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 1 : 10;

export interface AdminContext {
  id: string;
  adSoyad: string;
  ip?: string;
  userAgent?: string;
}

export interface ResetInput {
  userId: string;
  admin: AdminContext;
  reason: PasswordAuditReason;
  reasonNote?: string;
}

export interface PasswordOperationResult {
  password: string;
  userId: string;
}

async function loadUserOrThrow(userId: string) {
  const user = await User.findOne({ id: userId }).select('+sifre');
  if (!user) {
    const err: NodeJS.ErrnoException = new Error(`Kullanıcı bulunamadı: ${userId}`);
    err.code = 'USER_NOT_FOUND';
    throw err;
  }
  return user;
}

export async function resetUserPassword(input: ResetInput): Promise<PasswordOperationResult> {
  const user = await loadUserOrThrow(input.userId);

  await recordPasswordEvent({
    user: { id: user.id, adSoyad: user.adSoyad, rol: user.rol },
    admin: { id: input.admin.id, adSoyad: input.admin.adSoyad },
    action: 'admin_reset',
    reason: input.reason,
    reasonNote: input.reasonNote,
    ip: input.admin.ip,
    userAgent: input.admin.userAgent,
  });

  const password = generatePassword();
  user.sifre = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.passwordLastSetAt = new Date();
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  return { password, userId: user.id };
}

export async function generateUserPassword(input: ResetInput): Promise<PasswordOperationResult> {
  const user = await loadUserOrThrow(input.userId);
  if (user.passwordLastSetAt) {
    const err: NodeJS.ErrnoException = new Error(
      'Kullanıcının zaten bir şifresi var; reset kullanın',
    );
    err.code = 'ALREADY_HAS_PASSWORD';
    throw err;
  }

  await recordPasswordEvent({
    user: { id: user.id, adSoyad: user.adSoyad, rol: user.rol },
    admin: { id: input.admin.id, adSoyad: input.admin.adSoyad },
    action: 'admin_generated',
    reason: input.reason,
    reasonNote: input.reasonNote,
    ip: input.admin.ip,
    userAgent: input.admin.userAgent,
  });

  const password = generatePassword();
  user.sifre = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.passwordLastSetAt = new Date();
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  return { password, userId: user.id };
}

// ─── Batch operations ────────────────────────────────────────────────────────

export interface BulkImportInput {
  fileBuffer: Buffer;
  admin: AdminContext;
}

export interface BulkImportResult {
  batchId: string;
  credentialsRows: CredentialsRow[];
  skipped: string[];
  warnings: string[];
}

export async function previewClassList(buffer: Buffer): Promise<{
  rows: ParsedStudentRow[];
  warnings: string[];
  existingIds: string[];
}> {
  const { rows, warnings } = parseClassListFile(buffer);
  const ids = rows.map((r) => r.id);
  const existing = await User.find({ id: { $in: ids } })
    .select('id')
    .lean();
  return {
    rows,
    warnings,
    existingIds: (existing as unknown as { id: string }[]).map((u) => u.id),
  };
}

async function writeUsersForBatch(
  batchId: string,
  rows: ParsedStudentRow[],
): Promise<{ written: ParsedStudentRow[]; skipped: string[]; passwords: Map<string, string> }> {
  const ids = rows.map((r) => r.id);
  const existing = await User.find({ id: { $in: ids } })
    .select('id')
    .lean();
  const existingSet = new Set((existing as unknown as { id: string }[]).map((u) => u.id));
  const toWrite = rows.filter((r) => !existingSet.has(r.id));
  const passwords = new Map<string, string>();

  const docs = await Promise.all(
    toWrite.map(async (r) => {
      const pw = generatePassword();
      passwords.set(r.id, pw);
      const hash = await bcrypt.hash(pw, BCRYPT_ROUNDS);
      return {
        id: r.id,
        adSoyad: r.adSoyad,
        rol: r.rol,
        sinif: r.sinif,
        sube: r.sube,
        pansiyon: r.pansiyon,
        sifre: hash,
        passwordLastSetAt: new Date(),
        importBatchId: batchId,
        isActive: false,
        childId: [],
        tokenVersion: 0,
      };
    }),
  );

  if (docs.length > 0) {
    await User.insertMany(docs, { ordered: false });
  }

  return { written: toWrite, skipped: [...existingSet], passwords };
}

export async function bulkImportClassList(input: BulkImportInput): Promise<BulkImportResult> {
  const { rows, warnings } = parseClassListFile(input.fileBuffer);
  const batchId = randomUUID();
  const { written, skipped, passwords } = await writeUsersForBatch(batchId, rows);

  await Promise.all(
    written.map((r) =>
      recordPasswordEvent({
        user: { id: r.id, adSoyad: r.adSoyad, rol: r.rol },
        admin: { id: input.admin.id, adSoyad: input.admin.adSoyad },
        action: 'bulk_import',
        reason: 'bulk_import',
        batchId,
        ip: input.admin.ip,
        userAgent: input.admin.userAgent,
      }),
    ),
  );

  await PasswordImportBatch.create({
    batchId,
    adminId: input.admin.id,
    userIds: written.map((r) => r.id),
    totalCount: written.length,
    status: 'pending',
  });

  const credentialsRows: CredentialsRow[] = written.map((r) => ({
    id: r.id,
    adSoyad: r.adSoyad,
    rol: r.rol,
    sinif: r.sinif,
    sube: r.sube,
    pansiyon: r.pansiyon,
    password: passwords.get(r.id)!,
  }));

  return { batchId, credentialsRows, skipped, warnings };
}

async function loadPendingBatchOrThrow(batchId: string): Promise<IPasswordImportBatch> {
  const batch = await PasswordImportBatch.findOne({ batchId });
  if (!batch) {
    const err: NodeJS.ErrnoException = new Error(`Batch bulunamadı: ${batchId}`);
    err.code = 'BATCH_NOT_FOUND';
    throw err;
  }
  if (batch.status !== 'pending') {
    const err: NodeJS.ErrnoException = new Error(`Batch durumu "${batch.status}", işlem yapılamaz`);
    err.code = 'BATCH_NOT_PENDING';
    throw err;
  }
  return batch as IPasswordImportBatch;
}

export async function activateImportBatch(input: {
  batchId: string;
  admin: AdminContext;
}): Promise<{ activated: number }> {
  const batch = await loadPendingBatchOrThrow(input.batchId);
  await User.updateMany({ importBatchId: batch.batchId }, { $set: { isActive: true } });
  batch.status = 'activated';
  batch.activatedAt = new Date();
  await batch.save();
  return { activated: batch.userIds.length };
}

export async function regenerateImportBatchPasswords(input: {
  batchId: string;
  admin: AdminContext;
}): Promise<{ credentialsRows: CredentialsRow[] }> {
  const batch = await loadPendingBatchOrThrow(input.batchId);
  const users = await User.find({ importBatchId: batch.batchId }).lean();

  const now = new Date();
  const entries = await Promise.all(
    users.map(async (user) => {
      const pw = generatePassword();
      const hash = await bcrypt.hash(pw, BCRYPT_ROUNDS);
      return { user, pw, hash };
    }),
  );

  // Bulk-write all password updates in parallel
  await Promise.all(
    entries.map(({ user, hash }) =>
      User.updateOne(
        { id: user.id },
        {
          $set: { sifre: hash, passwordLastSetAt: now },
          $inc: { tokenVersion: 1 },
        },
      ),
    ),
  );

  // Write audit logs in parallel
  await Promise.all(
    entries.map(({ user }) =>
      recordPasswordEvent({
        user: { id: user.id, adSoyad: user.adSoyad, rol: user.rol },
        admin: { id: input.admin.id, adSoyad: input.admin.adSoyad },
        action: 'admin_reset',
        reason: 'bulk_import',
        batchId: batch.batchId,
        ip: input.admin.ip,
        userAgent: input.admin.userAgent,
      }),
    ),
  );

  const credentialsRows: CredentialsRow[] = entries.map(({ user, pw }) => ({
    id: user.id,
    adSoyad: user.adSoyad,
    rol: user.rol,
    sinif: user.sinif,
    sube: user.sube,
    pansiyon: (user.pansiyon as boolean) ?? false,
    password: pw,
  }));

  return { credentialsRows };
}

export async function cancelImportBatch(input: {
  batchId: string;
  admin: AdminContext;
}): Promise<{ cancelled: number }> {
  const batch = await loadPendingBatchOrThrow(input.batchId);
  await User.deleteMany({ importBatchId: batch.batchId });
  batch.status = 'cancelled';
  batch.cancelledAt = new Date();
  await batch.save();
  return { cancelled: batch.userIds.length };
}

export async function listPendingBatches(): Promise<IPasswordImportBatch[]> {
  return PasswordImportBatch.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .lean() as unknown as IPasswordImportBatch[];
}
