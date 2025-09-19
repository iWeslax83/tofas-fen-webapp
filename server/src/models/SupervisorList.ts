import mongoose, { Schema, Document } from 'mongoose';

export interface ISupervisorList extends Document {
  month: string; // Format: "2024-01"
  year: number;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supervisorListSchema = new Schema<ISupervisorList>({
  month: { type: String, required: true }, // Format: "2024-01"
  year: { type: Number, required: true },
  fileUrl: { type: String, required: true },
  uploadedBy: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true,
  // Indexes will be created automatically by Mongoose
});

export const SupervisorList = mongoose.model<ISupervisorList>("SupervisorList", supervisorListSchema);
