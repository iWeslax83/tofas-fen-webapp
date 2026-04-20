import mongoose, { Schema, Document } from 'mongoose';

export type PasswordImportBatchStatus = 'pending' | 'activated' | 'cancelled';

export const PASSWORD_IMPORT_BATCH_STATUSES: PasswordImportBatchStatus[] = [
  'pending',
  'activated',
  'cancelled',
];

export interface IPasswordImportBatch extends Document {
  batchId: string;
  adminId: string;
  userIds: string[];
  totalCount: number;
  status: PasswordImportBatchStatus;
  createdAt: Date;
  activatedAt?: Date;
  cancelledAt?: Date;
}

const PasswordImportBatchSchema = new Schema<IPasswordImportBatch>(
  {
    batchId: { type: String, required: true, unique: true, index: true },
    adminId: { type: String, required: true, index: true },
    userIds: [{ type: String }],
    totalCount: { type: Number, required: true },
    status: {
      type: String,
      enum: PASSWORD_IMPORT_BATCH_STATUSES,
      required: true,
      default: 'pending',
      index: true,
    },
    activatedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PasswordImportBatchSchema.index({ status: 1, createdAt: -1 });

export const PasswordImportBatch =
  mongoose.models.PasswordImportBatch ||
  mongoose.model<IPasswordImportBatch>('PasswordImportBatch', PasswordImportBatchSchema);
