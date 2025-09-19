import mongoose, { Schema, Document } from 'mongoose';

export interface IRequest extends Document {
  userId: string;
  type: 'class-change' | 'room-change' | 'club-join' | 'permission' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  details: Record<string, any>;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const requestSchema = new Schema<IRequest>({
  userId: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['class-change', 'room-change', 'club-join', 'permission', 'other'],
    default: 'other'
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  details: { type: Object, required: true },
  adminNote: String,
}, { 
  timestamps: true,
  // Indexes will be created automatically by Mongoose
});

export const Request = mongoose.model<IRequest>("Request", requestSchema);
