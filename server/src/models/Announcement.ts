import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  author: string;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true,
    default: 'Admin'
  },
  date: {
    type: String,
    required: true,
    default: () => new Date().toISOString()
  }
}, {
  timestamps: true
});

export default mongoose.model<IAnnouncement>('Announcement', announcementSchema); 