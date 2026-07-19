import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ClipboardList,
  TrendingUp,
  Award,
  CalendarClock,
  Bell,
  Users,
  UserPlus,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useUser, useIsLoading } from '../stores/authStore';
import { LoadBar } from './SkeletonComponents';
import ModernDashboardLayout from './ModernDashboardLayout';
import EmailVerificationBanner from './EmailVerificationBanner';
import { WelcomeHero } from './dashboard/WelcomeHero';
import { KpiTable, type KpiItem } from './dashboard/KpiTable';
import { TodaySchedule, type ScheduleRow } from './dashboard/TodaySchedule';
import { HomeworkQueue, type HomeworkRow } from './dashboard/HomeworkQueue';
import { RecentActivity, type ActivityEntry } from './dashboard/RecentActivity';
import { AnnouncementCard } from './dashboard/AnnouncementCard';
import {
  useDashboardOverview,
  type StudentOverview,
  type AdminOverview,
  type TeacherOverview,
  type ParentOverview,
} from '../hooks/queries/useDashboardOverview';
import './ModernDashboard.css';

const ModernDashboard: React.FC = () => {
  const authUser = useUser();
  const authLoading = useIsLoading();
  const navigate = useNavigate();
  const { data: overviewData } = useDashboardOverview();

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) navigate('/login');
  }, [authUser, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="modern-dashboard-loading">
        <div className="loading-container">
          <div className="loading-logo">
            <GraduationCap className="loading-icon" />
          </div>
          <div className="loading-text">Tofaş Fen Lisesi</div>
          <LoadBar className="loading-container-bar" />
        </div>
      </div>
    );
  }
  if (!authUser) return null;

  const role = overviewData?.data?.role;
  const overview = overviewData?.data?.overview ?? null;

  // KPI'lar — role'e göre, yalnızca anlamlı değer varsa hücre çıkar.
  const kpiItems: KpiItem[] = [];

  if (role === 'student' && overview) {
    const s = overview as StudentOverview;
    if (s.pendingHomework.total > 0) {
      kpiItems.push({
        label: 'Ödev',
        value: String(s.pendingHomework.total),
        badge: s.pendingHomework.dueToday > 0 ? `${s.pendingHomework.dueToday} bugün` : undefined,
        icon: ClipboardList,
        tone: 'warn',
      });
    }
    if (s.averageGrade.value > 0) {
      kpiItems.push({
        label: 'Not Ortalaması',
        value: String(s.averageGrade.value),
        trend: s.averageGrade.trend?.length >= 2 ? s.averageGrade.trend : undefined,
        icon: TrendingUp,
        tone: 'accent',
      });
    }
    if (s.classRanking && s.classRanking.classSize > 0) {
      kpiItems.push({
        label: 'Sınıf Sıralaması',
        value: `${s.classRanking.rank}/${s.classRanking.classSize}`,
        icon: Award,
        tone: 'info',
      });
    }
    if (s.nextExam) {
      kpiItems.push({
        label: 'Sıradaki Sınav',
        value: s.nextExam.subject,
        badge: `${s.nextExam.daysUntil} gün`,
        icon: CalendarClock,
        tone: 'warn',
      });
    }
    if (s.unreadNotifications > 0) {
      kpiItems.push({
        label: 'Okunmamış Bildirim',
        value: String(s.unreadNotifications),
        icon: Bell,
        tone: 'ok',
      });
    }
  }

  if (role === 'admin' && overview) {
    const a = overview as AdminOverview;
    kpiItems.push({ label: 'Öğrenci', value: String(a.totalStudents), icon: Users, tone: 'info' });
    kpiItems.push({
      label: 'Öğretmen',
      value: String(a.totalTeachers),
      icon: GraduationCap,
      tone: 'info',
    });
    kpiItems.push({ label: 'Veli', value: String(a.totalParents), icon: Users, tone: 'info' });
    if (a.pendingRegistrations > 0)
      kpiItems.push({
        label: 'Bekleyen Kayıt',
        value: String(a.pendingRegistrations),
        icon: UserPlus,
        tone: 'warn',
      });
    if (a.pendingAppointments > 0)
      kpiItems.push({
        label: 'Bekleyen Randevu',
        value: String(a.pendingAppointments),
        icon: CalendarClock,
        tone: 'warn',
      });
    if (a.pendingDilekce > 0)
      kpiItems.push({
        label: 'Bekleyen Dilekçe',
        value: String(a.pendingDilekce),
        icon: FileText,
        tone: 'warn',
      });
    if (a.pendingEvci > 0)
      kpiItems.push({
        label: 'Bekleyen Evci',
        value: String(a.pendingEvci),
        icon: RefreshCw,
        tone: 'warn',
      });
    if (a.unreadNotifications > 0)
      kpiItems.push({
        label: 'Okunmamış Bildirim',
        value: String(a.unreadNotifications),
        icon: Bell,
        tone: 'ok',
      });
  }

  if (role === 'teacher' && overview) {
    const t = overview as TeacherOverview;
    kpiItems.push({
      label: 'Aktif Ödev',
      value: String(t.activeHomework),
      icon: ClipboardList,
      tone: 'accent',
    });
    kpiItems.push({ label: 'Öğrenci', value: String(t.studentCount), icon: Users, tone: 'info' });
    if (t.pendingDilekce > 0)
      kpiItems.push({
        label: 'Bekleyen Dilekçe',
        value: String(t.pendingDilekce),
        icon: FileText,
        tone: 'warn',
      });
    if (t.unreadNotifications > 0)
      kpiItems.push({
        label: 'Okunmamış Bildirim',
        value: String(t.unreadNotifications),
        icon: Bell,
        tone: 'ok',
      });
  }

  if (role === 'parent' && overview) {
    const p = overview as ParentOverview;
    p.children.forEach((c) => {
      kpiItems.push({
        label: `${c.adSoyad} (${c.sinif})`,
        value: c.averageGrade > 0 ? `Ort. ${c.averageGrade}` : 'Not yok',
        icon: GraduationCap,
        tone: 'accent',
      });
    });
    if (p.pendingHomework > 0)
      kpiItems.push({
        label: 'Bekleyen Ödev',
        value: String(p.pendingHomework),
        icon: ClipboardList,
        tone: 'warn',
      });
    if (p.unreadNotifications > 0)
      kpiItems.push({
        label: 'Okunmamış Bildirim',
        value: String(p.unreadNotifications),
        icon: Bell,
        tone: 'ok',
      });
  }

  // TABLO II / III + duyuru — öğrenci overview'undan beslenir. Diğer
  // roller için boş kalır; boş row'lar bileşeni null'a düşürür.
  const studentOv = role === 'student' ? (overview as StudentOverview | null) : null;
  const scheduleRows: ScheduleRow[] = studentOv?.todaySchedule ?? [];
  const homeworkRows: HomeworkRow[] = studentOv?.homeworkQueue ?? [];
  const announcement = studentOv?.announcement ?? null;

  // Son Hareketler — the server builds this per role from real records.
  const recentActivity: ActivityEntry[] = overview?.recentActivity ?? [];

  return (
    <ModernDashboardLayout pageTitle="Panel">
      <div className="space-y-[18px] p-6">
        <WelcomeHero adSoyad={authUser.adSoyad} />
        <EmailVerificationBanner />
        <KpiTable items={kpiItems} />

        {/* Main column + 340px right rail, matching the mockup's grid-main.
            Rail = Bugünkü Program + Duyurular; a per-subject chart card is
            skipped here — this overview payload doesn't carry per-subject
            grades (that's PerformancePage's data), so a chart would mean
            wiring a new fetch rather than a re-skin. */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-[18px] items-start">
          <div className="flex flex-col gap-[18px] min-w-0">
            <HomeworkQueue rows={homeworkRows} />
            <RecentActivity entries={recentActivity} />
          </div>
          <div className="flex flex-col gap-[18px]">
            <TodaySchedule rows={scheduleRows} />
            {announcement && (
              <AnnouncementCard
                title={announcement.title}
                body={announcement.body}
                date={announcement.date}
              />
            )}
          </div>
        </div>
      </div>
    </ModernDashboardLayout>
  );
};

export default ModernDashboard;
