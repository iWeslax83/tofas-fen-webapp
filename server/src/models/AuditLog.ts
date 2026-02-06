import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId: string;
  userRole: string;
  userName: string;
  action: string; // 'create', 'update', 'delete', 'login', 'logout', 'approve', 'reject', etc.
  resourceType: string; // 'user', 'note', 'evci_request', 'dormitory', 'attendance', etc.
  resourceId?: string; // ID of the affected resource
  details?: any; // Additional details about the action
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure' | 'error';
  errorMessage?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  userRole: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create', 'update', 'delete', 'login', 'logout',
      'approve', 'reject', 'view', 'export', 'import',
      'password_reset', 'account_activation', 'account_deactivation',
      'permission_grant', 'permission_revoke', 'role_change'
    ],
    index: true
  },
  resourceType: {
    type: String,
    required: true,
    enum: [
      'user', 'note', 'evci_request', 'carzi_request', 'dilekce',
      'dormitory', 'attendance', 'homework', 'announcement',
      'club', 'schedule', 'maintenance_request', 'system'
    ],
    index: true
  },
  resourceId: {
    type: String,
    index: true
  },
  details: {
    type: Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  status: {
    type: String,
    required: true,
    enum: ['success', 'failure', 'error'],
    default: 'success',
    index: true
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Only track creation time
});

// Compound indexes for common queries
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ userRole: 1, createdAt: -1 });
AuditLogSchema.index({ status: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 }); // For time-based queries

// TTL index - logs older than 1 year will be automatically deleted
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // 1 year

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

