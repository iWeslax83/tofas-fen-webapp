import mongoose, { Schema, Document } from 'mongoose';

export interface IEvciRequest extends Document {
  studentId: string;
  studentName?: string;
  willGo: boolean;
  startDate?: string;
  endDate?: string;
  destination?: string;
  status?: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  approvedBy?: string;
  approvedAt?: Date;
  parentApproval: 'pending' | 'approved' | 'rejected';
  parentApprovalAt?: Date;
  parentApprovalBy?: string;
  rejectionReason?: string;
  weekOf: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Verilen tarih için haftanın pazartesi gününü "YYYY-MM-DD" formatında döner.
 * Pazar günü önceki haftanın pazartesisini döner.
 */
export function getWeekMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay(); // 0=Pazar, 1=Pazartesi, ...
  const diff = (day === 0 ? 6 : day - 1); // Pazartesiye olan fark
  date.setDate(date.getDate() - diff);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayStr = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

const evciRequestSchema = new Schema<IEvciRequest>({
  studentId: { type: String, required: true },
  studentName: { type: String },
  willGo: { type: Boolean, required: true, default: true },
  startDate: { type: String, required: false },
  endDate: { type: String, required: false },
  destination: { type: String, required: false },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNote: String,
  approvedBy: String,
  approvedAt: Date,
  parentApproval: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  parentApprovalAt: Date,
  parentApprovalBy: String,
  rejectionReason: { type: String, default: null },
  weekOf: { type: String, default: '' },
}, {
  timestamps: true
});

// Pre-save: weekOf boşsa createdAt'ten hesapla
evciRequestSchema.pre('save', function (next) {
  if (!this.weekOf) {
    this.weekOf = getWeekMonday(this.createdAt || new Date());
  }
  next();
});

// Essential indexes for common queries
evciRequestSchema.index({ studentId: 1 }); // Student-specific queries
evciRequestSchema.index({ status: 1 }); // Status-based queries
evciRequestSchema.index({ studentId: 1, status: 1 }); // Student status queries
evciRequestSchema.index({ startDate: 1, endDate: 1 }); // Date range queries
evciRequestSchema.index({ createdAt: -1 }); // Recent requests
evciRequestSchema.index({ approvedBy: 1, status: 1 }); // Admin approval queries
evciRequestSchema.index({ willGo: 1, status: 1 }); // Going/not going queries
evciRequestSchema.index({ destination: 1, status: 1 }); // Destination queries
evciRequestSchema.index({ studentId: 1, createdAt: -1 }); // Student's recent requests
evciRequestSchema.index({ status: 1, createdAt: -1 }); // Recent requests by status

// Compound indexes for complex queries
evciRequestSchema.index({ studentId: 1, willGo: 1, status: 1 }); // Student going status
evciRequestSchema.index({ startDate: 1, endDate: 1, status: 1 }); // Date range with status
evciRequestSchema.index({ approvedBy: 1, approvedAt: -1 }); // Admin approval history

// Parent approval indexes
evciRequestSchema.index({ studentId: 1, weekOf: 1 }, { unique: true }); // Weekly limit per student
evciRequestSchema.index({ parentApproval: 1, status: 1 }); // Parent approval + status queries

export const EvciRequest = mongoose.models.EvciRequest || mongoose.model<IEvciRequest>("EvciRequest", evciRequestSchema);

/**
 * Mevcut kayıtları yeni alanlara migrate et.
 * - parentApproval yoksa → 'approved' (mevcut veriler kırılmasın)
 * - weekOf yoksa → getWeekMonday(createdAt)
 * - Aynı (studentId, weekOf) çiftinde birden fazla kayıt varsa en yenisini tut
 */
export async function migrateEvciRequests(): Promise<void> {
  // 1. parentApproval ve weekOf alanları olmayan kayıtları güncelle
  const docsWithoutFields = await EvciRequest.find({
    $or: [
      { parentApproval: { $exists: false } },
      { weekOf: { $exists: false } },
      { weekOf: '' },
    ],
  });

  for (const doc of docsWithoutFields) {
    const updates: Record<string, any> = {};
    if (!doc.parentApproval) {
      updates.parentApproval = 'approved';
    }
    if (!doc.weekOf) {
      updates.weekOf = getWeekMonday(doc.createdAt);
    }
    if (Object.keys(updates).length > 0) {
      await EvciRequest.updateOne({ _id: doc._id }, { $set: updates });
    }
  }

  // 2. Duplicate (studentId, weekOf) kontrol et, en yenisini tut
  const pipeline = [
    { $group: { _id: { studentId: '$studentId', weekOf: '$weekOf' }, count: { $sum: 1 }, docs: { $push: { _id: '$_id', createdAt: '$createdAt' } } } },
    { $match: { count: { $gt: 1 } } },
  ];
  const duplicates = await EvciRequest.aggregate(pipeline);

  for (const dup of duplicates) {
    // En yeni olanı tut, diğerlerini sil
    const sorted = dup.docs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const toDelete = sorted.slice(1).map((d: any) => d._id);
    if (toDelete.length > 0) {
      await EvciRequest.deleteMany({ _id: { $in: toDelete } });
    }
  }
}
