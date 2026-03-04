import ExcelJS from 'exceljs';

interface EvciExportRow {
  studentName: string;
  studentId: string;
  sinif: string;
  oda: string;
  willGo: boolean;
  destination: string;
  startDate: string;
  endDate: string;
  parentApproval: string;
  rejectionReason: string;
}

export class EvciExportService {
  /**
   * Excel dosyası oluştur
   */
  static async generateExcel(rows: EvciExportRow[], weekOf: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tofas Fen Lisesi';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Evci Talepleri');

    // Başlık satırı
    sheet.columns = [
      { header: 'Öğrenci Adı', key: 'studentName', width: 25 },
      { header: 'Öğrenci ID', key: 'studentId', width: 15 },
      { header: 'Sınıf', key: 'sinif', width: 10 },
      { header: 'Oda', key: 'oda', width: 10 },
      { header: 'Durum', key: 'willGo', width: 15 },
      { header: 'Gideceği Yer', key: 'destination', width: 20 },
      { header: 'Başlangıç', key: 'startDate', width: 18 },
      { header: 'Bitiş', key: 'endDate', width: 18 },
      { header: 'Veli Onayı', key: 'parentApproval', width: 15 },
      { header: 'Red Sebebi', key: 'rejectionReason', width: 25 },
    ];

    // Başlık stilini ayarla
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.alignment = { horizontal: 'center' };

    // Veri satırları
    for (const row of rows) {
      sheet.addRow({
        ...row,
        willGo: row.willGo ? 'Gidecek' : 'Gitmeyecek',
        parentApproval: row.parentApproval === 'approved'
          ? 'Onaylandı'
          : row.parentApproval === 'rejected'
            ? 'Reddedildi'
            : 'Beklemede',
      });
    }

    // Hafta bilgisi notu
    sheet.addRow([]);
    sheet.addRow([`Hafta: ${weekOf}`, '', '', '', '', '', '', '', '', `Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}`]);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * PDF dosyası oluştur (basit tablo formatında)
   */
  static async generatePdf(rows: EvciExportRow[], weekOf: string): Promise<Buffer> {
    // Dynamic import for pdfkit (optional dependency)
    let PDFDocument: any;
    try {
      PDFDocument = (await import('pdfkit')).default;
    } catch {
      // If pdfkit is not installed, fall back to a simple text-based approach
      throw new Error('pdfkit modülü yüklü değil. PDF export için: cd server && npm install pdfkit');
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Başlık
      doc.fontSize(16).text(`Evci Talepleri - Hafta: ${weekOf}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(9).text(`Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}`, { align: 'center' });
      doc.moveDown(1);

      // Tablo başlıkları
      const headers = ['Ad Soyad', 'Sınıf', 'Oda', 'Durum', 'Yer', 'Başlangıç', 'Bitiş', 'Veli Onay', 'Red Sebebi'];
      const colWidths = [120, 50, 40, 60, 80, 70, 70, 70, 120];
      const startX = 30;
      let y = doc.y;

      // Başlık satırı
      doc.fontSize(8).font('Helvetica-Bold');
      let x = startX;
      headers.forEach((h, i) => {
        doc.text(h, x, y, { width: colWidths[i], align: 'left' });
        x += colWidths[i] + 5;
      });
      y += 15;
      doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0) + colWidths.length * 5, y).stroke();
      y += 5;

      // Veri satırları
      doc.font('Helvetica').fontSize(7);
      for (const row of rows) {
        if (y > 550) {
          doc.addPage();
          y = 30;
        }
        x = startX;
        const values = [
          row.studentName,
          row.sinif,
          row.oda,
          row.willGo ? 'Gidecek' : 'Gitmeyecek',
          row.destination,
          row.startDate,
          row.endDate,
          row.parentApproval === 'approved' ? 'Onaylandı' : row.parentApproval === 'rejected' ? 'Reddedildi' : 'Beklemede',
          row.rejectionReason,
        ];
        values.forEach((v, i) => {
          doc.text(v, x, y, { width: colWidths[i], align: 'left' });
          x += colWidths[i] + 5;
        });
        y += 14;
      }

      // Özet
      doc.moveDown(1);
      const total = rows.length;
      const going = rows.filter(r => r.willGo).length;
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text(`Toplam: ${total} | Gidecek: ${going} | Gitmeyecek: ${total - going}`, startX, y + 10);

      doc.end();
    });
  }
}
