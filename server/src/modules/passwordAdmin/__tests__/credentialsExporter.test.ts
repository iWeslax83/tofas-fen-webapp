import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildCredentialsXlsx } from '../credentialsExporter';

const sampleRows = [
  {
    id: '202',
    adSoyad: 'AHMET KILIÇKAN',
    rol: 'student',
    sinif: '9',
    sube: 'A',
    pansiyon: false,
    password: 'abc12345',
  },
  {
    id: '204',
    adSoyad: 'ALİ EMRE İŞLER',
    rol: 'student',
    sinif: '9',
    sube: 'A',
    pansiyon: true,
    password: 'xyz67890',
  },
];

describe('buildCredentialsXlsx', () => {
  it('returns a non-empty Buffer', async () => {
    const buf = await buildCredentialsXlsx(sampleRows);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('produces an XLSX with the expected headers and rows', async () => {
    const buf = await buildCredentialsXlsx(sampleRows);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
    expect(data).toHaveLength(2);
    expect(Object.keys(data[0])).toEqual([
      'Öğrenci No',
      'Ad Soyad',
      'Rol',
      'Sınıf',
      'Şube',
      'Pansiyon',
      'Şifre',
    ]);
    expect(data[0]['Şifre']).toBe('abc12345');
    expect(data[1]['Pansiyon']).toBe('Evet');
    expect(data[0]['Pansiyon']).toBe('Hayır');
  });

  it('handles an empty row set without throwing', async () => {
    const buf = await buildCredentialsXlsx([]);
    expect(Buffer.isBuffer(buf)).toBe(true);
  });
});
