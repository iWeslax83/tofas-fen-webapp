import mongoose, { Schema, Document } from 'mongoose';

export interface ICarziRequest extends Document {
  studentId: string;
  studentName?: string;
  date: string; // Çarşı izni tarihi
  startTime: string; // Başlangıç saati (örn: "14:00")
  endTime: string; // Bitiş saati (örn: "16:00")
  reason?: string; // İzin nedeni
  status?: 'pending' | 'approved' | 'rejected';
  parentApproval?: 'pending' | 'approved' | 'rejected'; // Veli onayı
  parentApprovedBy?: string; // Veli ID
  parentApprovedAt?: Date;
  adminNote?: string;
  approvedBy?: string; // Onaylayan admin/yönetici ID
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const carziRequestSchema = new Schema<ICarziRequest>({
  studentId: {
    type: String,
    required: true,
    index: true
  },
  studentName: {
    type: String
  },
  date: {
    type: String,
    required: true,
    index: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  parentApproval: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  parentApprovedBy: {
    type: String
  },
  parentApprovedAt: {
    type: Date
  },
  adminNote: String,
  approvedBy: String,
  approvedAt: Date,
}, {
  timestamps: true
});

// Essential indexes for common queries
carziRequestSchema.index({ studentId: 1 }); // Student-specific queries
carziRequestSchema.index({ status: 1 }); // Status-based queries
carziRequestSchema.index({ parentApproval: 1 }); // Parent approval queries
carziRequestSchema.index({ studentId: 1, status: 1 }); // Student status queries
carziRequestSchema.index({ date: 1 }); // Date-based queries
carziRequestSchema.index({ createdAt: -1 }); // Recent requests
carziRequestSchema.index({ approvedBy: 1, status: 1 }); // Admin approval queries
carziRequestSchema.index({ studentId: 1, createdAt: -1 }); // Student's recent requests
carziRequestSchema.index({ status: 1, parentApproval: 1 }); // Status and parent approval
carziRequestSchema.index({ date: 1, status: 1 }); // Date range with status

export const CarziRequest = mongoose.models.CarziRequest || mongoose.model<ICarziRequest>("CarziRequest", carziRequestSchema);

