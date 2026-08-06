export type StrengthLevel = 0 | 1 | 2 | 3;

export interface StrengthResult {
  level: StrengthLevel;
  label: string;
  hint: string;
}

const LABELS: Record<StrengthLevel, string> = {
  0: 'Çok zayıf',
  1: 'Zayıf',
  2: 'Orta',
  3: 'Güçlü',
};

/** Sık kullanılan, tahmin edilmesi kolay şifreler. */
const COMMON = [
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '111111',
  '000000',
  '123123',
  'password',
  'parola',
  'sifre',
  'şifre',
  'qwerty',
  'asdasd',
  'iloveyou',
  'admin',
  'ogrenci',
  'öğrenci',
  'okul',
  'tofas',
  'tofaş',
  'fenlisesi',
  'galatasaray',
  'fenerbahce',
  'fenerbahçe',
  'besiktas',
  'beşiktaş',
  'trabzonspor',
  'turkiye',
  'türkiye',
  'istanbul',
  'ankara',
  'bursa',
  'anadolu',
  'mustafa',
  'kemal',
  'ataturk',
  'atatürk',
];

const SEQUENCES = [
  '0123456789',
  'abcdefghijklmnopqrstuvwxyz',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
];

/** Şifre, verilen dizilerden 4 karakterlik bir parçayı düz veya ters içeriyor mu. */
function hasSequence(lower: string): boolean {
  for (const seq of SEQUENCES) {
    for (let i = 0; i + 4 <= seq.length; i++) {
      const parca = seq.slice(i, i + 4);
      const ters = parca.split('').reverse().join('');
      if (lower.includes(parca) || lower.includes(ters)) return true;
    }
  }
  return false;
}

/** Şifrenin tamamı tek bir karakterin tekrarı mı. */
function isRepeat(pw: string): boolean {
  return pw.length > 0 && new Set(pw).size === 1;
}

function charClasses(pw: string): number {
  let n = 0;
  if (/[a-zçğıöşü]/.test(pw)) n++;
  if (/[A-ZÇĞİÖŞÜ]/.test(pw)) n++;
  if (/[0-9]/.test(pw)) n++;
  if (/[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]/.test(pw)) n++;
  return n;
}

/**
 * Şifre gücünü 0-3 arasında puanlar. Uzunluk ve karakter çeşitliliği puan
 * kazandırır; tekrar, ardışık dizi, yaygın şifre ve kullanıcının kendi
 * bilgilerini içermek puanı sıfıra çeker.
 */
export function scorePassword(pw: string, userHints: string[] = []): StrengthResult {
  if (!pw) {
    return { level: 0, label: LABELS[0], hint: 'Şifre gir.' };
  }

  const lower = pw.toLowerCase();

  if (isRepeat(pw)) {
    return { level: 0, label: LABELS[0], hint: 'Aynı karakteri tekrarlama.' };
  }

  if (COMMON.some((c) => lower === c || (c.length >= 5 && lower.includes(c)))) {
    return {
      level: 0,
      label: LABELS[0],
      hint: 'Çok bilinen bir şifre, başkası kolayca tahmin eder.',
    };
  }

  if (hasSequence(lower)) {
    return { level: 0, label: LABELS[0], hint: 'Ardışık harf veya rakam dizisi kullanma.' };
  }

  const hintHit = userHints
    .filter((h) => h && h.length >= 3)
    .some((h) => lower.includes(h.toLowerCase()));

  let puan = 0;
  if (pw.length >= 6) puan++;
  if (pw.length >= 8) puan++;
  if (pw.length >= 12) puan++;
  if (pw.length >= 16) puan++;
  puan += charClasses(pw) - 1;

  if (hintHit) puan -= 3;

  const level = (puan <= 1 ? 0 : puan <= 3 ? 1 : puan <= 5 ? 2 : 3) as StrengthLevel;

  const hint = hintHit
    ? 'Adını veya kullanıcı numaranı şifrende kullanma.'
    : level === 3
      ? 'İyi şifre.'
      : pw.length < 12
        ? 'Birkaç karakter daha ekle, uzunluk en çok işe yarayan şey.'
        : 'Rakam veya noktalama ekleyerek çeşitliliği artır.';

  return { level, label: LABELS[level], hint };
}
