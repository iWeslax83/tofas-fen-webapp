/**
 * Calendar-related React Query hooks
 * Replaces direct SecureAPI usage in CalendarPage with cached, standardized hooks.
 */

import { useApiQuery, useApiMutation, queryKeys } from '../useReactQuery';
import { SecureAPI } from '../../utils/api';

// --- Query Keys (extend the central factory) ---
export const calendarKeys = {
  calendars: ['calendar', 'calendars'] as const,
  events: (filters?: Record<string, unknown>) => ['calendar', 'events', filters] as const,
  event: (id: string) => ['calendar', 'events', id] as const,
};

// --- Interfaces ---
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string;
  type: 'class' | 'exam' | 'activity' | 'meeting' | 'holiday' | 'personal' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  color: string;
  isRecurring: boolean;
  tags: string[];
  isPublic: boolean;
  allowedRoles: string[];
  createdBy: string;
  calendarId: string;
  attendees: {
    userId: string;
    role: 'organizer' | 'attendee' | 'optional';
    response: 'accepted' | 'declined' | 'pending' | 'tentative';
    user?: { adSoyad: string; email: string };
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  color: string;
  isDefault: boolean;
  isPublic: boolean;
  allowedRoles: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// --- Query Hooks ---

/** Fetch all calendars for the current user */
export function useCalendars() {
  return useApiQuery(calendarKeys.calendars, async () => {
    const response = await SecureAPI.get<{ success: boolean; data: Calendar[] }>(
      '/api/calendar/calendars',
    );
    return response as any;
  });
}

/** Fetch calendar events, optionally filtered */
export function useCalendarEvents(filters?: Record<string, unknown>) {
  return useApiQuery(calendarKeys.events(filters), async () => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const response = await SecureAPI.get<{ success: boolean; data: CalendarEvent[] }>(
      `/api/calendar/events?${params.toString()}`,
    );
    return response as any;
  });
}

/** Fetch a single calendar event by ID */
export function useCalendarEvent(id: string) {
  return useApiQuery(
    calendarKeys.event(id),
    async () => {
      const response = await SecureAPI.get<{ success: boolean; data: CalendarEvent }>(
        `/api/calendar/events/${id}`,
      );
      return response as any;
    },
    { enabled: !!id },
  );
}

// --- Mutation Hooks ---

/** Create a new calendar event */
export function useCreateCalendarEvent() {
  return useApiMutation(
    async (data: Partial<CalendarEvent>) => {
      const response = await SecureAPI.post('/api/calendar/events', data);
      return response as any;
    },
    {
      invalidateQueries: [calendarKeys.calendars, calendarKeys.events()],
      successMessage: 'Etkinlik oluşturuldu',
    },
  );
}

/** Update an existing calendar event */
export function useUpdateCalendarEvent() {
  return useApiMutation(
    async ({ id, ...data }: { id: string } & Partial<CalendarEvent>) => {
      const response = await SecureAPI.put(`/api/calendar/events/${id}`, data);
      return response as any;
    },
    {
      invalidateQueries: [calendarKeys.calendars, calendarKeys.events()],
      successMessage: 'Etkinlik güncellendi',
    },
  );
}

/** Delete a calendar event */
export function useDeleteCalendarEvent() {
  return useApiMutation(
    async (id: string) => {
      const response = await SecureAPI.delete(`/api/calendar/events/${id}`);
      return response as any;
    },
    {
      invalidateQueries: [calendarKeys.calendars, calendarKeys.events()],
      successMessage: 'Etkinlik silindi',
    },
  );
}
