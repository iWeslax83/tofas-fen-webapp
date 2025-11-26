/**
 * Announcement-related React Query hooks
 */

import { useApiQuery, useApiMutation, usePaginatedQuery, queryKeys } from '../useReactQuery';
import { SecureAPI } from '../../utils/api';

// Get announcements list
export function useAnnouncements(filters?: Record<string, unknown>) {
  return useApiQuery(
    queryKeys.announcements.list(filters),
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
        `/api/announcements?${params.toString()}`
      );
      return response as any;
    }
  );
}

// Get paginated announcements
export function usePaginatedAnnouncements(
  page: number = 1,
  limit: number = 20,
  filters?: Record<string, unknown>
) {
  return usePaginatedQuery(
    queryKeys.announcements.list(filters),
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
        `/api/announcements?${params.toString()}`
      );
      return response as any;
    },
    { initialPage: page, initialLimit: limit }
  );
}

// Get announcement detail
export function useAnnouncement(id: string) {
  return useApiQuery(
    queryKeys.announcements.detail(id),
    async () => {
      const response = await SecureAPI.get<{ success: boolean; data: any }>(
        `/api/announcements/${id}`
      );
      return response as any;
    },
    {
      enabled: !!id, // Only fetch if id is provided
    }
  );
}

// Create announcement mutation
export function useCreateAnnouncement() {
  return useApiMutation(
    async (data: {
      title: string;
      content: string;
      targetAudience?: string[];
      priority?: string;
    }) => {
      const response = await SecureAPI.post('/api/announcements', data);
      return response as any;
    },
    {
      invalidateQueries: [queryKeys.announcements.all],
      successMessage: 'Duyuru oluşturuldu',
    }
  );
}

// Update announcement mutation
export function useUpdateAnnouncement() {
  return useApiMutation(
    async ({ id, ...data }: { id: string; title?: string; content?: string }) => {
      const response = await SecureAPI.put(`/api/announcements/${id}`, data);
      return response as any;
    },
    {
      invalidateQueries: [queryKeys.announcements.all],
      successMessage: 'Duyuru güncellendi',
    }
  );
}

// Delete announcement mutation
export function useDeleteAnnouncement() {
  return useApiMutation(
    async (id: string) => {
      const response = await SecureAPI.delete(`/api/announcements/${id}`);
      return response as any;
    },
    {
      invalidateQueries: [queryKeys.announcements.all],
      successMessage: 'Duyuru silindi',
    }
  );
}

