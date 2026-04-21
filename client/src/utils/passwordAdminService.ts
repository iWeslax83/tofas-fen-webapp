import { apiClient } from './api';
import { PASSWORD_ADMIN_ENDPOINTS } from './apiEndpoints';

export interface GeneratedPasswordResponse {
  password: string;
  userId: string;
}

export interface BulkImportPreviewResponse {
  total: number;
  warnings: string[];
  existingIds: string[];
  sample: Array<{ id: string; adSoyad: string; sinif: string; sube: string; pansiyon: boolean }>;
  classDistribution: Record<string, number>;
}

export interface BulkImportResponse {
  batchId: string;
  imported: number;
  skipped: string[];
  warnings: string[];
  credentialsFileBase64: string;
  credentialsFilename: string;
}

export interface PendingBatch {
  batchId: string;
  adminId: string;
  userIds: string[];
  totalCount: number;
  status: 'pending';
  createdAt: string;
}

export interface AuditLogItem {
  _id: string;
  userId: string;
  userSnapshot: { id: string; adSoyad: string; rol: string };
  adminId: string;
  adminSnapshot: { id: string; adSoyad: string };
  action: 'bulk_import' | 'admin_generated' | 'admin_reset';
  reason: string;
  reasonNote?: string;
  batchId?: string;
  ip?: string;
  createdAt: string;
}

export class PasswordAdminService {
  static async previewBulkImport(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await apiClient.post<BulkImportPreviewResponse>(
      PASSWORD_ADMIN_ENDPOINTS.BULK_IMPORT_PREVIEW,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  }

  static async runBulkImport(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await apiClient.post<BulkImportResponse>(
      PASSWORD_ADMIN_ENDPOINTS.BULK_IMPORT,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  }

  static async activateBatch(batchId: string) {
    const { data } = await apiClient.post<{ activated: number }>(
      PASSWORD_ADMIN_ENDPOINTS.ACTIVATE_BATCH,
      { batchId },
    );
    return data;
  }

  static async regenerateBatch(batchId: string) {
    const { data } = await apiClient.post<BulkImportResponse>(
      PASSWORD_ADMIN_ENDPOINTS.REGENERATE_BATCH(batchId),
    );
    return data;
  }

  static async cancelBatch(batchId: string) {
    const { data } = await apiClient.delete<{ cancelled: number }>(
      PASSWORD_ADMIN_ENDPOINTS.CANCEL_BATCH(batchId),
    );
    return data;
  }

  static async listPendingBatches() {
    const { data } = await apiClient.get<{ items: PendingBatch[] }>(
      PASSWORD_ADMIN_ENDPOINTS.PENDING_BATCHES,
    );
    return data.items;
  }

  static async resetPassword(userId: string, reason: string, reasonNote?: string) {
    const { data } = await apiClient.post<GeneratedPasswordResponse>(
      PASSWORD_ADMIN_ENDPOINTS.RESET(userId),
      { reason, reasonNote },
    );
    return data;
  }

  static async generatePassword(userId: string, reason = 'new_user', reasonNote?: string) {
    const { data } = await apiClient.post<GeneratedPasswordResponse>(
      PASSWORD_ADMIN_ENDPOINTS.GENERATE(userId),
      { reason, reasonNote },
    );
    return data;
  }

  static async auditLog(params: Record<string, string | number | undefined>) {
    const { data } = await apiClient.get<{
      items: AuditLogItem[];
      total: number;
      page: number;
      limit: number;
    }>(PASSWORD_ADMIN_ENDPOINTS.AUDIT, { params });
    return data;
  }
}
