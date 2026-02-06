import mongoose, { Schema, Document } from 'mongoose';

export interface IEvciRequest extends Document {
  studentId: string;
  studentName?: string;
  willGo: boolean;
  startDate: string;
  endDate: string;
  destination: string;
  status?: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const evciRequestSchema = new Schema<IEvciRequest>({
  studentId: { type: String, required: true },
  studentName: { type: String },
  willGo: { type: Boolean, required: true, default: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  destination: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNote: String,
  approvedBy: String,
  approvedAt: Date,
}, {
  timestamps: true
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

export const EvciRequest = mongoose.models.EvciRequest || mongoose.model<IEvciRequest>("EvciRequest", evciRequestSchema);
