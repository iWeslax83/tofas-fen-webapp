import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  studentId: string;
  studentName: string;
  lesson: string;
  exam1?: number;
  exam2?: number;
  exam3?: number;
  oral?: number;
  project?: number;
  average: number;
  semester: string;
  academicYear: string;
  teacherName?: string;
  source: 'manual' | 'meb_eokul' | 'imported';
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  notes?: string; // Öğretmen notları
  gradeLevel?: string; // Sınıf seviyesi
  classSection?: string; // Şube
}

const NoteSchema: Schema = new Schema({
  studentId: {
    type: String,
    required: true,
    index: true
  },
  studentName: {
    type: String,
    required: true
  },
  lesson: {
    type: String,
    required: true,
    enum: [
      'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'İngilizce', 
      'Türkçe', 'Tarih', 'Coğrafya', 'Din Kültürü', 'Beden Eğitimi',
      'Müzik', 'Görsel Sanatlar', 'Teknoloji ve Tasarım', 'Bilişim Teknolojileri'
    ]
  },
  exam1: {
    type: Number,
    min: 0,
    max: 100,
    validate: {
      validator: function(v: number) {
        return v >= 0 && v <= 100;
      },
      message: 'Sınav notu 0-100 arasında olmalıdır'
    }
  },
  exam2: {
    type: Number,
    min: 0,
    max: 100,
    validate: {
      validator: function(v: number) {
        return v >= 0 && v <= 100;
      },
      message: 'Sınav notu 0-100 arasında olmalıdır'
    }
  },
  exam3: {
    type: Number,
    min: 0,
    max: 100,
    validate: {
      validator: function(v: number) {
        return v >= 0 && v <= 100;
      },
      message: 'Sınav notu 0-100 arasında olmalıdır'
    }
  },
  oral: {
    type: Number,
    min: 0,
    max: 100,
    validate: {
      validator: function(v: number) {
        return v >= 0 && v <= 100;
      },
      message: 'Sözlü notu 0-100 arasında olmalıdır'
    }
  },
  project: {
    type: Number,
    min: 0,
    max: 100,
    validate: {
      validator: function(v: number) {
        return v >= 0 && v <= 100;
      },
      message: 'Proje notu 0-100 arasında olmalıdır'
    }
  },
  average: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    validate: {
      validator: function(v: number) {
        return v >= 0 && v <= 100;
      },
      message: 'Ortalama 0-100 arasında olmalıdır'
    }
  },
  semester: {
    type: String,
    required: true,
    enum: ['1', '2', 'current'],
    default: 'current'
  },
  academicYear: {
    type: String,
    required: true,
    default: () => new Date().getFullYear().toString()
  },
  teacherName: {
    type: String
  },
  source: {
    type: String,
    required: true,
    enum: ['manual', 'meb_eokul', 'imported'],
    default: 'manual'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxlength: 500
  },
  gradeLevel: {
    type: String,
    enum: ['9', '10', '11', '12']
  },
  classSection: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E', 'F']
  }
}, {
  timestamps: true
});

// Ortalama hesaplama middleware
NoteSchema.pre('save', function(next) {
  const grades = [];
  
  if (this.exam1 !== undefined) grades.push(this.exam1);
  if (this.exam2 !== undefined) grades.push(this.exam2);
  if (this.exam3 !== undefined) grades.push(this.exam3);
  if (this.oral !== undefined) grades.push(this.oral);
  if (this.project !== undefined) grades.push(this.project);
  
  if (grades.length > 0) {
    this.average = Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 10) / 10;
  }
  
  this.lastUpdated = new Date();
  next();
});

// Index'ler
NoteSchema.index({ studentId: 1, lesson: 1, semester: 1, academicYear: 1 });
NoteSchema.index({ source: 1, lastUpdated: 1 });
NoteSchema.index({ isActive: 1 });

export default mongoose.model<INote>('Note', NoteSchema); 