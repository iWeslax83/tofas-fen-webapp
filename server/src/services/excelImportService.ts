import * as XLSX from 'xlsx';
import { User } from '../models';

export interface ExcelNoteData {
  studentId: string;
  subject: string;
  note: number;
  date: string;
  description?: string;
}

export class ExcelImportService {
  /**
   * Excel dosyasından not verilerini okur
   */
  static parseExcelFile(buffer: Buffer): ExcelNoteData[] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Excel'i JSON'a çevir
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // İlk satır başlık, onu atla
      const dataRows = jsonData.slice(1) as any[][];
      
      const notes: ExcelNoteData[] = [];
      
      for (const row of dataRows) {
        if (row.length >= 4) {
          const [studentId, subject, note, date, description] = row;
          
          // Geçerli veri kontrolü
          if (studentId && subject && note !== undefined && date) {
            notes.push({
              studentId: String(studentId).trim(),
              subject: String(subject).trim(),
              note: Number(note),
              date: String(date),
              description: description ? String(description).trim() : undefined
            });
          }
        }
      }
      
      return notes;
    } catch (error) {
      console.error('Excel parse error:', error);
      throw new Error('Excel dosyası okunamadı');
    }
  }

  /**
   * CSV dosyasından not verilerini okur
   */
  static parseCSVFile(buffer: Buffer): ExcelNoteData[] {
    try {
      const csvContent = buffer.toString('utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      // İlk satır başlık, onu atla
      const dataLines = lines.slice(1);
      
      const notes: ExcelNoteData[] = [];
      
      for (const line of dataLines) {
        const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
        
        if (columns.length >= 4) {
          const [studentId, subject, note, date, description] = columns;
          
          // Geçerli veri kontrolü
          if (studentId && subject && note && date) {
            notes.push({
              studentId,
              subject,
              note: Number(note),
              date,
              description: description || undefined
            });
          }
        }
      }
      
      return notes;
    } catch (error) {
      console.error('CSV parse error:', error);
      throw new Error('CSV dosyası okunamadı');
    }
  }

  /**
   * Öğrenci ID'sinin geçerli olup olmadığını kontrol eder
   */
  static async validateStudentIds(studentIds: string[]): Promise<{ valid: string[], invalid: string[] }> {
    const uniqueIds = [...new Set(studentIds)];
    const valid: string[] = [];
    const invalid: string[] = [];
    
    for (const id of uniqueIds) {
      try {
        const student = await User.findOne({ id, rol: 'student' });
        if (student) {
          valid.push(id);
        } else {
          invalid.push(id);
        }
      } catch (error) {
        invalid.push(id);
      }
    }
    
    return { valid, invalid };
  }

  /**
   * Not verilerini doğrular
   */
  static validateNoteData(notes: ExcelNoteData[]): { valid: ExcelNoteData[], errors: string[] } {
    const valid: ExcelNoteData[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const rowNumber = i + 2; // Excel'de 1. satır başlık, 2'den başla
      
      // Öğrenci ID kontrolü
      if (!note.studentId || note.studentId.trim() === '') {
        errors.push(`Satır ${rowNumber}: Öğrenci ID boş olamaz`);
        continue;
      }
      
      // Ders kontrolü
      if (!note.subject || note.subject.trim() === '') {
        errors.push(`Satır ${rowNumber}: Ders adı boş olamaz`);
        continue;
      }
      
      // Not kontrolü
      if (isNaN(note.note) || note.note < 0 || note.note > 100) {
        errors.push(`Satır ${rowNumber}: Not 0-100 arasında olmalıdır`);
        continue;
      }
      
      // Tarih kontrolü
      if (!note.date || isNaN(Date.parse(note.date))) {
        errors.push(`Satır ${rowNumber}: Geçerli bir tarih giriniz`);
        continue;
      }
      
      valid.push(note);
    }
    
    return { valid, errors };
  }

  /**
   * Dosya uzantısına göre parse fonksiyonunu seçer
   */
  static parseFileByExtension(buffer: Buffer, filename: string): ExcelNoteData[] {
    const extension = filename.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'xlsx':
      case 'xls':
        return this.parseExcelFile(buffer);
      case 'csv':
        return this.parseCSVFile(buffer);
      default:
        throw new Error('Desteklenmeyen dosya formatı. Sadece .xlsx, .xls ve .csv dosyaları desteklenir.');
    }
  }
} 