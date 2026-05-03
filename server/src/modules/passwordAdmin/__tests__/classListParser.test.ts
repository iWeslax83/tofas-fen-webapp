import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';
import { parseClassListFile } from '../classListParser';

function buildClassListXls(numRows: number): Buffer {
  const data: any[][] = [['9. Sınıf / A Şubesi 2026 Sınıf Listesi']];
  for (let i = 1; i <= numRows; i++) {
    data.push([
      i,
      `2026${i.toString().padStart(4, '0')}`,
      '',
      `Ad${i}`,
      '',
      '',
      '',
      `Soyad${i}`,
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

const fixture = () => readFileSync(join(__dirname, '../../../test/fixtures/class-list-sample.xls'));

describe('parseClassListFile', () => {
  it('parses all 444 students from the Tofaş class-list fixture', () => {
    const { rows } = parseClassListFile(fixture());
    expect(rows).toHaveLength(444);
  });

  it('detects all 16 class/section combinations (9A-12D)', () => {
    const { rows } = parseClassListFile(fixture());
    const combos = new Set(rows.map((r) => `${r.sinif}${r.sube}`));
    expect(combos.size).toBe(16);
    for (const sinif of ['9', '10', '11', '12']) {
      for (const sube of ['A', 'B', 'C', 'D']) {
        expect(combos.has(`${sinif}${sube}`)).toBe(true);
      }
    }
  });

  it('joins first and last name with a single space', () => {
    const { rows } = parseClassListFile(fixture());
    for (const r of rows) {
      expect(r.adSoyad).toMatch(/^\S+(\s\S+)+$/);
      expect(r.adSoyad).not.toMatch(/\s{2,}/);
    }
  });

  it('sets rol=student for every row', () => {
    const { rows } = parseClassListFile(fixture());
    expect(rows.every((r) => r.rol === 'student')).toBe(true);
  });

  it('flags pansiyon=true only for rows marked "Yatılı"', () => {
    const { rows } = parseClassListFile(fixture());
    const yatili = rows.filter((r) => r.pansiyon).length;
    expect(yatili).toBe(218);
  });

  it('returns unique string IDs', () => {
    const { rows } = parseClassListFile(fixture());
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(typeof id).toBe('string');
    }
  });

  it('reports parse warnings for empty buffers', () => {
    const { rows, warnings } = parseClassListFile(Buffer.alloc(0));
    expect(rows).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });
});

// Note: Task 3.7 Step 5 extracts buildClassListXls into
// server/src/test/helpers/buildClassListXls.ts and imports it here.
describe('parseClassListFile row cap (N-M2)', () => {
  it('truncates at 500 rows with a warning', () => {
    const buf = buildClassListXls(600);
    const { rows, warnings } = parseClassListFile(buf);
    expect(rows.length).toBe(500);
    expect(warnings.some((w) => w.includes('500'))).toBe(true);
  });

  it('does not warn when under the cap', () => {
    const buf = buildClassListXls(50);
    const { rows, warnings } = parseClassListFile(buf);
    expect(rows.length).toBe(50);
    expect(warnings.some((w) => w.includes('500'))).toBe(false);
  });
});
