/**
 * React Query Hooks for Tofas Fen Webapp
 *
 * This file provides standardized data fetching hooks using TanStack Query.
 * It replaces the custom useApi hooks with React Query's powerful caching,
 * background refetching, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { ApiResponse, PaginatedResponse } from '../utils/api';
import { toast } from 'sonner';

// Query Keys Factory - Centralized query key management
export const queryKeys = {
  // Auth
  auth: {
    me: ['auth', 'me'] as const,
    profile: (userId: string) => ['auth', 'profile', userId] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    list: (filters?: Record<string, unknown>) => ['users', 'list', filters] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },

  // Announcements
  announcements: {
    all: ['announcements'] as const,
    list: (filters?: Record<string, unknown>) => ['announcements', 'list', filters] as const,
    detail: (id: string) => ['announcements', 'detail', id] as const,
  },

  // Homeworks
  homeworks: {
    all: ['homeworks'] as const,
    list: (filters?: Record<string, unknown>) => ['homeworks', 'list', filters] as const,
    detail: (id: string) => ['homeworks', 'detail', id] as const,
    student: (studentId: string) => ['homeworks', 'student', studentId] as const,
  },

  // Notes
  notes: {
    all: ['notes'] as const,
    list: (filters?: Record<string, unknown>) => ['notes', 'list', filters] as const,
    detail: (id: string) => ['notes', 'detail', id] as const,
    student: (studentId: string) => ['notes', 'student', studentId] as const,
    stats: (filters?: Record<string, unknown>) => ['notes', 'stats', filters] as const,
    studentStats: (studentId: string) => ['notes', 'studentStats', studentId] as const,
  },

  // Evci Requests
  evciRequests: {
    all: ['evci-requests'] as const,
    list: (filters?: Record<string, unknown>) => ['evci-requests', 'list', filters] as const,
    detail: (id: string) => ['evci-requests', 'detail', id] as const,
    student: (studentId: string) => ['evci-requests', 'student', studentId] as const,
  },

  // Dormitory
  dormitory: {
    meals: (date?: string) => ['dormitory', 'meals', date] as const,
    supervisors: ['dormitory', 'supervisors'] as const,
    maintenanceRequests: (filters?: Record<string, unknown>) =>
      ['dormitory', 'maintenance-requests', filters] as const,
  },

  // Schedule
  schedule: {
    all: ['schedule'] as const,
    class: (classId: string) => ['schedule', 'class', classId] as const,
    teacher: (teacherId: string) => ['schedule', 'teacher', teacherId] as const,
  },

  // Files
  files: {
    all: (filters?: Record<string, unknown>) => ['files', filters] as const,
    folders: (parentId?: string) => ['files', 'folders', parentId] as const,
    stats: ['files', 'stats'] as const,
  },

  // Analytics
  analytics: {
    dashboard: (role: string) => ['analytics', 'dashboard', role] as const,
    performance: (filters?: Record<string, unknown>) =>
      ['analytics', 'performance', filters] as const,
  },
} as const;

// Generic query hook factory
export function useApiQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<ApiResponse<T>>,
  options?: Omit<UseQueryOptions<ApiResponse<T>, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await queryFn();
      if (!response.success) {
        throw new Error(response.error || 'API isteği başarısız');
      }
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes default
    gcTime: 10 * 60 * 1000, // 10 minutes default
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error instanceof Error && error.message.includes('4')) {
        return false;
      }
      return failureCount < 2;
    },
    ...options,
  });
}

// Generic mutation hook factory
export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options?: {
    onSuccess?: (data: ApiResponse<TData>, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    invalidateQueries?: (readonly unknown[])[];
    showToast?: boolean;
    successMessage?: string;
    errorMessage?: string;
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const response = await mutationFn(variables);
      if (!response.success) {
        throw new Error(response.error || 'İşlem başarısız oldu');
      }
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      // Show success toast
      if (options?.showToast !== false) {
        toast.success(options?.successMessage || data.message || 'İşlem başarılı');
      }

      // Call custom onSuccess
      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      // Show error toast
      if (options?.showToast !== false) {
        toast.error(options?.errorMessage || error.message || 'İşlem başarısız');
      }

      // Call custom onError
      options?.onError?.(error, variables);
    },
  });
}

// Paginated query hook
export function usePaginatedQuery<T>(
  queryKey: readonly unknown[],
  queryFn: (page: number, limit: number) => Promise<PaginatedResponse<T>>,
  options?: {
    initialPage?: number;
    initialLimit?: number;
  } & Omit<UseQueryOptions<PaginatedResponse<T>, Error>, 'queryKey' | 'queryFn'>,
) {
  const page = options?.initialPage ?? 1;
  const limit = options?.initialLimit ?? 20;

  return useQuery({
    queryKey: [...queryKey, page, limit],
    queryFn: () => queryFn(page, limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

// Prefetch hook
export function usePrefetch() {
  const queryClient = useQueryClient();

  return {
    prefetch: <T>(queryKey: readonly unknown[], queryFn: () => Promise<ApiResponse<T>>) => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
          const response = await queryFn();
          if (!response.success) {
            throw new Error(response.error || 'Prefetch failed');
          }
          return response;
        },
      });
    },
  };
}
