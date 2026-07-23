import { describe, it, expect, beforeEach } from 'vitest';
import { AcademicYearRollover, User } from '../../../models';
import {
  proposeRollover,
  getPendingRollover,
  summarizeSnapshot,
} from '../../../modules/academicYear/academicYearService';
import { getAcademicYear, getPreviousAcademicYear } from '../../../utils/academicYear';

async function createStudent(id: string, sinif: string, isActive = true) {
  await User.create({
    id,
    adSoyad: `Öğrenci ${id}`,
    rol: 'student',
    sinif,
    sube: 'A',
    isActive,
    childId: [],
  });
}

describe('proposeRollover', () => {
  beforeEach(async () => {
    await createStudent('s9', '9');
    await createStudent('s10', '10');
    await createStudent('s11', '11');
    await createStudent('s12', '12');
    await createStudent('s_pasif', '10', false);
    await User.create({
      id: 'ogretmen_1',
      adSoyad: 'Öğretmen',
      rol: 'teacher',
      isActive: true,
      childId: [],
    });
  });

  it('aktif öğrencileri snapshot alır, öğretmen ve pasifleri dışlar', async () => {
    const rollover = await proposeRollover();

    expect(rollover).not.toBeNull();
    expect(rollover!.snapshot).toHaveLength(4);
    const ids = rollover!.snapshot.map((e) => e.userId).sort();
    expect(ids).toEqual(['s10', 's11', 's12', 's9']);
  });

  it('12. sınıfı graduate, diğerlerini promote işaretler', async () => {
    const rollover = await proposeRollover();
    const byId = Object.fromEntries(rollover!.snapshot.map((e) => [e.userId, e.action]));

    expect(byId.s9).toBe('promote');
    expect(byId.s11).toBe('promote');
    expect(byId.s12).toBe('graduate');
  });

  it('hiçbir kullanıcı kaydını değiştirmez', async () => {
    await proposeRollover();

    const s12 = await User.findOne({ id: 's12' });
    expect(s12?.sinif).toBe('12');
    expect(s12?.isActive).toBe(true);
    expect(s12?.mezuniyetTarihi).toBeUndefined();
  });

  it('doğru fromYear/toYear atar', async () => {
    const rollover = await proposeRollover();
    expect(rollover!.toYear).toBe(getAcademicYear());
    expect(rollover!.fromYear).toBe(getPreviousAcademicYear(getAcademicYear()));
  });

  it('ikinci çağrıda yeni kayıt üretmez', async () => {
    await proposeRollover();
    const second = await proposeRollover();

    expect(second).toBeNull();
    expect(await AcademicYearRollover.countDocuments()).toBe(1);
  });

  it('aktif öğrenci yoksa kayıt oluşturmaz', async () => {
    await User.deleteMany({ rol: 'student' });
    const rollover = await proposeRollover();

    expect(rollover).toBeNull();
    expect(await AcademicYearRollover.countDocuments()).toBe(0);
  });
});

describe('getPendingRollover', () => {
  it('proposed kayıt yoksa null döner', async () => {
    expect(await getPendingRollover()).toBeNull();
  });
});

describe('summarizeSnapshot', () => {
  it('geçiş sayaçlarını üretir', () => {
    const counts = summarizeSnapshot([
      { userId: 'a', adSoyad: 'A', fromSinif: '9', action: 'promote' },
      { userId: 'b', adSoyad: 'B', fromSinif: '9', action: 'promote' },
      { userId: 'c', adSoyad: 'C', fromSinif: '11', action: 'promote' },
      { userId: 'd', adSoyad: 'D', fromSinif: '12', action: 'graduate' },
    ]);

    expect(counts).toEqual({ '9->10': 2, '11->12': 1, graduate: 1 });
  });
});
