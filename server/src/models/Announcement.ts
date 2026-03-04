import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  author: string;
  authorId?: string;
  date: string;
  targetRoles?: string[];
  targetClasses?: string[];
  priority?: 'low' | 'medium' | 'high';
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
  authorId: {
    type: String,
    index: true
  },
  date: {
    type: String,
    required: true,
    default: () => new Date().toISOString()
  },
  targetRoles: {
    type: [String],
    default: []
  },
  targetClasses: {
    type: [String],
    default: []
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, {
  timestamps: true
});

export default mongoose.models.Announcement || mongoose.model<IAnnouncement>('Announcement', announcementSchema);