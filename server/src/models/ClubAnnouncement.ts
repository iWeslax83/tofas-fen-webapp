import mongoose, { Schema, Document } from 'mongoose';

export interface IClubAnnouncement extends Document {
  id: string;
  clubId: string;
  title: string;
  content: string;
  createdBy: string; // User ID
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClubAnnouncementSchema = new Schema<IClubAnnouncement>({
  id: { type: String, required: true, unique: true },
  clubId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdBy: { type: String, required: true, index: true },
  isActive: { type: Boolean, default: true, index: true }
}, { 
  timestamps: true 
});

// Indexes for common queries
ClubAnnouncementSchema.index({ clubId: 1, isActive: 1 });
ClubAnnouncementSchema.index({ createdBy: 1, isActive: 1 });
ClubAnnouncementSchema.index({ createdAt: -1, isActive: 1 });

export const ClubAnnouncement = mongoose.model<IClubAnnouncement>('ClubAnnouncement', ClubAnnouncementSchema);
