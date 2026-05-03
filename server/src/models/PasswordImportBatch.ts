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
  credentialsXlsx?: Buffer;
  credentialsFilename?: string;
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
    // N-C1: bulk-import XLSX is held on the batch document instead of being
    // returned in JSON. Cleared (`$unset`) when the batch transitions to
    // activated/cancelled by the atomic findOneAndUpdate flows.
    credentialsXlsx: { type: Buffer, select: false },
    credentialsFilename: { type: String, select: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PasswordImportBatchSchema.index({ status: 1, createdAt: -1 });

export const PasswordImportBatch =
  mongoose.models.PasswordImportBatch ||
  mongoose.model<IPasswordImportBatch>('PasswordImportBatch', PasswordImportBatchSchema);
