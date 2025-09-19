import mongoose, { Schema, Document } from 'mongoose';

export interface IMaintenanceRequest extends Document {
  studentId: string;
  studentName: string;
  roomNumber: string;
  issue: string;
  status: 'pending' | 'in_progress' | 'completed';
  adminNote?: string;
  serviceNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceRequestSchema = new Schema<IMaintenanceRequest>({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  roomNumber: { type: String, required: true },
  issue: { type: String, required: true },
  status: { 
    type: String, 
    enum: ["pending", "in_progress", "completed"], 
    default: "pending" 
  },
  adminNote: String,
  serviceNote: String,
}, { 
  timestamps: true,
  // Indexes will be created automatically by Mongoose
});

export const MaintenanceRequest = mongoose.model<IMaintenanceRequest>("MaintenanceRequest", maintenanceRequestSchema);
