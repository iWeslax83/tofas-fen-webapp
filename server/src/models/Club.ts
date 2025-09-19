import mongoose, { Schema, Document } from 'mongoose';

export interface IClub extends Document {
  id: string;
  name: string;
  presidentId: string;
  logo?: string;
  description: string;
  socialLinks: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    website?: string;
  };
  members: string[]; // Üye ID'leri
  roles: Record<string, string>; // Kullanıcı ID'si -> rol eşleşmesi
  // Removed nested arrays - now using separate collections
  // events, announcements, chats, etc. are now in separate models
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const clubSchema = new Schema<IClub>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  presidentId: { type: String, required: true },
  logo: String,
  description: String,
  socialLinks: {
    instagram: String,
    twitter: String,
    facebook: String,
    website: String,
  },
  members: [String],
  roles: { type: Object, default: {} },
  // Removed nested arrays - now using separate collections
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true
});

// Essential indexes for common queries
clubSchema.index({ id: 1 }); // Primary lookup
clubSchema.index({ presidentId: 1 }); // For president queries
clubSchema.index({ isActive: 1 }); // For active clubs
clubSchema.index({ members: 1 }); // For member queries
clubSchema.index({ name: 'text', description: 'text' }); // Text search

export const Club = mongoose.model<IClub>("Club", clubSchema);
