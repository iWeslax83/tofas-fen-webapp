/**
 * One-time migration for the "student-scoped parent account" model.
 *
 * Old model: personal parent accounts, manually linked to one or more
 * students via linkParentChild / bulk file import.
 * New model: exactly one auto-generated shared account per student,
 * id = 'V' + studentId. Both parents log in with that single account.
 *
 * This script:
 *   1. Finds every active student missing its V<id> account and creates one
 *      (random password, printed once so it can be handed to the school).
 *   2. Resyncs pansiyon/isActive/childId on every existing V<id> account so
 *      it matches its student (covers accounts that went stale before the
 *      pansiyon-resync fix landed in UserService.updateUser/updateUserLegacy).
 *   3. Finds legacy personal parent accounts (rol:'parent', id not starting
 *      with 'V') and deactivates them — never deletes, so nothing is lost if
 *      this needs to be reviewed later.
 *
 * Defaults to a dry run. Nothing is written unless CONFIRM=yes is set,
 * because MONGODB_URI in this repo's server/.env points at the live Atlas
 * cluster by default — same footgun as seed.ts. Always double check
 * MONGODB_URI before running this for real.
 *
 *   npm run backfill-parent-accounts                # dry run, no writes
 *   CONFIRM=yes npm run backfill-parent-accounts     # actually writes
 */
import '../config/environment';
import { connectDB, closeDB } from '../db';
import { User } from '../models/User';
import { ensureParentAccountForStudent, parentAccountIdForStudent } from '../services/UserService';

const CONFIRM = process.env.CONFIRM === 'yes';

async function backfillParentAccounts(): Promise<void> {
  await connectDB();

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tofas-fen';
  const redactedHost = uri.replace(/\/\/[^@]*@/, '//<credentials>@');
  console.log(`Target database: ${redactedHost}`);
  console.log(CONFIRM ? 'Mode: WRITE (CONFIRM=yes)' : 'Mode: DRY RUN (set CONFIRM=yes to write)');
  console.log('');

  const students = (await User.find({ rol: 'student' })
    .select('id adSoyad isActive pansiyon')
    .lean()) as Array<{ id: string; adSoyad: string; isActive: boolean; pansiyon: boolean }>;

  let created = 0;
  let resynced = 0;
  let alreadyInSync = 0;
  let conflicts = 0;
  const createdReport: Array<{ studentId: string; parentId: string; password?: string }> = [];
  const resyncReport: Array<{ studentId: string; parentId: string; pansiyon: boolean }> = [];

  for (const student of students) {
    const parentId = parentAccountIdForStudent(student.id);
    const existing = await User.findOne({ id: parentId })
      .select('rol pansiyon isActive childId')
      .lean<{ rol?: string; pansiyon?: boolean; isActive?: boolean; childId?: string[] } | null>();

    if (existing && existing.rol !== 'parent') {
      conflicts++;
      console.warn(
        `CONFLICT: ${parentId} already exists with rol=${existing.rol}, expected 'parent' (student ${student.id})`,
      );
      continue;
    }

    const studentPansiyon = student.pansiyon ?? false;
    const needsResync =
      !!existing &&
      (existing.pansiyon !== studentPansiyon ||
        existing.isActive !== student.isActive ||
        !existing.childId?.includes(student.id));

    if (existing && !needsResync) {
      alreadyInSync++;
      continue;
    }

    if (!CONFIRM) {
      if (existing) {
        resynced++;
        resyncReport.push({ studentId: student.id, parentId, pansiyon: studentPansiyon });
      } else {
        created++;
        createdReport.push({ studentId: student.id, parentId });
      }
      continue;
    }

    const result = await ensureParentAccountForStudent(
      student.id,
      student.adSoyad,
      student.isActive,
    );
    if (result.created) {
      created++;
      createdReport.push({
        studentId: student.id,
        parentId: result.parentId,
        password: result.generatedPassword,
      });
    } else if (result.conflict) {
      conflicts++;
    } else if (existing) {
      resynced++;
      resyncReport.push({ studentId: student.id, parentId, pansiyon: studentPansiyon });
    } else {
      alreadyInSync++;
    }
  }

  console.log(`\nStudents scanned: ${students.length}`);
  console.log(`V-accounts already in sync: ${alreadyInSync}`);
  console.log(`V-accounts ${CONFIRM ? 'created' : 'to be created'}: ${created}`);
  console.log(
    `V-accounts ${CONFIRM ? 'resynced' : 'to be resynced'} (stale pansiyon/isActive/childId): ${resynced}`,
  );
  if (conflicts > 0) console.log(`Conflicts (id taken by a non-parent user): ${conflicts}`);
  if (resyncReport.length > 0) {
    console.log('\n--- Resynced parent accounts ---');
    for (const row of resyncReport) {
      console.log(`${row.parentId} (student ${row.studentId}): pansiyon=${row.pansiyon}`);
    }
  }

  if (createdReport.length > 0) {
    console.log('\n--- New parent accounts (save this — passwords are shown once) ---');
    for (const row of createdReport) {
      console.log(
        row.password
          ? `${row.parentId} (student ${row.studentId}): ${row.password}`
          : `${row.parentId} (student ${row.studentId}): [dry run — no password generated]`,
      );
    }
  }

  // Legacy personal parent accounts: anything with rol:'parent' whose id
  // doesn't follow the V<studentId> convention. Deactivate, don't delete —
  // reversible if something here needs manual review.
  const legacyParents = (await User.find({
    rol: 'parent',
    id: { $not: /^V/ },
  })
    .select('id adSoyad childId isActive')
    .lean()) as Array<{ id: string; adSoyad: string; childId?: string[]; isActive: boolean }>;

  console.log(`\nLegacy personal parent accounts found: ${legacyParents.length}`);
  for (const legacy of legacyParents) {
    console.log(
      `${legacy.id} (${legacy.adSoyad}) — children: ${(legacy.childId || []).join(', ') || 'none'} — isActive: ${legacy.isActive}`,
    );
  }

  if (CONFIRM && legacyParents.length > 0) {
    const ids = legacyParents.map((p) => p.id);
    await User.updateMany({ id: { $in: ids } }, { $set: { isActive: false } });
    console.log(`\nDeactivated ${ids.length} legacy parent account(s).`);
  } else if (legacyParents.length > 0) {
    console.log('\n(dry run — legacy accounts not deactivated)');
  }

  await closeDB();
}

backfillParentAccounts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
