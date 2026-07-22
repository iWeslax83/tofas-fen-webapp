import { randomUUID } from 'crypto';
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
