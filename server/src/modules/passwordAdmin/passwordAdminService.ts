import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User, PasswordAuditReason, PasswordImportBatch, IPasswordImportBatch } from '../../models';
import { generatePassword } from './passwordGenerator';
import { recordPasswordEvent } from './passwordAuditService';
import { parseClassListFile, ParsedStudentRow } from './classListParser';
import { buildCredentialsXlsx, CredentialsRow } from './credentialsExporter';

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
  imported: number;
  skipped: string[];
  warnings: string[];
  credentialsFilename: string;
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
  if (rows.length === 0) {
    const err: NodeJS.ErrnoException = new Error('Dosyada içe aktarılacak satır yok');
    err.code = 'EMPTY_IMPORT';
    throw err;
  }
  // rows is already truncated to <= MAX_IMPORT_ROWS by the parser; warnings
  // surface the truncation to the admin.
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

  const credentialsRows: CredentialsRow[] = written.map((r) => ({
    id: r.id,
    adSoyad: r.adSoyad,
    rol: r.rol,
    sinif: r.sinif,
    sube: r.sube,
    pansiyon: r.pansiyon,
    password: passwords.get(r.id)!,
  }));
  passwords.clear();

  const xlsx = await buildCredentialsXlsx(credentialsRows);
  const credentialsFilename = `credentials-${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')}-${batchId}.xlsx`;

  await PasswordImportBatch.create({
    batchId,
    adminId: input.admin.id,
    userIds: written.map((r) => r.id),
    totalCount: written.length,
    status: 'pending',
    credentialsXlsx: xlsx,
    credentialsFilename,
  });

  return {
    batchId,
    imported: written.length,
    skipped,
    warnings,
    credentialsFilename,
  };
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
  // N-H2: atomic compare-and-swap on status. Two concurrent requests can
  // no longer both pass the status check.
  const updated = await PasswordImportBatch.findOneAndUpdate(
    { batchId: input.batchId, status: 'pending' },
    {
      $set: { status: 'activated', activatedAt: new Date() },
      $unset: { credentialsXlsx: '', credentialsFilename: '' },
    },
    { new: true },
  );
  if (!updated) {
    const err: NodeJS.ErrnoException = new Error(
      `Batch bulunamadı veya zaten işlenmiş: ${input.batchId}`,
    );
    err.code = 'BATCH_NOT_PENDING';
    throw err;
  }
  await User.updateMany({ importBatchId: updated.batchId }, { $set: { isActive: true } });
  return { activated: updated.userIds.length };
}

export interface RegenerateResult {
  imported: number;
  failures: { userId: string; error: string }[];
  credentialsFilename: string;
}

