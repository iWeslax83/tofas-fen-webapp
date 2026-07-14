/** Mirrors the ISchedule document served by GET /api/schedule. */

export interface SchedulePeriod {
  period: number;
  subject: string;
  teacherId?: string;
  teacherName?: string;
  room?: string;
  startTime?: string;
  endTime?: string;
}

export interface ScheduleDay {
  day: string;
  periods: SchedulePeriod[];
}

export interface ClassSchedule {
  id: string;
  classLevel: string;
  classSection: string;
  academicYear: string;
  semester: string;
  schedule: ScheduleDay[];
  isActive: boolean;
}
