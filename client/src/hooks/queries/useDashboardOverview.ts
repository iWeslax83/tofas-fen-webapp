/**
 * Dashboard overview React Query hook.
 * Talks to GET /api/dashboard/overview (PR-07/08).
 */

import { useApiQuery } from '../useReactQuery';
import { SecureAPI } from '../../utils/api';

export interface ClassRanking {
  rank: number;
  classSize: number;
}

export interface ScheduleEntry {
  id: string;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  isActive: boolean;
}

export interface HomeworkEntry {
  id: string;
  code: string;
  subject: string;
  dueLabel: string;
  urgent: boolean;
}

export interface AnnouncementSummary {
  title: string;
  body: string;
  fileNo: string;
  date: string;
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
  todaySchedule: ScheduleEntry[];
  homeworkQueue: HomeworkEntry[];
  announcement: AnnouncementSummary | null;
}

export interface AdminOverview {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  pendingRegistrations: number;
  pendingAppointments: number;
  pendingDilekce: number;
  pendingEvci: number;
  unreadNotifications: number;
}

export interface TeacherOverview {
  activeHomework: number;
  studentCount: number;
  pendingDilekce: number;
  unreadNotifications: number;
}

export interface ParentChildSummary {
  id: string;
  adSoyad: string;
  sinif: string;
  averageGrade: number;
}

export interface ParentOverview {
  children: ParentChildSummary[];
  pendingHomework: number;
  unreadNotifications: number;
}

export type RoleOverview = StudentOverview | AdminOverview | TeacherOverview | ParentOverview;

export interface DashboardOverviewResponse {
  role: 'student' | 'admin' | 'teacher' | 'parent' | 'hizmetli' | string;
  overview: RoleOverview | null;
}

export function useDashboardOverview() {
  return useApiQuery<DashboardOverviewResponse>(
    ['dashboard', 'overview'],
    async () => {
      // The endpoint returns the bare { role, overview } body. useApiQuery
      // requires an ApiResponse envelope (it throws unless `success` is
      // truthy), so wrap it here — otherwise the query always errors and
      // no dashboard KPIs ever render.
      const res = await SecureAPI.get<DashboardOverviewResponse>('/api/dashboard/overview');
      return { success: true, data: res.data, statusCode: res.status };
    },
    { staleTime: 60_000 },
  );
}
