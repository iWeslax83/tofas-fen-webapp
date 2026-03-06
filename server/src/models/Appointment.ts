import mongoose, { Schema, Document } from 'mongoose';

export interface IAppointment extends Document {
  applicantUserId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  date: Date;
  timeSlot: string; // e.g. "09:00-09:30"
  purpose: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  registrationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>({
  applicantUserId: { type: String, required: true, index: true },
  applicantName: { type: String, required: true },
  applicantEmail: { type: String, required: true },
  applicantPhone: { type: String, required: true },
  date: { type: Date, required: true, index: true },
  timeSlot: { type: String, required: true },
  purpose: { type: String, required: true },
  notes: { type: String },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  rejectionReason: { type: String },
  registrationId: { type: String, index: true }
}, {
  timestamps: true
});

AppointmentSchema.index({ status: 1, date: 1 });
AppointmentSchema.index({ applicantUserId: 1, status: 1 });

export const Appointment = mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema);
