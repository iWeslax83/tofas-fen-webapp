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
import { getAcademicYear } from '../../utils/academicYear';

export interface AdminOverview {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  pendingRegistrations: number;
  pendingAppointments: number;
  pendingDilekce: number;
  pendingEvci: number;
  unreadNotifications: number;
  recentActivity: ActivityEntry[];
}

export interface TeacherOverview {
  activeHomework: number;
  studentCount: number;
  pendingDilekce: number;
  unreadNotifications: number;
  recentActivity: ActivityEntry[];
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
  recentActivity: ActivityEntry[];
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

export interface ActivityEntry {
  id: string;
  kind: 'note' | 'homework' | 'announcement' | 'dilekce' | 'registration';
  title: string;
  detail: string;
  /** ISO timestamp; the client formats it. */
  date: string;
  url: string;
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
  recentActivity: ActivityEntry[];
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

const ACTIVITY_LIMIT = 6;

const iso = (d?: Date | string | null): string =>
  d ? new Date(d).toISOString() : new Date(0).toISOString();

/** Newest first, capped. Entries with no usable date sink to the bottom. */
const mergeActivity = (entries: ActivityEntry[]): ActivityEntry[] =>
  entries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, ACTIVITY_LIMIT);

/** Announcements aimed at this role, or at everyone. */
async function announcementActivity(role: string, url: string): Promise<ActivityEntry[]> {
  const anns = await Announcement.find({
    $or: [
      { targetRoles: role },
      { targetRoles: { $size: 0 } },
      { targetRoles: { $exists: false } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(ACTIVITY_LIMIT)
    .lean<Array<{ _id: unknown; title: string; author?: string; createdAt: Date }>>();

  return anns.map((a) => ({
    id: `ann-${String(a._id)}`,
    kind: 'announcement' as const,
    title: a.title,
    detail: a.author ? `Duyuru · ${a.author}` : 'Duyuru',
    date: iso(a.createdAt),
    url,
  }));
}

/**
 * The student's own recent history: grades that landed, homework that was
 * set for their class, announcements addressed to them.
 */
async function getStudentActivity(userId: string, classLevel?: string): Promise<ActivityEntry[]> {
  const [notes, homeworks, anns] = await Promise.all([
    Note.find({ studentId: userId })
      .sort({ lastUpdated: -1 })
      .limit(ACTIVITY_LIMIT)
      .lean<Array<{ _id: unknown; lesson: string; average?: number; lastUpdated: Date }>>(),
    classLevel
      ? Homework.find({ classLevel, isPublished: true, academicYear: getAcademicYear() })
          .sort({ assignedDate: -1 })
          .limit(ACTIVITY_LIMIT)
          .lean<
            Array<{
              id?: string;
              title: string;
              subject: string;
              assignedDate: Date;
              dueDate: Date;
            }>
          >()
      : Promise.resolve([]),
    announcementActivity('student', '/student/duyurular'),
  ]);

  return mergeActivity([
    ...notes.map((n) => ({
      id: `note-${String(n._id)}`,
      kind: 'note' as const,
      title: `${n.lesson} notu girildi`,
      detail: typeof n.average === 'number' ? `Ortalama ${round1(n.average)}` : 'Not güncellendi',
      date: iso(n.lastUpdated),
      url: '/student/notlar',
    })),
    ...homeworks.map((h, i) => ({
      id: `hw-${h.id ?? i}`,
      kind: 'homework' as const,
      title: `Yeni ödev: ${h.title}`,
      detail: `${h.subject} · ${dueLabelFor(new Date(h.dueDate)).label}`,
      date: iso(h.assignedDate),
      url: '/student/odevler',
    })),
    ...anns,
  ]);
}

/** What the teacher has set, and what is waiting on them. */
async function getTeacherActivity(userId: string): Promise<ActivityEntry[]> {
  const [homeworks, dilekceler, anns] = await Promise.all([
    Homework.find({ teacherId: userId }).sort({ assignedDate: -1 }).limit(ACTIVITY_LIMIT).lean<
      Array<{
        id?: string;
        title: string;
        subject: string;
        classLevel: string;
        assignedDate: Date;
      }>
    >(),
    Dilekce.find({ reviewedBy: userId })
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_LIMIT)
      .lean<Array<{ _id: unknown; subject: string; userName: string; createdAt: Date }>>(),
    announcementActivity('teacher', '/teacher/duyurular'),
  ]);

  return mergeActivity([
    ...homeworks.map((h, i) => ({
      id: `hw-${h.id ?? i}`,
      kind: 'homework' as const,
      title: `Ödev verildi: ${h.title}`,
      detail: `${h.subject} · ${h.classLevel}. sınıf`,
      date: iso(h.assignedDate),
      url: '/teacher/odevler',
    })),
    ...dilekceler.map((d) => ({
      id: `dlk-${String(d._id)}`,
      kind: 'dilekce' as const,
      title: `Dilekçe: ${d.subject}`,
      detail: d.userName,
      date: iso(d.createdAt),
      url: '/teacher/dilekce',
    })),
    ...anns,
  ]);
}

/** The administrator's inbox: what arrived and needs a decision. */
async function getAdminActivity(): Promise<ActivityEntry[]> {
  const [registrations, dilekceler, anns] = await Promise.all([
    Registration.find()
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_LIMIT)
      .lean<Array<{ _id: unknown; studentName: string; status: string; createdAt: Date }>>(),
    Dilekce.find()
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_LIMIT)
      .lean<Array<{ _id: unknown; subject: string; userName: string; createdAt: Date }>>(),
    announcementActivity('admin', '/admin/duyurular'),
  ]);

  return mergeActivity([
    ...registrations.map((r) => ({
      id: `reg-${String(r._id)}`,
      kind: 'registration' as const,
      title: `Kayıt başvurusu: ${r.studentName}`,
      detail: r.status === 'pending' ? 'İnceleme bekliyor' : `Durum: ${r.status}`,
      date: iso(r.createdAt),
      url: '/admin/kayit-basvurulari',
    })),
    ...dilekceler.map((d) => ({
      id: `dlk-${String(d._id)}`,
      kind: 'dilekce' as const,
      title: `Dilekçe: ${d.subject}`,
      detail: d.userName,
      date: iso(d.createdAt),
      url: '/admin/dilekce',
    })),
    ...anns,
  ]);
}

/** The parent sees their children's grades and the announcements for them. */
async function getParentActivity(childIds: string[]): Promise<ActivityEntry[]> {
  const [notes, anns] = await Promise.all([
    childIds.length
      ? Note.find({ studentId: { $in: childIds } })
          .sort({ lastUpdated: -1 })
          .limit(ACTIVITY_LIMIT)
          .lean<
            Array<{
              _id: unknown;
              lesson: string;
              studentName: string;
              average?: number;
              lastUpdated: Date;
            }>
          >()
      : Promise.resolve([]),
    announcementActivity('parent', '/parent/duyurular'),
  ]);

  return mergeActivity([
    ...notes.map((n) => ({
      id: `note-${String(n._id)}`,
      kind: 'note' as const,
      title: `${n.studentName} · ${n.lesson} notu`,
      detail: typeof n.average === 'number' ? `Ortalama ${round1(n.average)}` : 'Not güncellendi',
      date: iso(n.lastUpdated),
      url: '/parent/notlar',
    })),
    ...anns,
  ]);
}

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
  // academicYear tüm Homework sorgularına yayılır (357, 358, 363, 379).
  const classFilter = classLevel
    ? { classLevel, academicYear: getAcademicYear() }
    : { academicYear: getAcademicYear() };

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
      ? Schedule.findOne({
          classLevel,
          classSection,
          isActive: true,
          academicYear: getAcademicYear(),
        }).lean<{
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
    recentActivity: await getStudentActivity(userId, student?.sinif),
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
    recentActivity: await getAdminActivity(),
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

  return {
    activeHomework,
    studentCount,
    pendingDilekce,
    unreadNotifications,
    recentActivity: await getTeacherActivity(userId),
  };
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

  return {
    children: summaries,
    pendingHomework,
    unreadNotifications,
    recentActivity: await getParentActivity(childIds),
  };
}
