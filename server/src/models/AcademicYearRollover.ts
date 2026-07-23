import mongoose, { Schema, Document } from 'mongoose';

export type RolloverStatus = 'proposed' | 'applied' | 'rolled_back' | 'cancelled';

export const ROLLOVER_STATUSES: RolloverStatus[] = [
  'proposed',
  'applied',
  'rolled_back',
  'cancelled',
];

export interface RolloverSnapshotEntry {
  userId: string;
  adSoyad: string;
  /** Terfi öncesi sınıf — geri alma bu değere döner. */
  fromSinif: string;
  action: 'promote' | 'graduate';
}

export interface IAcademicYearRollover extends Document {
  rolloverId: string;
  fromYear: string;
  toYear: string;
  status: RolloverStatus;
  snapshot: RolloverSnapshotEntry[];
  proposedAt: Date;
  appliedAt?: Date;
  appliedBy?: string;
  rolledBackAt?: Date;
  rolledBackBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
}

const SnapshotEntrySchema = new Schema<RolloverSnapshotEntry>(
  {
    userId: { type: String, required: true },
    adSoyad: { type: String, required: true },
    fromSinif: { type: String, required: true, enum: ['9', '10', '11', '12'] },
    action: { type: String, required: true, enum: ['promote', 'graduate'] },
  },
  { _id: false },
);

const AcademicYearRolloverSchema = new Schema<IAcademicYearRollover>({
  rolloverId: { type: String, required: true, unique: true, index: true },
  fromYear: { type: String, required: true },
  // Unique: cron'un yeniden çalışması, deploy sonrası restart veya adminin
  // elle tetiklemesi aynı yıl için ikinci bir geçiş üretemez.
  toYear: { type: String, required: true, unique: true, index: true },
  status: {
    type: String,
    enum: ROLLOVER_STATUSES,
    required: true,
    default: 'proposed',
    index: true,
  },
  snapshot: { type: [SnapshotEntrySchema], default: [] },
  proposedAt: { type: Date, required: true, default: () => new Date() },
  appliedAt: Date,
  appliedBy: String,
  rolledBackAt: Date,
  rolledBackBy: String,
  cancelledAt: Date,
  cancelledBy: String,
});

export const AcademicYearRollover =
  mongoose.models.AcademicYearRollover ||
  mongoose.model<IAcademicYearRollover>('AcademicYearRollover', AcademicYearRolloverSchema);
