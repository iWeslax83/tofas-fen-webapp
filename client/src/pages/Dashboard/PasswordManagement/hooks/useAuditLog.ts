import { useQuery } from '@tanstack/react-query';
import { PasswordAdminService } from '../../../../utils/passwordAdminService';

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  userId?: string;
  adminId?: string;
  action?: string;
  reason?: string;
  from?: string;
  to?: string;
}

export function useAuditLog(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ['passwordAdmin', 'audit', filters],
    queryFn: () =>
      PasswordAdminService.auditLog(filters as Record<string, string | number | undefined>),
  });
}
