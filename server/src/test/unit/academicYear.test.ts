import { describe, it, expect } from 'vitest';
import { getAcademicYear, getPreviousAcademicYear } from '../../utils/academicYear';

describe('getAcademicYear', () => {
  it('31 Temmuz hâlâ önceki öğretim yılıdır', () => {
    expect(getAcademicYear(new Date('2026-07-31T20:00:00Z'))).toBe('2025-2026');
  });

  it('1 Ağustos yeni öğretim yılını başlatır', () => {
    expect(getAcademicYear(new Date('2026-08-01T00:00:00Z'))).toBe('2026-2027');
  });

  it('Aralık ayı, başladığı takvim yılının öğretim yılındadır', () => {
    expect(getAcademicYear(new Date('2026-12-15T00:00:00Z'))).toBe('2026-2027');
  });

  it('Ocak ayı, bir önceki takvim yılında başlayan öğretim yılındadır', () => {
    expect(getAcademicYear(new Date('2027-01-15T00:00:00Z'))).toBe('2026-2027');
  });

  it('UTC üzerinden hesaplar, yerel saat diliminden etkilenmez', () => {
    // 1 Ağustos 02:00 Istanbul = 31 Temmuz 23:00 UTC -> hâlâ eski yıl
    expect(getAcademicYear(new Date('2026-07-31T23:00:00Z'))).toBe('2025-2026');
  });
});

describe('getPreviousAcademicYear', () => {
  it('bir önceki öğretim yılını döndürür', () => {
    expect(getPreviousAcademicYear('2026-2027')).toBe('2025-2026');
  });

  it('geçersiz biçimde hata fırlatır', () => {
    expect(() => getPreviousAcademicYear('2026')).toThrow();
  });
});
