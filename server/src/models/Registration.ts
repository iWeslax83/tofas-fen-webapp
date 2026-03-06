import mongoose, { Schema, Document } from 'mongoose';

export interface IRegistration extends Document {
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  studentName: string;
  studentBirthDate?: Date;
  currentSchool?: string;
  targetClass: '9' | '10' | '11' | '12';
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'interview';
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdUserId?: string; // ID of created ziyaretci user account
  createdAt: Date;
  updatedAt: Date;
}

const RegistrationSchema = new Schema<IRegistration>({
  applicantName: { type: String, required: true },
  applicantEmail: { type: String, required: true },
  applicantPhone: { type: String, required: true },
  studentName: { type: String, required: true },
  studentBirthDate: { type: Date },
  currentSchool: { type: String },
  targetClass: {
    type: String,
    enum: ['9', '10', '11', '12'],
    required: true
  },
  parentName: { type: String, required: true },
  parentPhone: { type: String, required: true },
  parentEmail: { type: String },
  notes: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'interview'],
    default: 'pending',
    index: true
  },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  rejectionReason: { type: String },
  createdUserId: { type: String, index: true }
}, {
  timestamps: true
});

RegistrationSchema.index({ status: 1, createdAt: -1 });
RegistrationSchema.index({ applicantEmail: 1 });

export const Registration = mongoose.models.Registration || mongoose.model<IRegistration>('Registration', RegistrationSchema);
