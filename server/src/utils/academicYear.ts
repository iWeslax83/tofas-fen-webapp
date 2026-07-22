/**
 * Öğretim yılı hesabı — sistemdeki tek doğruluk kaynağı.
 *
 * Yıl sınırı 1 Ağustos'tur ve UTC üzerinden hesaplanır. SchedulerService'in
 * geçiş cron'u `0 3 1 8 *` + Europe/Istanbul ile çalışır; bu 1 Ağustos 00:00
 * UTC'ye denk gelir, dolayısıyla cron tetiklendiğinde bu fonksiyon da yeni
 * yılı döndürür. Yerel saat dilimi kullanmak sunucunun TZ ayarına göre
 * değişen sonuç üretirdi.
 */

const ACADEMIC_YEAR_RE = /^(\d{4})-(\d{4})$/;

/** Örn. 2026-08-01 -> "2026-2027", 2026-07-31 -> "2025-2026" */
export function getAcademicYear(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const isSecondHalf = date.getUTCMonth() >= 7; // 7 = Ağustos
  const startYear = isSecondHalf ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

/** "2026-2027" -> "2025-2026" */
export function getPreviousAcademicYear(academicYear: string): string {
  const match = ACADEMIC_YEAR_RE.exec(academicYear);
  if (!match) {
    throw new Error(`Geçersiz öğretim yılı biçimi: ${academicYear}`);
  }
  const startYear = Number(match[1]) - 1;
  return `${startYear}-${startYear + 1}`;
}
