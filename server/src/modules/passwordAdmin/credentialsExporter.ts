import ExcelJS from 'exceljs';

export interface CredentialsRow {
  id: string;
  adSoyad: string;
  rol: string;
  sinif?: string;
  sube?: string;
  pansiyon: boolean;
  password: string;
}

/**
 * Build an XLSX buffer containing plaintext credentials for a batch.
 * The buffer is produced in-memory and never written to disk.
 */
export async function buildCredentialsXlsx(rows: CredentialsRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Credentials');

  sheet.columns = [
    { header: 'Öğrenci No', key: 'id', width: 14 },
    { header: 'Ad Soyad', key: 'adSoyad', width: 30 },
    { header: 'Rol', key: 'rol', width: 12 },
    { header: 'Sınıf', key: 'sinif', width: 8 },
    { header: 'Şube', key: 'sube', width: 8 },
    { header: 'Pansiyon', key: 'pansiyon', width: 10 },
    { header: 'Şifre', key: 'password', width: 14 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  for (const r of rows) {
    sheet.addRow({
      id: r.id,
      adSoyad: r.adSoyad,
      rol: r.rol,
      sinif: r.sinif ?? '',
      sube: r.sube ?? '',
      pansiyon: r.pansiyon ? 'Evet' : 'Hayır',
      password: r.password,
    });
  }

  const arr = await wb.xlsx.writeBuffer();
  return Buffer.from(arr as ArrayBuffer);
}
