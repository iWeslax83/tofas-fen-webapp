import { describe, it, expect, beforeAll } from 'vitest';
import { AcademicYearRollover } from '../../models';

function rolloverFixture(overrides: Record<string, unknown> = {}) {
  return {
    rolloverId: '11111111-1111-4111-8111-111111111111',
    fromYear: '2025-2026',
    toYear: '2026-2027',
    snapshot: [
      { userId: 'ogr_1', adSoyad: 'A B', fromSinif: '9', action: 'promote' },
      { userId: 'ogr_2', adSoyad: 'C D', fromSinif: '12', action: 'graduate' },
    ],
    ...overrides,
  };
}

describe('AcademicYearRollover', () => {
  // Mongoose builds indexes in the background after model compilation; on a
  // freshly-started in-memory Mongo, the unique(toYear) index may not exist
  // yet when the very first test runs, letting a "duplicate" insert through.
  beforeAll(async () => {
    await AcademicYearRollover.init();
  });

  it('varsayılan durumu proposed', async () => {
    const doc = await AcademicYearRollover.create(rolloverFixture());
    expect(doc.status).toBe('proposed');
    expect(doc.proposedAt).toBeInstanceOf(Date);
  });

  it('snapshot girdilerini korur', async () => {
    const doc = await AcademicYearRollover.create(rolloverFixture());
    expect(doc.snapshot).toHaveLength(2);
    expect(doc.snapshot[1].action).toBe('graduate');
  });

  it('aynı toYear için ikinci kayıt reddedilir', async () => {
    await AcademicYearRollover.create(rolloverFixture());
    await expect(
      AcademicYearRollover.create(
        rolloverFixture({ rolloverId: '22222222-2222-4222-8222-222222222222' }),
      ),
    ).rejects.toThrow();
  });

  it('geçersiz status reddedilir', async () => {
    await expect(
      AcademicYearRollover.create(rolloverFixture({ status: 'yanlis' })),
    ).rejects.toThrow();
  });
});
