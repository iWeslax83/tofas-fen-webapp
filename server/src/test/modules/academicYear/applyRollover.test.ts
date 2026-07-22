import { describe, it, expect, beforeEach } from 'vitest';
import { AcademicYearRollover, User } from '../../../models';
import { proposeRollover, applyRollover } from '../../../modules/academicYear/academicYearService';

const admin = { id: 'admin_1', adSoyad: 'Test Admin' };

async function createStudent(id: string, sinif: string, sube = 'B') {
  await User.create({
    id,
    adSoyad: `Öğrenci ${id}`,
    rol: 'student',
    sinif,
    sube,
    isActive: true,
    tokenVersion: 3,
    childId: [],
  });
}

describe('applyRollover', () => {
  let rolloverId: string;

  beforeEach(async () => {
    await createStudent('s9', '9');
    await createStudent('s11', '11');
    await createStudent('s12', '12');
    const rollover = await proposeRollover();
    rolloverId = rollover!.rolloverId;
  });

  it('her öğrenciyi bir sınıf üste taşır', async () => {
    await applyRollover({ rolloverId, admin });

    expect((await User.findOne({ id: 's9' }))?.sinif).toBe('10');
    expect((await User.findOne({ id: 's11' }))?.sinif).toBe('12');
  });

  it('şubeyi değiştirmez', async () => {
    await applyRollover({ rolloverId, admin });
    expect((await User.findOne({ id: 's9' }))?.sube).toBe('B');
  });

  it('12. sınıfı mezun eder ve oturumlarını düşürür', async () => {
    await applyRollover({ rolloverId, admin });

    const mezun = await User.findOne({ id: 's12' });
    expect(mezun?.isActive).toBe(false);
    expect(mezun?.mezuniyetTarihi).toBeInstanceOf(Date);
    expect(mezun?.tokenVersion).toBe(4);
    expect(mezun?.sinif).toBe('12');
  });

  it('terfi edenlerin tokenVersion değerine dokunmaz', async () => {
    await applyRollover({ rolloverId, admin });
    expect((await User.findOne({ id: 's9' }))?.tokenVersion).toBe(3);
  });

  it('sayaçları döndürür', async () => {
    const result = await applyRollover({ rolloverId, admin });
    expect(result.promoted).toBe(2);
    expect(result.graduated).toBe(1);
    expect(result.failures).toEqual([]);
  });

  it('kaydı applied durumuna geçirir ve admini damgalar', async () => {
    await applyRollover({ rolloverId, admin });

    const doc = await AcademicYearRollover.findOne({ rolloverId });
    expect(doc?.status).toBe('applied');
    expect(doc?.appliedBy).toBe('admin_1');
    expect(doc?.appliedAt).toBeInstanceOf(Date);
  });

  it('ikinci uygulama reddedilir ve veri iki kez terfi etmez', async () => {
    await applyRollover({ rolloverId, admin });

    await expect(applyRollover({ rolloverId, admin })).rejects.toMatchObject({
      code: 'ROLLOVER_NOT_PENDING',
    });
    expect((await User.findOne({ id: 's9' }))?.sinif).toBe('10');
  });

  it('snapshot içindeki silinmiş öğrenciyi failures olarak raporlar', async () => {
    await User.deleteOne({ id: 's11' });

    const result = await applyRollover({ rolloverId, admin });
    expect(result.failures.map((f) => f.userId)).toContain('s11');
    expect((await User.findOne({ id: 's9' }))?.sinif).toBe('10');
  });
});
