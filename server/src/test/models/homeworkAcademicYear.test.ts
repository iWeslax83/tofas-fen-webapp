import { describe, it, expect } from 'vitest';
import { Homework } from '../../models';
import { getAcademicYear } from '../../utils/academicYear';
import migration from '../../migrations/004-backfill-homework-academic-year';

function homeworkFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: `hw_${Math.random().toString(36).slice(2)}`,
    title: 'Test ödevi',
    description: 'Açıklama',
    subject: 'Matematik',
    teacherId: 'teacher_1',
    teacherName: 'Test Öğretmen',
    classLevel: '10',
    classSection: 'A',
    dueDate: new Date('2026-09-15'),
    ...overrides,
  };
}

describe('Homework.academicYear', () => {
  it('yeni kayıtta içinde bulunulan öğretim yılıyla doldurulur', async () => {
    const hw = await Homework.create(homeworkFixture());
    expect(hw.academicYear).toBe(getAcademicYear());
  });

  it('açıkça verilen değeri ezmez', async () => {
    const hw = await Homework.create(homeworkFixture({ academicYear: '2024-2025' }));
    expect(hw.academicYear).toBe('2024-2025');
  });
});

describe('migration 004-backfill-homework-academic-year', () => {
  it('alanı olmayan kayıtları içinde bulunulan yılla damgalar', async () => {
    await Homework.collection.insertOne(homeworkFixture({ id: 'hw_eski' }));

    await migration.up();

    const doc = await Homework.collection.findOne({ id: 'hw_eski' });
    expect(doc?.academicYear).toBe(getAcademicYear());
  });

  it('zaten damgalı kayıtlara dokunmaz', async () => {
    await Homework.collection.insertOne(
      homeworkFixture({ id: 'hw_damgali', academicYear: '2019-2020' }),
    );

    await migration.up();

    const doc = await Homework.collection.findOne({ id: 'hw_damgali' });
    expect(doc?.academicYear).toBe('2019-2020');
  });
});