export async function regenerateImportBatchPasswords(input: {
  batchId: string;
  admin: AdminContext;
}): Promise<RegenerateResult> {
  // N-H5: previously a Promise.all of updateOne could partially fail and
  // still return a "complete" XLSX. Use bulkWrite + a session when
  // available so partial failures roll back; if the deployment isn't a
  // replica set, fall back to per-row reporting without rollback.
  const batch = await PasswordImportBatch.findOne({
    batchId: input.batchId,
    status: 'pending',
  });
  if (!batch) {
    const err: NodeJS.ErrnoException = new Error(
      `Batch bulunamadı veya bekleyen durumda değil: ${input.batchId}`,
    );
    err.code = 'BATCH_NOT_PENDING';
    throw err;
  }

  const users = await User.find({ importBatchId: batch.batchId }).select('+sifre').lean();
  const now = new Date();

  const entries = await Promise.all(
    users.map(async (user) => {
      const pw = generatePassword();
      const hash = await bcrypt.hash(pw, BCRYPT_ROUNDS);
      return { user, pw, hash };
    }),
  );

  const ops = entries.map(({ user, hash }) => ({
    updateOne: {
      filter: { id: user.id },
      update: {
        $set: { sifre: hash, passwordLastSetAt: now },
        $inc: { tokenVersion: 1 },
      },
    },
  }));

  const session = await mongoose.startSession();
  let succeededIds: string[];
  let failures: { userId: string; error: string }[] = [];
  try {
    session.startTransaction();
    const result = await User.bulkWrite(ops, { ordered: true, session });
    if (result.matchedCount !== users.length) {
      throw new Error(`bulkWrite matched ${result.matchedCount}/${users.length}; rolling back`);
    }
    await session.commitTransaction();
    succeededIds = users.map((u) => u.id);
  } catch (txErr) {
    // Replica-set required for transactions. On standalone Mongo the
    // commit will throw with code 20 — fall back to non-transactional
    // bulkWrite and report failures.
    await session.abortTransaction().catch(() => undefined);
    const fallback = await User.bulkWrite(ops, { ordered: false });
    succeededIds = users.filter((_u, i) => i < (fallback.matchedCount ?? 0)).map((u) => u.id);
    failures = users
      .filter((u) => !succeededIds.includes(u.id))
      .map((u) => ({ userId: u.id, error: 'bulkWrite did not match' }));
    void txErr;
  } finally {
    session.endSession();
  }

  // Audit log — best-effort, separate from the credential write.
  await Promise.all(
    entries
      .filter(({ user }) => succeededIds.includes(user.id))
      .map(({ user }) =>
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

  const credentialsRows: CredentialsRow[] = entries
    .filter(({ user }) => succeededIds.includes(user.id))
    .map(({ user, pw }) => ({
      id: user.id,
      adSoyad: user.adSoyad,
      rol: user.rol,
      sinif: user.sinif,
      sube: user.sube,
      pansiyon: (user.pansiyon as boolean) ?? false,
      password: pw,
    }));

  // Build & persist the XLSX, then drop plaintext from memory.
  const xlsx = await buildCredentialsXlsx(credentialsRows);
  credentialsRows.length = 0;
  const credentialsFilename = `credentials-regen-${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')}-${batch.batchId}.xlsx`;
  await PasswordImportBatch.findOneAndUpdate(
    { batchId: batch.batchId },
    { $set: { credentialsXlsx: xlsx, credentialsFilename } },
  );

  return {
    imported: succeededIds.length,
    failures,
    credentialsFilename,
  };
}

export async function cancelImportBatch(input: {
  batchId: string;
  admin: AdminContext;
}): Promise<{ cancelled: number }> {
  const updated = await PasswordImportBatch.findOneAndUpdate(
    { batchId: input.batchId, status: 'pending' },
    {
      $set: { status: 'cancelled', cancelledAt: new Date() },
      $unset: { credentialsXlsx: '', credentialsFilename: '' },
    },
    { new: true },
  );
  if (!updated) {
    const err: NodeJS.ErrnoException = new Error(
      `Batch bulunamadı veya zaten işlenmiş: ${input.batchId}`,
    );
    err.code = 'BATCH_NOT_PENDING';
    throw err;
  }
  await User.deleteMany({ importBatchId: updated.batchId });
  return { cancelled: updated.userIds.length };
}

export async function listPendingBatches(): Promise<IPasswordImportBatch[]> {
  return PasswordImportBatch.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .lean() as unknown as IPasswordImportBatch[];
}

export async function loadBatchCredentialsXlsx(
  batchId: string,
): Promise<{ buffer: Buffer; filename: string } | null> {
  // No `.lean()` here: lean queries return BSON `Binary` for Buffer paths,
  // which `Buffer.from(...)` reads as an empty buffer. Hydrating through the
  // Mongoose document cast gives us a proper Node Buffer.
  const batch = (await PasswordImportBatch.findOne({ batchId, status: 'pending' }).select(
    '+credentialsXlsx +credentialsFilename',
  )) as (IPasswordImportBatch & { credentialsXlsx?: Buffer; credentialsFilename?: string }) | null;
  if (!batch || !batch.credentialsXlsx || !batch.credentialsFilename) return null;
  return {
    buffer: batch.credentialsXlsx,
    filename: batch.credentialsFilename,
  };
}
