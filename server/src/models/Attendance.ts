import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  studentId: string;
  studentName: string;
  date: Date;
  lesson?: string; // Ders adı (opsiyonel - ders bazlı yoklama için)
  period?: number; // Ders saati (1-8)
  attendanceType: 'ders' | 'etut' | 'gece_nobeti'; // Yoklama türü
  status: 'present' | 'absent' | 'late' | 'excused'; // Devamsızlık durumu
  excuse?: string; // Mazeret açıklaması
  recordedBy: string; // Yoklamayı giren kişinin ID'si
  recordedByName: string; // Yoklamayı giren kişinin adı
  notes?: string; // Ek notlar
  semester: string; // Dönem (1, 2)
  academicYear: string; // Akademik yıl (2024-2025)
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>({
  studentId: {
    type: String,
    required: true,
    index: true
  },
  studentName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  lesson: {
    type: String
  },
  period: {
    type: Number,
    min: 1,
    max: 8
  },
  attendanceType: {
    type: String,
    required: true,
    enum: ['ders', 'etut', 'gece_nobeti'],
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['present', 'absent', 'late', 'excused'],
    index: true
  },
  excuse: {
    type: String,
    maxlength: 500
  },
  recordedBy: {
    type: String,
    required: true,
    index: true
  },
  recordedByName: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  semester: {
    type: String,
    required: true,
    enum: ['1', '2'],
    default: '1'
  },
  academicYear: {
    type: String,
    required: true,
    default: () => {
      const year = new Date().getFullYear();
      return `${year}-${year + 1}`;
    }
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
AttendanceSchema.index({ studentId: 1, date: 1, attendanceType: 1 });
AttendanceSchema.index({ date: 1, attendanceType: 1 });
AttendanceSchema.index({ studentId: 1, semester: 1, academicYear: 1 });
AttendanceSchema.index({ recordedBy: 1, date: -1 });
AttendanceSchema.index({ status: 1, date: -1 });

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);

