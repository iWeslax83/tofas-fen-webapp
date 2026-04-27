import { Note } from '../models/Note';
import { User } from '../models/User';

export interface ClassRanking {
  rank: number;
  classSize: number;
}

const EMPTY: ClassRanking = { rank: 0, classSize: 0 };

/**
 * Compute the student's GPA-based ranking within their own class+section.
 * Returns { rank: 0, classSize: 0 } when the student isn't in a class
 * (e.g. teachers/admin) or no notes have been entered yet.
 *
 * MongoDB aggregation pipeline:
 *   $match  → student's class/section
 *   $group  → average per student
 *   $sort   → highest first
 *   findIndex → 1-based rank
 *
 * TODO(PR-09+): wrap in Redis cache (key `ranking:${userId}`, TTL 10m)
 * + invalidate on Note write. Skipping the cache for now to keep the
 * skeleton self-contained.
 */
export async function calculateClassRanking(userId: string): Promise<ClassRanking> {
  const target = await User.findOne({ id: userId }).lean();
  if (!target?.sinif || !target?.sube) return EMPTY;

  const aggregation = await Note.aggregate<{ _id: string; avg: number }>([
    { $match: { gradeLevel: target.sinif, classSection: target.sube } },
    { $group: { _id: '$studentId', avg: { $avg: '$average' } } },
    { $sort: { avg: -1 } },
  ]);

  const idx = aggregation.findIndex((row) => row._id === userId);
  return {
    rank: idx >= 0 ? idx + 1 : 0,
    classSize: aggregation.length,
  };
}
