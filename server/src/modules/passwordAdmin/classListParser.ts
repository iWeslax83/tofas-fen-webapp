import * as XLSX from 'xlsx';

export interface ParsedStudentRow {
  id: string;
  adSoyad: string;
  rol: 'student';
  sinif: string;
  sube: string;
  pansiyon: boolean;
}

export interface ParseResult {
  rows: ParsedStudentRow[];
  warnings: string[];
}

const CLASS_HEADER_RE = /(\d+)\.\s*Sınıf\s*\/\s*([A-F])/;
const COL_SINO = 0;
const COL_OGRENCI_NO = 1;
const COL_AD = 3;
const COL_SOYAD = 7;
const COL_PANSIYON = 13;

/**
 * Parse a multi-block Tofaş class-list XLS into student rows.
 * Each block starts with a header row like "FL - 9. Sınıf / A Şubesi ... Sınıf Listesi".
 */
export function parseClassListFile(buffer: Buffer): ParseResult {
  const warnings: string[] = [];
  const rows: ParsedStudentRow[] = [];

  if (!buffer || buffer.length === 0) {
    warnings.push('Boş dosya');
    return { rows, warnings };
  }

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'buffer' });
  } catch (err) {
    warnings.push(`XLSX okuma hatası: ${err instanceof Error ? err.message : String(err)}`);
    return { rows, warnings };
  }

  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    warnings.push('Dosyada sheet bulunamadı');
    return { rows, warnings };
  }
  const sheet = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  let currentSinif: string | null = null;
  let currentSube: string | null = null;

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    const first = String(row[COL_SINO] ?? '');

    if (first.includes('Sınıf Listesi')) {
      const m = first.match(CLASS_HEADER_RE);
      if (m) {
        currentSinif = m[1];
        currentSube = m[2];
      } else {
        warnings.push(`Satır ${i + 1}: sınıf başlığı tanınamadı`);
        currentSinif = null;
        currentSube = null;
      }
      continue;
    }

    if (typeof row[COL_SINO] !== 'number') continue;
    const ogrenciNo = row[COL_OGRENCI_NO];
    if (ogrenciNo === '' || ogrenciNo === null || ogrenciNo === undefined) continue;

    if (!currentSinif || !currentSube) {
      warnings.push(`Satır ${i + 1}: aktif sınıf bloğu yok, atlandı`);
      continue;
    }

    const ad = String(row[COL_AD] ?? '').trim();
    const soyad = String(row[COL_SOYAD] ?? '').trim();
    if (!ad || !soyad) {
      warnings.push(`Satır ${i + 1}: ad veya soyad boş`);
      continue;
    }
    const adSoyad = `${ad} ${soyad}`.replace(/\s+/g, ' ').trim();

    rows.push({
      id: String(ogrenciNo).trim(),
      adSoyad,
      rol: 'student',
      sinif: currentSinif,
      sube: currentSube,
      pansiyon: String(row[COL_PANSIYON] ?? '').trim() === 'Yatılı',
    });
  }

  return { rows, warnings };
}
