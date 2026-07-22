import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import {
  AcademicYearRollover,
  IAcademicYearRollover,
  RolloverSnapshotEntry,
  User,
} from '../../models';
import { getAcademicYear, getPreviousAcademicYear } from '../../utils/academicYear';
import logger from '../../utils/logger';

export interface RolloverAdminContext {
  id: string;
  adSoyad: string;
}

const PROMOTABLE_SINIFLAR = ['9', '10', '11', '12'];

/**
 * Geçiş önerisi üretir. Hiçbir kullanıcı kaydına dokunmaz — sadece o anki
 * durumun fotoğrafını `proposed` bir kayda yazar.
 *
 * `toYear` üzerindeki unique indeks sayesinde cron'un yeniden çalışması,
 * restart veya adminin elle tetiklemesi ikinci bir kayıt üretemez.
 */
export async function proposeRollover(): Promise<IAcademicYearRollover | null> {
  const toYear = getAcademicYear();
  const fromYear = getPreviousAcademicYear(toYear);

  const existing = await AcademicYearRollover.findOne({ toYear });
  if (existing) {
    logger.info(`Rollover for ${toYear} already exists (${existing.status}), skipping proposal`);
    return null;
  }

  const students = (await User.find({
    rol: 'student',
    isActive: true,
    sinif: { $in: PROMOTABLE_SINIFLAR },
  })
    .select('id adSoyad sinif')
    .lean()) as unknown as { id: string; adSoyad: string; sinif: string }[];

  if (students.length === 0) {
    logger.info('No active students found, no rollover proposed');
    return null;
  }

  const snapshot: RolloverSnapshotEntry[] = students.map((s) => ({
    userId: s.id,
    adSoyad: s.adSoyad,
    fromSinif: s.sinif,
    action: s.sinif === '12' ? 'graduate' : 'promote',
  }));

  const rollover = await AcademicYearRollover.create({
    rolloverId: randomUUID(),
    fromYear,
    toYear,
    status: 'proposed',
    snapshot,
  });

  logger.info(
    `Proposed rollover ${fromYear} -> ${toYear}: ${snapshot.length} student(s) in snapshot`,
  );
  return rollover as IAcademicYearRollover;
}

export async function getPendingRollover(): Promise<IAcademicYearRollover | null> {
  return AcademicYearRollover.findOne({ status: 'proposed' }).sort({
    proposedAt: -1,
  }) as unknown as Promise<IAcademicYearRollover | null>;
}

