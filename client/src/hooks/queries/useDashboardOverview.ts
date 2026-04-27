/**
 * Dashboard overview React Query hook.
 * Talks to GET /api/v1/dashboard/overview (PR-07/08).
 */

import { useApiQuery } from '../useReactQuery';
import { SecureAPI } from '../../utils/api';

export interface ClassRanking {
  rank: number;
  classSize: number;
}

export interface StudentOverview {
  averageGrade: { value: number; deltaMonthly: number; trend: number[] };
  pendingHomework: { total: number; dueToday: number; completed: number };
  attendance: { percent: number; last30Days: boolean[] };
  nextClass: null | {
    subject: string;
    teacher: string;
    room: string;
    startsAt: string;
    topic: string;
  };
  nextExam: null | { subject: string; date: string; daysUntil: number };
  classRanking: ClassRanking;
  unreadNotifications: number;
}

export interface DashboardOverviewResponse {
  role: string;
  overview: StudentOverview | null;
}

export function useDashboardOverview() {
  return useApiQuery(
    ['dashboard', 'overview'],
    async () => {
      const res = await SecureAPI.get<{ success: boolean; data: DashboardOverviewResponse }>(
        '/api/v1/dashboard/overview',
      );
      return res.data;
    },
    { staleTime: 60_000 },
  );
}
