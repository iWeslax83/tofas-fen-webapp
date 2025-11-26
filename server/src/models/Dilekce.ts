import mongoose, { Schema, Document } from 'mongoose';

export interface IDilekce extends Document {
  userId: string;
  userName: string;
  userRole: string;
  type: 'izin' | 'rapor' | 'nakil' | 'diger'; // Dilekçe türü
  subject: string; // Konu
  content: string; // İçerik
  attachments?: string[]; // Ek dosyalar (file paths)
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';
  priority: 'low' | 'medium' | 'high';
  category?: string; // Kategori (opsiyonel)
  reviewedBy?: string; // İnceleyen kişinin ID'si
  reviewedByName?: string;
  reviewedAt?: Date;
  reviewNote?: string; // İnceleme notu
  response?: string; // Yanıt/çözüm
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const dilekceSchema = new Schema<IDilekce>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true,
    enum: ['student', 'teacher', 'parent'],
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['izin', 'rapor', 'nakil', 'diger'],
    index: true
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  attachments: [{
    type: String
  }],
  status: {
    type: String,
    required: true,
    enum: ['pending', 'in_review', 'approved', 'rejected', 'completed'],
    default: 'pending',
    index: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    index: true
  },
  category: {
    type: String,
    maxlength: 100
  },
  reviewedBy: {
    type: String
  },
  reviewedByName: {
    type: String
  },
  reviewedAt: {
    type: Date
  },
  reviewNote: {
    type: String,
    maxlength: 1000
  },
  response: {
    type: String,
    maxlength: 2000
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Essential indexes for common queries
dilekceSchema.index({ userId: 1 }); // User-specific queries
dilekceSchema.index({ status: 1 }); // Status-based queries
dilekceSchema.index({ type: 1 }); // Type-based queries
dilekceSchema.index({ priority: 1 }); // Priority-based queries
dilekceSchema.index({ userId: 1, status: 1 }); // User status queries
dilekceSchema.index({ createdAt: -1 }); // Recent requests
dilekceSchema.index({ reviewedBy: 1, status: 1 }); // Reviewer queries
dilekceSchema.index({ status: 1, priority: 1, createdAt: -1 }); // Admin dashboard queries

export const Dilekce = mongoose.model<IDilekce>("Dilekce", dilekceSchema);

