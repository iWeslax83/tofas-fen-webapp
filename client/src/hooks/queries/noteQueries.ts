/**
 * Note-related React Query hooks
 *
 * F-H2: API responses are typed through the existing `ApiResponse<T>`
 * envelope instead of `any`. `SecureAPI.get<T>` currently hands back the
 * raw axios response inside a `{ data: ApiResponse<T> }` shape, so we
 * unwrap through `unknown` and return the envelope. `useApiQuery` /
 * `useApiMutation` both expect `Promise<ApiResponse<T>>`, matching the
 * rest of the project's query hook contract.
 */

import { useApiQuery, useApiMutation, queryKeys } from '../useReactQuery';
import { SecureAPI, ApiResponse } from '../../utils/api';

export interface Note {
  _id: string;
  studentId: string;
  studentName: string;
  lesson: string;
  exam1?: number;
  exam2?: number;
  exam3?: number;
  oral?: number;
  project?: number;
  average: number;
  semester: string;
  academicYear: string;
  teacherName?: string;
  source: 'manual' | 'meb_eokul' | 'imported';
  lastUpdated: string;
  notes?: string;
  gradeLevel?: string;
  classSection?: string;
}

export interface NoteStats {
  total: number;
  average: number;
  byLesson?: Record<string, { count: number; average: number }>;
  bySemester?: Record<string, { count: number; average: number }>;
}

// SecureAPI.get<T> types its return as T but actually returns the raw axios
// response `{ data: T, status: number, ... }`. Unwrap through `unknown` to
// the envelope and accept that a missing payload means an empty envelope.
function unwrapAxiosEnvelope<T>(response: unknown): ApiResponse<T> {
  const payload = (response as { data?: ApiResponse<T> })?.data;
  if (payload && typeof payload === 'object' && 'success' in payload) {
    return payload;
  }
  return { success: false, statusCode: 0 };
}

function buildQueryString(filters?: Record<string, unknown>): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  return params.toString();
}

// Get notes list
export function useNotes(filters?: Record<string, unknown>) {
  return useApiQuery<Note[]>(queryKeys.notes.list(filters), async () => {
    const qs = buildQueryString(filters);
    const response = await SecureAPI.get<unknown>(`/api/notes${qs ? `?${qs}` : ''}`);
    return unwrapAxiosEnvelope<Note[]>(response);
  });
}

// Get notes for a specific student
export function useStudentNotes(studentId: string) {
  return useApiQuery<Note[]>(
    queryKeys.notes.student(studentId),
    async () => {
      const response = await SecureAPI.get<unknown>(
        `/api/notes?studentId=${encodeURIComponent(studentId)}`,
      );
      return unwrapAxiosEnvelope<Note[]>(response);
    },
    {
      enabled: !!studentId,
    },
  );
}

// Get note statistics
export function useNoteStats(filters?: Record<string, unknown>) {
  return useApiQuery<NoteStats>(queryKeys.notes.stats(filters), async () => {
    const qs = buildQueryString(filters);
    const response = await SecureAPI.get<unknown>(`/api/notes/stats${qs ? `?${qs}` : ''}`);
    return unwrapAxiosEnvelope<NoteStats>(response);
  });
}

// Create note mutation
export function useCreateNote() {
  return useApiMutation<
    Note,
    {
      adSoyad: string;
      ders: string;
      sinav1: number;
      sinav2: number;
      sozlu: number;
      donem?: string;
      sinif?: string;
      sube?: string;
    }
  >(
    async (data) => {
      const response = await SecureAPI.post<unknown>('/api/notes', data);
      return unwrapAxiosEnvelope<Note>(response);
    },
    {
      invalidateQueries: [[...queryKeys.notes.all]],
      successMessage: 'Not eklendi',
    },
  );
}

// Update note mutation
export function useUpdateNote() {
  return useApiMutation<Note, { id: string; sinav1?: number; sinav2?: number; sozlu?: number }>(
    async ({ id, ...data }) => {
      const response = await SecureAPI.put<unknown>(`/api/notes/${id}`, data);
      return unwrapAxiosEnvelope<Note>(response);
    },
    {
      invalidateQueries: [[...queryKeys.notes.all]],
      successMessage: 'Not güncellendi',
    },
  );
}

// Delete note mutation
export function useDeleteNote() {
  return useApiMutation<{ deleted: boolean }, string>(
    async (id) => {
      const response = await SecureAPI.delete<unknown>(`/api/notes/${id}`);
      return unwrapAxiosEnvelope<{ deleted: boolean }>(response);
    },
    {
      invalidateQueries: [[...queryKeys.notes.all]],
      successMessage: 'Not silindi',
    },
  );
}
