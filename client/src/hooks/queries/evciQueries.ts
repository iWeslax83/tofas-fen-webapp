/**
 * Evci Request-related React Query hooks
 */

import { useApiQuery, useApiMutation, queryKeys } from '../useReactQuery';
import { SecureAPI } from '../../utils/api';

// Get evci requests list
export function useEvciRequests(filters?: Record<string, unknown>) {
  return useApiQuery(
    queryKeys.evciRequests.list(filters),
    async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }
      const response = await SecureAPI.get<{ success: boolean; data: any[] }>(
        `/api/evci-requests?${params.toString()}`
      );
      return response as any;
    }
  );
}

// Get evci request detail
export function useEvciRequest(id: string) {
  return useApiQuery(
    queryKeys.evciRequests.detail(id),
    async () => {
      const response = await SecureAPI.get<{ success: boolean; data: any }>(
        `/api/evci-requests/${id}`
      );
      return response as any;
    },
    {
      enabled: !!id,
    }
  );
}

// Get student evci requests
export function useStudentEvciRequests(studentId: string) {
  return useApiQuery(
    queryKeys.evciRequests.student(studentId),
    async () => {
      const response = await SecureAPI.get<{ success: boolean; data: any[] }>(
        `/api/evci-requests/student/${studentId}`
      );
      return response as any;
    },
    {
      enabled: !!studentId,
    }
  );
}

// Create evci request mutation
export function useCreateEvciRequest() {
  return useApiMutation(
    async (data: {
      startDate: string;
      endDate: string;
      destination: string;
      description?: string;
    }) => {
      const response = await SecureAPI.post('/api/evci-requests', data);
      return response as any;
    },
    {
      invalidateQueries: [queryKeys.evciRequests.all],
      successMessage: 'Evci izni talebi oluşturuldu',
    }
  );
}

// Update evci request mutation (approve/reject)
export function useUpdateEvciRequest() {
  return useApiMutation(
    async ({ id, status, ...data }: { id: string; status: 'approved' | 'rejected'; reason?: string }) => {
      const response = await SecureAPI.put(`/api/evci-requests/${id}`, { status, ...data });
      return response as any;
    },
    {
      invalidateQueries: [queryKeys.evciRequests.all],
      successMessage: 'Evci izni güncellendi',
    }
  );
}

// Delete evci request mutation
export function useDeleteEvciRequest() {
  return useApiMutation(
    async (id: string) => {
      const response = await SecureAPI.delete(`/api/evci-requests/${id}`);
      return response as any;
    },
    {
      invalidateQueries: [queryKeys.evciRequests.all],
      successMessage: 'Evci izni talebi silindi',
    }
  );
}

