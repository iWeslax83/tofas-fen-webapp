import Note from '../models/Note';
import { Homework } from '../models/Homework';
import { Schedule } from '../models/Schedule';
import Announcement from '../models/Announcement';

/**
 * Seed demo academic data for the student dashboard so the Devlet panel
 * renders its full shape (grade trend sparkline, TABLO II schedule,
 * TABLO III homework queue, announcement). Targets student1 (9/A).
 *
 * Idempotent: every doc has a stable id/marker and is deleted first.
 */
const STUDENT_ID = 'student1';
const STUDENT_NAME = 'Ahmet Yılmaz';
const CLASS_LEVEL = '9';
const CLASS_SECTION = 'A';
const ACADEMIC_YEAR = new Date().getFullYear().toString();

const HW_IDS = ['hw-sample-1', 'hw-sample-2', 'hw-sample-3', 'hw-sample-4'];
const SCHEDULE_ID = 'sched-sample-9A';

const WEEKDAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

export const createSampleDashboardData = async (): Promise<void> => {
  try {
    // --- Clean previous sample docs (idempotent) ---
    await Promise.all([
      Note.deleteMany({ studentId: STUDENT_ID, source: 'imported', notes: 'seed-sample' }),
      Homework.deleteMany({ id: { $in: HW_IDS } }),
      Schedule.deleteMany({ id: SCHEDULE_ID }),
      Announcement.deleteMany({ author: 'Okul Yönetimi (örnek)' }),
    ]);

    // --- Grade trend: ascending averages across the term ---
    const noteSpecs: Array<{ lesson: string; average: number }> = [
      { lesson: 'Matematik', average: 72 },
      { lesson: 'Fizik', average: 76 },
      { lesson: 'Kimya', average: 79 },
      { lesson: 'Türkçe', average: 84 },
      { lesson: 'İngilizce', average: 88 },
      { lesson: 'Biyoloji', average: 91 },
    ];
    const base = Date.now() - noteSpecs.length * 7 * 86_400_000;
    for (let i = 0; i < noteSpecs.length; i++) {
      const ts = new Date(base + i * 7 * 86_400_000);
      await Note.create({
        studentId: STUDENT_ID,
        studentName: STUDENT_NAME,
        lesson: noteSpecs[i].lesson,
        average: noteSpecs[i].average,
        semester: 'current',
        academicYear: ACADEMIC_YEAR,
        source: 'imported',
        gradeLevel: CLASS_LEVEL,
        classSection: CLASS_SECTION,
        notes: 'seed-sample',
        createdAt: ts,
        lastUpdated: ts,
      });
    }

    // --- Active homework queue (varied due dates) ---
    const day = 86_400_000;
    const hw = [
      { subject: 'Matematik', title: 'Türev problemleri', due: 0 },
      { subject: 'Fizik', title: 'Newton yasaları raporu', due: 1 },
      { subject: 'İngilizce', title: 'Essay: My Future', due: 3 },
      { subject: 'Kimya', title: 'Periyodik tablo çalışması', due: 7 },
    ];
    await Homework.insertMany(
      hw.map((h, i) => ({
        id: HW_IDS[i],
        title: h.title,
        description: `${h.subject} dersi ödevi — örnek veri.`,
        subject: h.subject,
        teacherId: 'teacher1',
        teacherName: 'Prof. Dr. Ali Demir',
        classLevel: CLASS_LEVEL,
        dueDate: new Date(Date.now() + h.due * day),
        status: 'active',
      })),
    );

    // --- Weekly timetable for 9/A (every weekday populated) ---
    const periodTemplate = [
      {
        period: 1,
        subject: 'Matematik',
        teacherName: 'Prof. Dr. Ali Demir',
        startTime: '08:30',
        endTime: '09:20',
      },
      {
        period: 2,
        subject: 'Fizik',
        teacherName: 'Dr. Fatma Özkan',
        startTime: '09:30',
        endTime: '10:20',
      },
      {
        period: 3,
        subject: 'İngilizce',
        teacherName: 'Öğr. Gör. Emre Yıldız',
        startTime: '10:30',
        endTime: '11:20',
      },
      {
        period: 4,
        subject: 'Türkçe',
        teacherName: 'Dr. Zeynep Arslan',
        startTime: '11:30',
        endTime: '12:20',
      },
    ];
    await Schedule.create({
      id: SCHEDULE_ID,
      classLevel: CLASS_LEVEL,
      classSection: CLASS_SECTION,
      academicYear: ACADEMIC_YEAR,
      semester: '1. Dönem',
      isActive: true,
      createdBy: 'admin1',
      schedule: WEEKDAYS.map((d) => ({
        day: d,
        periods: periodTemplate.map((p, idx) => ({
          ...p,
          teacherId: `teacher${idx + 1}`,
          room: `Z-${10 + idx}`,
        })),
      })),
    });

    // --- Announcement targeting students / class 9 ---
    await Announcement.create({
      title: '19 Mayıs töreninde tüm öğrenciler davetlidir',
      content:
        '19 Mayıs Atatürk’ü Anma, Gençlik ve Spor Bayramı töreni okul bahçesinde saat 09:00’da başlayacaktır. Tüm öğrencilerimizin katılımı beklenmektedir.',
      author: 'Okul Yönetimi (örnek)',
      authorId: 'admin1',
      date: new Date().toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      targetRoles: ['student'],
      targetClasses: [CLASS_LEVEL],
      priority: 'high',
    });

    console.log('✅ Örnek pano verisi oluşturuldu (öğrenci: student1, 9/A)');
  } catch (error) {
    console.error('❌ Örnek pano verisi oluşturulurken hata:', error);
    throw error;
  }
};
