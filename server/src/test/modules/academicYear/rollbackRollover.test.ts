import { describe, it, expect, beforeEach } from 'vitest';
import { AcademicYearRollover, User } from '../../../models';
import {
  proposeRollover,
  applyRollover,
  rollbackRollover,
  cancelRollover,
} from '../../../modules/academicYear/academicYearService';

const admin = { id: 'admin_1', adSoyad: 'Test Admin' };

async function createStudent(id: string, sinif: string) {
  await User.create({
    id,
    adSoyad: `Öğrenci ${id}`,
    rol: 'student',
    sinif,
    sube: 'A',
    isActive: true,
    tokenVersion: 3,
    childId: [],
  });
}

describe('rollbackRollover', () => {
  let rolloverId: string;

  beforeEach(async () => {
    await createStudent('s9', '9');
    await createStudent('s12', '12');
    rolloverId = (await proposeRollover())!.rolloverId;
    await applyRollover({ rolloverId, admin });
  });

  it('sınıf seviyelerini geri alır', async () => {
    await rollbackRollover({ rolloverId, admin });
    expect((await User.findOne({ id: 's9' }))?.sinif).toBe('9');
  });

  it('mezunu tekrar aktif eder ve mezuniyetTarihi alanını siler', async () => {
    await rollbackRollover({ rolloverId, admin });

    const geriAlinan = await User.findOne({ id: 's12' });
    expect(geriAlinan?.isActive).toBe(true);
    expect(geriAlinan?.mezuniyetTarihi).toBeUndefined();
  });

  it('tokenVersion değerini azaltmaz — eski JWT geçersiz kalır', async () => {
    await rollbackRollover({ rolloverId, admin });
    expect((await User.findOne({ id: 's12' }))?.tokenVersion).toBe(4);
  });

  it('kaydı rolled_back durumuna geçirir', async () => {
    await rollbackRollover({ rolloverId, admin });

    const doc = await AcademicYearRollover.findOne({ rolloverId });
    expect(doc?.status).toBe('rolled_back');
    expect(doc?.rolledBackBy).toBe('admin_1');
  });

  it('ikinci geri alma reddedilir', async () => {
    await rollbackRollover({ rolloverId, admin });
    await expect(rollbackRollover({ rolloverId, admin })).rejects.toMatchObject({
      code: 'ROLLOVER_NOT_APPLIED',
    });
  });

  it('30 günden eski geçiş geri alınamaz', async () => {
    const eski = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await AcademicYearRollover.updateOne({ rolloverId }, { $set: { appliedAt: eski } });

    await expect(rollbackRollover({ rolloverId, admin })).rejects.toMatchObject({
      code: 'ROLLOVER_NOT_REVERSIBLE',
    });
    expect((await User.findOne({ id: 's9' }))?.sinif).toBe('10');
  });
});

describe('cancelRollover', () => {
  it('proposed kaydı iptal eder ve kullanıcılara dokunmaz', async () => {
    await createStudent('s10', '10');
    const rolloverId = (await proposeRollover())!.rolloverId;

    const result = await cancelRollover({ rolloverId, admin });

    expect(result.cancelled).toBe(1);
    expect((await AcademicYearRollover.findOne({ rolloverId }))?.status).toBe('cancelled');
    expect((await User.findOne({ id: 's10' }))?.sinif).toBe('10');
  });

  it('uygulanmış kaydı iptal etmez', async () => {
    await createStudent('s10', '10');
    const rolloverId = (await proposeRollover())!.rolloverId;
    await applyRollover({ rolloverId, admin });

    await expect(cancelRollover({ rolloverId, admin })).rejects.toMatchObject({
      code: 'ROLLOVER_NOT_PENDING',
    });
  });
});
