import { describe, it, expect } from 'vitest';
import { User } from '../../models';

describe('User.mezuniyetTarihi', () => {
  it('varsayılan olarak tanımsızdır', async () => {
    const user = await User.create({
      id: 'ogr_1',
      adSoyad: 'Test Öğrenci',
      rol: 'student',
      sinif: '12',
      sube: 'A',
      childId: [],
    });
    expect(user.mezuniyetTarihi).toBeUndefined();
  });

  it('set edilebilir ve okunabilir', async () => {
    const mezuniyet = new Date('2026-08-01T00:00:00Z');
    await User.create({
      id: 'ogr_2',
      adSoyad: 'Mezun Öğrenci',
      rol: 'student',
      sinif: '12',
      sube: 'A',
      isActive: false,
      mezuniyetTarihi: mezuniyet,
      childId: [],
    });

    const found = await User.findOne({ id: 'ogr_2' });
    expect(found?.mezuniyetTarihi?.toISOString()).toBe(mezuniyet.toISOString());
  });

  it('mezunun sinif alanı 12 olarak kalır', async () => {
    const mezuniyet = new Date('2026-08-01T00:00:00Z');
    await User.create({
      id: 'ogr_3',
      adSoyad: 'Mezun Öğrenci 3',
      rol: 'student',
      sinif: '12',
      sube: 'A',
      isActive: false,
      mezuniyetTarihi: mezuniyet,
      childId: [],
    });

    const found = await User.findOne({ id: 'ogr_3' });
    expect(found?.sinif).toBe('12');
  });
});
