import mongoose, { Schema, Document } from 'mongoose';

export interface IEvciWindowOverride extends Document {
  weekOf: string;
  isOpen: boolean;
  reason: string;
  createdBy: string;
}

const evciWindowOverrideSchema = new Schema<IEvciWindowOverride>({
  weekOf: { type: String, required: true, unique: true },
  isOpen: { type: Boolean, required: true },
  reason: { type: String, default: '' },
  createdBy: { type: String, required: true },
}, {
  timestamps: true,
});

export const EvciWindowOverride = mongoose.models.EvciWindowOverride || mongoose.model<IEvciWindowOverride>('EvciWindowOverride', evciWindowOverrideSchema);
