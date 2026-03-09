import mongoose, { Schema, Document } from 'mongoose';

export interface IKvkkConsent extends Document {
  userId: string;
  consentType: 'data_processing' | 'data_sharing' | 'marketing' | 'cookies' | 'profiling';
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  version: string; // Policy version the consent was given for
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const KvkkConsentSchema = new Schema<IKvkkConsent>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  consentType: {
    type: String,
    enum: ['data_processing', 'data_sharing', 'marketing', 'cookies', 'profiling'],
    required: true,
  },
  granted: {
    type: Boolean,
    required: true,
  },
  grantedAt: Date,
  revokedAt: Date,
  ipAddress: String,
  userAgent: String,
  version: {
    type: String,
    required: true,
    default: '1.0',
  },
  description: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

KvkkConsentSchema.index({ userId: 1, consentType: 1 }, { unique: true });
KvkkConsentSchema.index({ consentType: 1, granted: 1 });

export interface IDataDeletionRequest extends Document {
  userId: string;
  requestedAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  reason?: string;
  rejectionReason?: string;
  processedBy?: string;
  deletedData?: string[];
  retainedData?: string[];
  retainReason?: string;
}

const DataDeletionRequestSchema = new Schema<IDataDeletionRequest>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  requestedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  processedAt: Date,
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected'],
    default: 'pending',
    index: true,
  },
  reason: String,
  rejectionReason: String,
  processedBy: String,
  deletedData: [String],
  retainedData: [String],
  retainReason: String,
}, {
  timestamps: true,
});

export const KvkkConsent = mongoose.models.KvkkConsent || mongoose.model<IKvkkConsent>('KvkkConsent', KvkkConsentSchema);
export const DataDeletionRequest = mongoose.models.DataDeletionRequest || mongoose.model<IDataDeletionRequest>('DataDeletionRequest', DataDeletionRequestSchema);
