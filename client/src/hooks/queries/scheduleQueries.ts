/**
 * Schedule-related React Query hooks
 * Standardized hooks for class/teacher schedule endpoints.
 */

import { useApiQuery, useApiMutation, queryKeys } from '../useReactQuery';
import { SecureAPI } from '../../utils/api';

// --- Interfaces ---
export interface ScheduleEntry {
  id: string;
  day: number; // 0=Sunday .. 6=Saturday
  startTime: string; // "08:30"
  endTime: string; // "09:15"
  subject: string;
  teacherId: string;
  teacherName?: string;
  classId: string;
  className?: string;
  room?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Query Hooks ---

/** Fetch full schedule list */
export function useSchedule() {
  return useApiQuery(queryKeys.schedule.all, async () => {
    const response = await SecureAPI.get<{ success: boolean; data: ScheduleEntry[] }>(
      '/api/schedule',
    );
    return response as any;
  });
}

/** Fetch schedule for a specific class */
export function useClassSchedule(classId: string) {
  return useApiQuery(
    queryKeys.schedule.class(classId),
    async () => {
      const response = await SecureAPI.get<{ success: boolean; data: ScheduleEntry[] }>(
        `/api/schedule/class/${classId}`,
      );
      return response as any;
    },
    { enabled: !!classId },
  );
}

/** Fetch schedule for a specific teacher */
export function useTeacherSchedule(teacherId: string) {
  return useApiQuery(
    queryKeys.schedule.teacher(teacherId),
    async () => {
      const response = await SecureAPI.get<{ success: boolean; data: ScheduleEntry[] }>(
        `/api/schedule/teacher/${teacherId}`,
      );
      return response as any;
    },
    { enabled: !!teacherId },
  );
}

// --- Mutation Hooks ---

/** Create a new schedule entry */
export function useCreateScheduleEntry() {
  return useApiMutation(
    async (data: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await SecureAPI.post('/api/schedule', data);
      return response as any;
    },
    {
      invalidateQueries: [[...queryKeys.schedule.all]],
      successMessage: 'Ders programı eklendi',
    },
  );
}

/** Update a schedule entry */
export function useUpdateScheduleEntry() {
  return useApiMutation(
    async ({ id, ...data }: { id: string } & Partial<ScheduleEntry>) => {
      const response = await SecureAPI.put(`/api/schedule/${id}`, data);
      return response as any;
    },
    {
      invalidateQueries: [[...queryKeys.schedule.all]],
      successMessage: 'Ders programı güncellendi',
    },
  );
}

/** Delete a schedule entry */
export function useDeleteScheduleEntry() {
  return useApiMutation(
    async (id: string) => {
      const response = await SecureAPI.delete(`/api/schedule/${id}`);
      return response as any;
    },
    {
      invalidateQueries: [[...queryKeys.schedule.all]],
      successMessage: 'Ders programı silindi',
    },
  );
}
