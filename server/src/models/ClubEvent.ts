import mongoose, { Schema, Document } from 'mongoose';

export interface IClubEvent extends Document {
  id: string;
  clubId: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  attendees: string[]; // User IDs
  createdBy: string; // User ID
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClubEventSchema = new Schema<IClubEvent>({
  id: { type: String, required: true, unique: true },
  clubId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: String,
  date: { type: Date, required: true, index: true },
  location: String,
  attendees: [{ type: String, index: true }],
  createdBy: { type: String, required: true, index: true },
  isActive: { type: Boolean, default: true, index: true }
}, { 
  timestamps: true 
});

// Indexes for common queries
ClubEventSchema.index({ clubId: 1, isActive: 1 });
ClubEventSchema.index({ date: 1, isActive: 1 });
ClubEventSchema.index({ createdBy: 1, isActive: 1 });

export const ClubEvent = mongoose.model<IClubEvent>('ClubEvent', ClubEventSchema);
