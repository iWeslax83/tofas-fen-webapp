import mongoose, { Schema, Document } from 'mongoose';

/**
 * Refresh Token model for token rotation with family detection.
 *
 * Each refresh token belongs to a "family" (identified by familyId).
 * When a refresh token is used, it's marked as used and a new one is created
 * in the same family. If a used token is presented again (replay attack),
 * the entire family is invalidated.
 */
export interface IRefreshToken extends Document {
  token: string; // Hashed token
  userId: string;
  familyId: string; // Token family for rotation detection
  isUsed: boolean; // Has this token been rotated
  isRevoked: boolean; // Manually revoked
  expiresAt: Date;
  createdAt: Date;
  usedAt?: Date;
  replacedByToken?: string; // Hash of the replacement token
  userAgent?: string;
  ipAddress?: string;
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  familyId: {
    type: String,
    required: true,
    index: true,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  isRevoked: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // TTL index: auto-delete expired tokens
  },
  usedAt: Date,
  replacedByToken: String,
  userAgent: String,
  ipAddress: String,
}, {
  timestamps: true,
});

// Compound indexes for common queries
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });
RefreshTokenSchema.index({ familyId: 1, isUsed: 1 });

export const RefreshToken = mongoose.models.RefreshToken || mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