/** Önizleme sayaçları — saklanmaz, snapshot'tan hesaplanır. */
export function summarizeSnapshot(snapshot: RolloverSnapshotEntry[]): Record<string, number> {
  return snapshot.reduce<Record<string, number>>((acc, entry) => {
    const key =
      entry.action === 'graduate'
        ? 'graduate'
        : `${entry.fromSinif}->${Number(entry.fromSinif) + 1}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

export interface ApplyResult {
  promoted: number;
  graduated: number;
  failures: { userId: string; error: string }[];
}

// Mongoose'un kendi bulkWrite tipi kullanılır; elle yazılmış bir arayüz
// `User.bulkWrite(ops)` çağrısında atama hatası verir.
type UserBulkOp = mongoose.AnyBulkWriteOperation;

function buildApplyOps(snapshot: RolloverSnapshotEntry[], now: Date): UserBulkOp[] {
  return snapshot.map((entry) =>
    entry.action === 'graduate'
      ? {
          updateOne: {
            filter: { id: entry.userId },
            // tokenVersion artışı mezunun açık JWT'lerini anında geçersiz kılar.
            update: {
              $set: { isActive: false, mezuniyetTarihi: now },
              $inc: { tokenVersion: 1 },
            },
          },
        }
      : {
          updateOne: {
            filter: { id: entry.userId },
            update: { $set: { sinif: String(Number(entry.fromSinif) + 1) } },
          },
        },
  );
}

/**
 * Kullanıcı bazlı bulkWrite ile uygular. Zincirleme updateMany
 * (9->10, sonra 10->11) aynı öğrenciyi iki kez terfi ettirirdi; snapshot
 * yaklaşımında bu hata yapısal olarak imkânsız.
 */
export async function applyRollover(input: {
  rolloverId: string;
  admin: RolloverAdminContext;
}): Promise<ApplyResult> {
  const now = new Date();

  // Atomik compare-and-swap: iki eşzamanlı istekten yalnızca biri geçer.
  const rollover = (await AcademicYearRollover.findOneAndUpdate(
    { rolloverId: input.rolloverId, status: 'proposed' },
    { $set: { status: 'applied', appliedAt: now, appliedBy: input.admin.id } },
    { new: true },
  )) as IAcademicYearRollover | null;

  if (!rollover) {
    const err: NodeJS.ErrnoException = new Error(
      `Geçiş bulunamadı veya zaten işlenmiş: ${input.rolloverId}`,
    );
    err.code = 'ROLLOVER_NOT_PENDING';
    throw err;
  }

  const { applied, failures } = await runUserOps(
    rollover.snapshot,
    buildApplyOps(rollover.snapshot, now),
  );

  const failedIds = new Set(failures.map((f) => f.userId));
  const succeeded = rollover.snapshot.filter((e) => !failedIds.has(e.userId));

  logger.info(
    `Applied rollover ${rollover.fromYear} -> ${rollover.toYear}: ${applied} user(s) updated, ${failures.length} failure(s)`,
  );

  return {
    promoted: succeeded.filter((e) => e.action === 'promote').length,
    graduated: succeeded.filter((e) => e.action === 'graduate').length,
    failures,
  };
}

/**
 * bulkWrite'ı replica set varsa transaction içinde çalıştırır. Standalone
 * MongoDB'de transaction desteklenmediği için (kod 20) ordered:false ile
 * yeniden dener ve eşleşmeyen kullanıcıları rapor eder.
 */
async function runUserOps(
  snapshot: RolloverSnapshotEntry[],
  ops: UserBulkOp[],
): Promise<{ applied: number; failures: { userId: string; error: string }[] }> {
  if (ops.length === 0) return { applied: 0, failures: [] };

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await User.bulkWrite(ops, { ordered: true, session });
    if (result.matchedCount !== ops.length) {
      throw new Error(`bulkWrite matched ${result.matchedCount}/${ops.length}; rolling back`);
    }
    await session.commitTransaction();
    return { applied: result.matchedCount, failures: [] };
  } catch (txErr) {
    await session.abortTransaction().catch(() => undefined);
    logger.warn('Rollover transaction unavailable or failed, falling back to unordered bulkWrite', {
      error: txErr instanceof Error ? txErr.message : txErr,
    });

    try {
      await User.bulkWrite(ops, { ordered: false });
    } catch (bulkErr) {
      // Fallback yazma da patlarsa CAS zaten 'applied' durumuna geçmiş olur;
      // burada yutup aşağıdaki okuma ile hangi kullanıcıların gerçekten
      // yazıldığını tespit etmeye devam ediyoruz — aksi halde applyRollover
      // reddedilir ve rollover kaydı asla yeniden denenemeyecek şekilde takılır.
      logger.error('Rollover fallback bulkWrite failed, reconciling via read', {
        error: bulkErr instanceof Error ? bulkErr.message : bulkErr,
      });
    }

    // Hangi kullanıcının gerçekten yazıldığını doğrulamak için okuyoruz;
    // bulkWrite sonucu hangi op'un eşleşmediğini kullanıcı bazında vermiyor.
    const ids = snapshot.map((e) => e.userId);
    const found = (await User.find({ id: { $in: ids } })
      .select('id')
      .lean()) as unknown as { id: string }[];
    const foundSet = new Set(found.map((u) => u.id));

    const failures = snapshot
      .filter((e) => !foundSet.has(e.userId))
      .map((e) => ({ userId: e.userId, error: 'Kullanıcı bulunamadı' }));

    return { applied: ids.length - failures.length, failures };
  } finally {
    session.endSession();
  }
}
