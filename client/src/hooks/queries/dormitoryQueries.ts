/**
 * Dormitory-related React Query hooks
 */

import { useApiQuery, useApiMutation, queryKeys } from '../useReactQuery';
import { SecureAPI } from '../../utils/api';

// Get meals list
export function useMeals(date?: string) {
  return useApiQuery(
    queryKeys.dormitory.meals(date),
    async () => {
      const url = date 
        ? `/api/meals?date=${date}`
        : '/api/meals';
      const response = await SecureAPI.get<{ success: boolean; data: any[] }>(url);
      return response as any;
    },
    {
      staleTime: 30 * 60 * 1000, // 30 minutes - meals don't change frequently
    }
  );
}

// Get supervisors list
export function useSupervisors() {
  return useApiQuery(
    queryKeys.dormitory.supervisors,
    async () => {
      const response = await SecureAPI.get<{ success: boolean; data: any[] }>(
        '/api/supervisors'
      );
      return response as any;
    },
    {
      staleTime: 15 * 60 * 1000, // 15 minutes
    }
  );
}

// Get maintenance requests
export function useMaintenanceRequests(filters?: Record<string, unknown>) {
  return useApiQuery(
    queryKeys.dormitory.maintenanceRequests(filters),
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
        `/api/maintenance?${params.toString()}`
      );
      return response as any;
    }
  );
}

// Create maintenance request mutation
export function useCreateMaintenanceRequest() {
  return useApiMutation(
    async (data: {
      title: string;
      description: string;
      priority?: 'low' | 'medium' | 'high';
      location?: string;
    }) => {
      const response = await SecureAPI.post('/api/maintenance', data);
      return response as any;
    },
    {
      invalidateQueries: [queryKeys.dormitory.maintenanceRequests()],
      successMessage: 'Bakım talebi oluşturuldu',
    }
  );
}

// Update maintenance request mutation
export function useUpdateMaintenanceRequest() {
  return useApiMutation(
    async ({ id, ...data }: { 
      id: string; 
      status?: 'pending' | 'in-progress' | 'completed';
      priority?: 'low' | 'medium' | 'high';
    }) => {
      const response = await SecureAPI.put(`/api/maintenance/${id}`, data);
      return response as any;
    },
    {
      invalidateQueries: [queryKeys.dormitory.maintenanceRequests()],
      successMessage: 'Bakım talebi güncellendi',
    }
  );
}

