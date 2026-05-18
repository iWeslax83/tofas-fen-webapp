import Note from '../../models/Note';
import { Homework } from '../../models/Homework';
import { Notification } from '../../models/Notification';
import { User } from '../../models/User';
import { Registration } from '../../models/Registration';
import { Appointment } from '../../models/Appointment';
import { Dilekce } from '../../models/Dilekce';
import { EvciRequest } from '../../models/EvciRequest';
import { Schedule } from '../../models/Schedule';
import Announcement from '../../models/Announcement';
import { calculateClassRanking, type ClassRanking } from '../../services/rankingService';

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

// JS getDay() (0=Sun) → Turkish school weekday. Weekend → null (no lessons).
const TR_WEEKDAYS: Record<number, string | undefined> = {
  1: 'Pazartesi',
  2: 'Salı',
  3: 'Çarşamba',
  4: 'Perşembe',
  5: 'Cuma',
};

/**
 * Turkish school weekday for the schedule panel. On weekends there are no
 * lessons "today", so fall back to the next school day (Monday) — a
 * boarding-school dashboard should still surface the upcoming timetable
 * rather than render an empty section.
 */
const scheduleWeekday = (d = new Date()): string => TR_WEEKDAYS[d.getDay()] ?? 'Pazartesi';

const hhmm = (d = new Date()) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const dueLabelFor = (due: Date): { label: string; urgent: boolean } => {
  const days = Math.ceil((startOfDay(due).getTime() - startOfDay().getTime()) / 86_400_000);
  if (days < 0) return { label: 'Gecikmiş', urgent: true };
  if (days === 0) return { label: 'Bugün', urgent: true };
  if (days === 1) return { label: 'Yarın', urgent: true };
  return { label: `${days} gün`, urgent: days <= 3 };
};

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Aggregate the dashboard hero numbers for a single student in one
 * round-trip. Pulls the real timetable (today's periods), active homework
 * queue, latest targeted announcement, and a grade trend for the sparkline.
 *
 * Attendance / nextExam stay as safe defaults — there is no attendance or
 * exam data model yet, so the UI hides those sections rather than faking
 * numbers.
 */
export async function getStudentOverview(userId: string, sinif?: string): Promise<StudentOverview> {
  const student = await User.findOne({ id: userId }).lean<{
    sinif?: string;
    sube?: string;
  }>();
  const classLevel = sinif ?? student?.sinif;
  const classSection = student?.sube;
  const classFilter = classLevel ? { classLevel } : {};

  const [
    notes,
    ranking,
    unreadNotifications,
    pendingActive,
    dueToday,
    completed,
    scheduleDoc,
    homeworks,
    ann,
  ] = await Promise.all([
    Note.find({ studentId: userId }).sort({ createdAt: 1 }).lean(),
    calculateClassRanking(userId),
    Notification.countDocuments({ userId, read: false }),
    Homework.countDocuments({ status: 'active', ...classFilter }),
    Homework.countDocuments({
      status: 'active',
      ...classFilter,
      dueDate: { $gte: startOfDay(), $lte: endOfDay() },
    }),
    Homework.countDocuments({ status: 'completed', ...classFilter }),
    classLevel && classSection
      ? Schedule.findOne({ classLevel, classSection, isActive: true }).lean<{
          schedule?: Array<{
            day: string;
            periods: Array<{
              period: number;
              subject: string;
              teacherName: string;
              room?: string;
              startTime: string;
              endTime: string;
            }>;
          }>;
        }>()
      : Promise.resolve(null),
    Homework.find({ status: 'active', ...classFilter })
      .sort({ dueDate: 1 })
      .limit(6)
      .lean<Array<{ id: string; title: string; subject: string; dueDate: Date }>>(),
    Announcement.findOne({
      $and: [
        { $or: [{ targetRoles: { $size: 0 } }, { targetRoles: 'student' }] },
        classLevel ? { $or: [{ targetClasses: { $size: 0 } }, { targetClasses: classLevel }] } : {},
      ],
    })
      .sort({ createdAt: -1 })
      .lean<{ title?: string; content?: string; date?: string; _id?: unknown }>(),
  ]);

  const gradeSeries = notes.map((n) => n.average).filter((v): v is number => typeof v === 'number');
  const value = gradeSeries.length
    ? round1(gradeSeries.reduce((s, g) => s + g, 0) / gradeSeries.length)
    : 0;
  const trend = gradeSeries.slice(-8);

  // Today's periods from the active timetable.
  const todayName = scheduleWeekday();
  const now = hhmm();
  const todaySchedule: ScheduleEntry[] = (() => {
    if (!scheduleDoc?.schedule) return [];
    const day = scheduleDoc.schedule.find((d) => d.day === todayName);
    if (!day) return [];
    return [...day.periods]
      .sort((a, b) => a.period - b.period)
      .map((p) => ({
        id: `${todayName}-${p.period}`,
        time: `${p.startTime}–${p.endTime}`,
        subject: p.subject,
        teacher: p.teacherName,
        room: p.room ?? '—',
        isActive: now >= p.startTime && now <= p.endTime,
      }));
  })();

  const homeworkQueue: HomeworkEntry[] = homeworks.map((h, i) => {
    const { label, urgent } = dueLabelFor(new Date(h.dueDate));
    return {
      id: h.id ?? `hw-${i}`,
      code: `ÖDV-${String(i + 1).padStart(2, '0')}`,
      subject: `${h.subject} · ${h.title}`,
      dueLabel: label,
      urgent,
    };
  });

  const announcement: AnnouncementSummary | null = ann?.title
    ? {
        title: ann.title,
        body: ann.content ?? '',
        fileNo:
          String(ann._id ?? '')
            .slice(-6)
            .toUpperCase() || '—',
        date: ann.date ?? '',
      }
    : null;

  return {
    averageGrade: { value, deltaMonthly: 0, trend },
    pendingHomework: { total: pendingActive, dueToday, completed },
    attendance: { percent: 0, last30Days: [] },
    nextClass: null,
    nextExam: null,
    classRanking: ranking,
    unreadNotifications,
    todaySchedule,
    homeworkQueue,
    announcement,
  };
}

/**
 * Admin hero numbers — population counts plus the actionable queues an
 * administrator needs at a glance (pending registrations, appointments,
 * petitions, leave requests).
 */
export async function getAdminOverview(userId: string): Promise<AdminOverview> {
  const [
    totalStudents,
    totalTeachers,
    totalParents,
    pendingRegistrations,
    pendingAppointments,
    pendingDilekce,
    pendingEvci,
    unreadNotifications,
  ] = await Promise.all([
    User.countDocuments({ rol: 'student' }),
    User.countDocuments({ rol: 'teacher' }),
    User.countDocuments({ rol: 'parent' }),
    Registration.countDocuments({ status: 'pending' }),
    Appointment.countDocuments({ status: 'pending' }),
    Dilekce.countDocuments({ status: { $in: ['pending', 'in_review'] } }),
    EvciRequest.countDocuments({ status: 'pending' }),
    Notification.countDocuments({ userId, read: false }),
  ]);

  return {
    totalStudents,
    totalTeachers,
    totalParents,
    pendingRegistrations,
    pendingAppointments,
    pendingDilekce,
    pendingEvci,
    unreadNotifications,
  };
}

/**
 * Teacher hero numbers — active homework load, the size of the student
 * body they teach, petitions routed to them, and unread notifications.
 */
export async function getTeacherOverview(userId: string): Promise<TeacherOverview> {
  const [activeHomework, studentCount, pendingDilekce, unreadNotifications] = await Promise.all([
    Homework.countDocuments({ status: 'active' }),
    User.countDocuments({ rol: 'student' }),
    Dilekce.countDocuments({ reviewedBy: userId, status: { $in: ['pending', 'in_review'] } }),
    Notification.countDocuments({ userId, read: false }),
  ]);

  return { activeHomework, studentCount, pendingDilekce, unreadNotifications };
}

/**
 * Parent hero numbers — a per-child grade summary plus the homework still
 * pending across all of the parent's children's classes.
 */
export async function getParentOverview(userId: string): Promise<ParentOverview> {
  const parent = await User.findOne({ id: userId }).lean<{ childId?: string[] }>();
  const childIds = parent?.childId ?? [];

  const children = await User.find({ id: { $in: childIds }, rol: 'student' }).lean<
    Array<{ id: string; adSoyad: string; sinif?: string }>
  >();

  const summaries: ParentChildSummary[] = await Promise.all(
    children.map(async (c) => {
      const notes = await Note.find({ studentId: c.id }).lean();
      const grades = notes.map((n) => n.average).filter((v): v is number => typeof v === 'number');
      const averageGrade = grades.length
        ? round1(grades.reduce((s, g) => s + g, 0) / grades.length)
        : 0;
      return {
        id: c.id,
        adSoyad: c.adSoyad,
        sinif: c.sinif ?? '',
        averageGrade,
      };
    }),
  );

  const childSiniflar = [...new Set(summaries.map((s) => s.sinif).filter(Boolean))];
  const pendingHomework = childSiniflar.length
    ? await Homework.countDocuments({ status: 'active', gradeLevel: { $in: childSiniflar } })
    : 0;

  const unreadNotifications = await Notification.countDocuments({ userId, read: false });

  return { children: summaries, pendingHomework, unreadNotifications };
}
