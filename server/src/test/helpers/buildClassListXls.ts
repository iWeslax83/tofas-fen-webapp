import * as XLSX from 'xlsx';

export function buildClassListXls(numRows: number): Buffer {
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
