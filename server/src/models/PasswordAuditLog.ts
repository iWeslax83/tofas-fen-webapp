import mongoose, { Schema, Document } from 'mongoose';

export type PasswordAuditAction = 'bulk_import' | 'admin_generated' | 'admin_reset';
export type PasswordAuditReason = 'forgot' | 'security' | 'new_user' | 'bulk_import' | 'other';

export const PASSWORD_AUDIT_ACTIONS: PasswordAuditAction[] = [
  'bulk_import',
  'admin_generated',
  'admin_reset',
];
export const PASSWORD_AUDIT_REASONS: PasswordAuditReason[] = [
  'forgot',
  'security',
  'new_user',
  'bulk_import',
  'other',
];

export interface IPasswordAuditLog extends Document {
  userId: string;
  userSnapshot: { id: string; adSoyad: string; rol: string };
  adminId: string;
  adminSnapshot: { id: string; adSoyad: string };
  action: PasswordAuditAction;
  reason: PasswordAuditReason;
  reasonNote?: string;
  batchId?: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const PasswordAuditLogSchema = new Schema<IPasswordAuditLog>(
  {
    userId: { type: String, required: true, index: true },
    userSnapshot: {
      id: { type: String, required: true },
      adSoyad: { type: String, required: true },
      rol: { type: String, required: true },
    },
    adminId: { type: String, required: true, index: true },
    adminSnapshot: {
      id: { type: String, required: true },
      adSoyad: { type: String, required: true },
    },
    action: { type: String, enum: PASSWORD_AUDIT_ACTIONS, required: true, index: true },
    reason: { type: String, enum: PASSWORD_AUDIT_REASONS, required: true },
    reasonNote: { type: String, maxlength: 280 },
    batchId: { type: String, index: true, sparse: true },
    ip: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PasswordAuditLogSchema.index({ userId: 1, createdAt: -1 });
PasswordAuditLogSchema.index({ adminId: 1, createdAt: -1 });
PasswordAuditLogSchema.index({ action: 1, createdAt: -1 });

// N-L4: KVKK retention. Audit log auto-purges after 365 days. The TTL
// monitor runs at most once a minute, so deletes lag the boundary
// slightly — acceptable for a 1-year window.
PasswordAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });

export const PasswordAuditLog =
  mongoose.models.PasswordAuditLog ||
  mongoose.model<IPasswordAuditLog>('PasswordAuditLog', PasswordAuditLogSchema);
