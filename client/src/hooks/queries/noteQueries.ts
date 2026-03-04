/**
 * Note-related React Query hooks
 */

import { useApiQuery, useApiMutation, queryKeys } from '../useReactQuery';
import { SecureAPI } from '../../utils/api';

// Get notes list
export function useNotes(filters?: Record<string, unknown>) {
  return useApiQuery(
    queryKeys.notes.list(filters),
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
        `/api/notes?${params.toString()}`
      );
      return (response as any).data;
    }
  );
}

// Get notes for a specific student
export function useStudentNotes(studentId: string) {
  return useApiQuery(
    queryKeys.notes.student(studentId),
    async () => {
      const response = await SecureAPI.get<{ success: boolean; data: any[] }>(
        `/api/notes?studentId=${studentId}`
      );
      return response as any;
    },
    {
      enabled: !!studentId,
    }
  );
}

// Get note statistics
export function useNoteStats(filters?: Record<string, unknown>) {
  return useApiQuery(
    queryKeys.notes.stats(filters),
    async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }
      const response = await SecureAPI.get<{ success: boolean; data: any }>(
        `/api/notes/stats?${params.toString()}`
      );
      return response as any;
    }
  );
}

// Create note mutation
export function useCreateNote() {
  return useApiMutation(
    async (data: {
      adSoyad: string;
      ders: string;
      sinav1: number;
      sinav2: number;
      sozlu: number;
      donem?: string;
      sinif?: string;
      sube?: string;
    }) => {
      const response = await SecureAPI.post('/api/notes', data);
      return response as any;
    },
    {
      invalidateQueries: [[...queryKeys.notes.all]],
      successMessage: 'Not eklendi',
    }
  );
}

// Update note mutation
export function useUpdateNote() {
  return useApiMutation(
    async ({ id, ...data }: { id: string; sinav1?: number; sinav2?: number; sozlu?: number }) => {
      const response = await SecureAPI.put(`/api/notes/${id}`, data);
      return response as any;
    },
    {
      invalidateQueries: [[...queryKeys.notes.all]],
      successMessage: 'Not güncellendi',
    }
  );
}

// Delete note mutation
export function useDeleteNote() {
  return useApiMutation(
    async (id: string) => {
      const response = await SecureAPI.delete(`/api/notes/${id}`);
      return response as any;
    },
    {
      invalidateQueries: [[...queryKeys.notes.all]],
      successMessage: 'Not silindi',
    }
  );
}
