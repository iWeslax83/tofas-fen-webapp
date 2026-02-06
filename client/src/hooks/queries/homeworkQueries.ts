/**
 * Homework-related React Query hooks
 */

import { useApiQuery, useApiMutation, usePaginatedQuery, queryKeys } from '../useReactQuery';
import { SecureAPI } from '../../utils/api';

// Get homeworks list
export function useHomeworks(filters?: Record<string, unknown>) {
  return useApiQuery(
    queryKeys.homeworks.list(filters),
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
        `/api/homeworks?${params.toString()}`
      );
      return response as any;
    }
  );
}

// Get paginated homeworks
export function usePaginatedHomeworks(
  page: number = 1,
  limit: number = 20,
  filters?: Record<string, unknown>
) {
  return usePaginatedQuery(
    queryKeys.homeworks.list(filters),
    async (p, l) => {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(l),
      });
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }
      const response = await SecureAPI.get<{ success: boolean; data: any[]; pagination: any }>(
        `/api/homeworks?${params.toString()}`
      );
      return response as any;
    },
    { initialPage: page, initialLimit: limit }
  );
}

// Get homework detail
export function useHomework(id: string) {
  return useApiQuery(
    queryKeys.homeworks.detail(id),
    async () => {
      const response = await SecureAPI.get<{ success: boolean; data: any }>(
        `/api/homeworks/${id}`
      );
      return response as any;
    },
    {
      enabled: !!id,
    }
  );
}

// Get student homeworks
export function useStudentHomeworks(studentId: string) {
  return useApiQuery(
    queryKeys.homeworks.student(studentId),
    async () => {
      const response = await SecureAPI.get<{ success: boolean; data: any[] }>(
        `/api/homeworks/student/${studentId}`
      );
      return response as any;
    },
    {
      enabled: !!studentId,
    }
  );
}

// Create homework mutation
export function useCreateHomework() {
  return useApiMutation(
    async (data: {
      title: string;
      description: string;
      dueDate: string;
      classId?: string;
      studentIds?: string[];
    }) => {
      const response = await SecureAPI.post('/api/homeworks', data);
      return response as any;
    },
    {
      invalidateQueries: [[...queryKeys.homeworks.all]],
      successMessage: 'Ödev oluşturuldu',
    }
  );
}

// Update homework mutation
export function useUpdateHomework() {
  return useApiMutation(
    async ({ id, ...data }: { id: string; title?: string; description?: string; dueDate?: string }) => {
      const response = await SecureAPI.put(`/api/homeworks/${id}`, data);
      return response as any;
    },
    {
      invalidateQueries: [[...queryKeys.homeworks.all]],
      successMessage: 'Ödev güncellendi',
    }
  );
}

// Delete homework mutation
export function useDeleteHomework() {
  return useApiMutation(
    async (id: string) => {
      const response = await SecureAPI.delete(`/api/homeworks/${id}`);
      return response as any;
    },
    {
      invalidateQueries: [[...queryKeys.homeworks.all]],
      successMessage: 'Ödev silindi',
    }
  );
}

