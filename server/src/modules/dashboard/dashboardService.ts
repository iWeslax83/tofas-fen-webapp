import { Note } from '../../models/Note';
import { Homework } from '../../models/Homework';
import { Notification } from '../../models/Notification';
import { calculateClassRanking, type ClassRanking } from '../../services/rankingService';

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

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Aggregate the dashboard hero numbers for a single student in one
 * round-trip. The shape is consumed by PR-09 (`useDashboardOverview`).
 *
 * Several fields rely on data we don't yet collect (attendance,
 * next class lookups against the live timetable, exam calendar). They
 * return safe defaults so the UI can render placeholders. PR-09+ will
 * fill those gaps as the data layers come online.
 */
export async function getStudentOverview(userId: string, sinif?: string): Promise<StudentOverview> {
  const [notes, ranking, unreadNotifications, pendingActive, dueToday, completed] =
    await Promise.all([
      Note.find({ studentId: userId }).lean(),
      calculateClassRanking(userId),
      Notification.countDocuments({ userId, read: false }),
      Homework.countDocuments({ status: 'active', ...(sinif ? { gradeLevel: sinif } : {}) }),
      Homework.countDocuments({
        status: 'active',
        ...(sinif ? { gradeLevel: sinif } : {}),
        dueDate: { $gte: startOfDay(), $lte: endOfDay() },
      }),
      Homework.countDocuments({ status: 'completed', ...(sinif ? { gradeLevel: sinif } : {}) }),
    ]);

  const grades = notes.map((n) => n.average).filter((v): v is number => typeof v === 'number');
  const value = grades.length ? round1(grades.reduce((s, g) => s + g, 0) / grades.length) : 0;

  return {
    averageGrade: { value, deltaMonthly: 0, trend: [] },
    pendingHomework: { total: pendingActive, dueToday, completed },
    attendance: { percent: 0, last30Days: [] },
    nextClass: null,
    nextExam: null,
    classRanking: ranking,
    unreadNotifications,
  };
}
