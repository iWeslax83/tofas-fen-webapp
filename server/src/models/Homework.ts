import mongoose, { Schema, Document } from 'mongoose';

export interface IHomework extends Document {
  id: string;
  title: string;
  description: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  classLevel: string; // Sınıf seviyesi (9, 10, 11, 12)
  classSection?: string; // Şube (A, B, C, D)
  dueDate: Date;
  assignedDate: Date;
  attachments?: string[]; // Dosya URL'leri
  status: 'active' | 'completed' | 'expired';
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const homeworkSchema = new Schema<IHomework>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
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
  classLevel: { type: String, required: true },
  classSection: String,
  dueDate: { type: Date, required: true },
  assignedDate: { type: Date, default: Date.now },
  attachments: [String],
  status: { 
    type: String, 
    enum: ['active', 'completed', 'expired'], 
    default: 'active' 
  },
  isPublished: { type: Boolean, default: true }
}, { 
  timestamps: true,
  // Indexes will be created automatically by Mongoose
});

export const Homework = mongoose.model<IHomework>("Homework", homeworkSchema);
