import mongoose, { Schema, Document } from 'mongoose';

export interface IClubChat extends Document {
  id: string;
  clubId: string;
  userId: string;
  message: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  replyTo?: string; // Message ID being replied to
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClubChatSchema = new Schema<IClubChat>({
  id: { type: String, required: true, unique: true },
  clubId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  message: { type: String, required: true },
  messageType: { 
    type: String, 
    enum: ['text', 'image', 'file', 'system'], 
    default: 'text' 
  },
  replyTo: { type: String, index: true },
  isEdited: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false, index: true }
}, { 
  timestamps: true 
});

// Indexes for common queries
ClubChatSchema.index({ clubId: 1, isDeleted: 1, createdAt: -1 });
ClubChatSchema.index({ userId: 1, isDeleted: 1 });
ClubChatSchema.index({ replyTo: 1, isDeleted: 1 });

export const ClubChat = mongoose.model<IClubChat>('ClubChat', ClubChatSchema);
