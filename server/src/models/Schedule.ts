import mongoose, { Schema, Document } from 'mongoose';

export interface ISchedule extends Document {
  id: string;
  classLevel: string; // Sınıf seviyesi (9, 10, 11, 12)
  classSection: string; // Şube (A, B, C, D)
  academicYear: string; // Akademik yıl (2024-2025)
  semester: string; // Dönem (1. Dönem, 2. Dönem)
  schedule: {
    day: string; // Pazartesi, Salı, Çarşamba, Perşembe, Cuma
    periods: {
      period: number; // Ders saati (1, 2, 3, 4, 5, 6, 7, 8)
      subject: string; // Ders adı
      teacherId: string; // Öğretmen ID
      teacherName: string; // Öğretmen adı
      room?: string; // Sınıf numarası
      startTime: string; // Başlangıç saati (08:30)
      endTime: string; // Bitiş saati (09:20)
    }[];
  }[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>({
  id: { type: String, required: true, unique: true },
  classLevel: { type: String, required: true },
  classSection: { type: String, required: true },
  academicYear: { type: String, required: true },
  semester: { type: String, required: true },
  schedule: [{
    day: { 
      type: String, 
      required: true,
      enum: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']
    },
    periods: [{
      period: { type: Number, required: true, min: 1, max: 8 },
      subject: { 
        type: String, 
        required: true,
        enum: [
          'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'İngilizce', 
          'Türkçe', 'Tarih', 'Coğrafya', 'Din Kültürü', 'Beden Eğitimi',
          'Müzik', 'Görsel Sanatlar', 'Teknoloji ve Tasarım', 'Bilişim Teknolojileri'
        ]
      },
      teacherId: { type: String, required: true },
      teacherName: { type: String, required: true },
      room: String,
      startTime: { type: String, required: true },
      endTime: { type: String, required: true }
    }]
  }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, required: true }
}, { 
  timestamps: true,
  // Indexes will be created automatically by Mongoose
});

export const Schedule = mongoose.model<ISchedule>("Schedule", scheduleSchema);
