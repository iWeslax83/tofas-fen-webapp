import mongoose, { Schema, Document } from 'mongoose';

export interface IEvciRequest extends Document {
  studentId: string;
  studentName: string;
  parentId: string;
  parentName: string;
  requestDate: Date;
  leaveDate: Date;
  returnDate: Date;
  reason: string;
  destination: string;
  contactPhone: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const evciRequestSchema = new Schema<IEvciRequest>({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  parentId: { type: String, required: true },
  parentName: { type: String, required: true },
  requestDate: { type: Date, default: Date.now },
  leaveDate: { type: Date, required: true },
  returnDate: { type: Date, required: true },
  reason: { type: String, required: true },
  destination: { type: String, required: true },
  contactPhone: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  adminNote: String,
  approvedBy: String,
  approvedAt: Date,
}, { 
  timestamps: true,
  // Indexes will be created automatically by Mongoose
});

export const EvciRequest = mongoose.model<IEvciRequest>("EvciRequest", evciRequestSchema);
