import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useUser, useIsLoading } from '../stores/authStore';
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
          <div className="loading-spinner" />
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
      });
    }
    if (s.averageGrade.value > 0) {
      kpiItems.push({
        label: 'Not Ortalaması',
        value: String(s.averageGrade.value),
        trend: s.averageGrade.trend?.length >= 2 ? s.averageGrade.trend : undefined,
      });
    }
    if (s.classRanking && s.classRanking.classSize > 0) {
      kpiItems.push({
        label: 'Sınıf Sıralaması',
        value: `${s.classRanking.rank}/${s.classRanking.classSize}`,
      });
    }
    if (s.nextExam) {
      kpiItems.push({
        label: 'Sıradaki Sınav',
        value: s.nextExam.subject,
        badge: `${s.nextExam.daysUntil} gün`,
      });
    }
    if (s.unreadNotifications > 0) {
      kpiItems.push({ label: 'Okunmamış Bildirim', value: String(s.unreadNotifications) });
    }
  }

  if (role === 'admin' && overview) {
    const a = overview as AdminOverview;
    kpiItems.push({ label: 'Öğrenci', value: String(a.totalStudents) });
    kpiItems.push({ label: 'Öğretmen', value: String(a.totalTeachers) });
    kpiItems.push({ label: 'Veli', value: String(a.totalParents) });
    if (a.pendingRegistrations > 0)
      kpiItems.push({ label: 'Bekleyen Kayıt', value: String(a.pendingRegistrations) });
    if (a.pendingAppointments > 0)
      kpiItems.push({ label: 'Bekleyen Randevu', value: String(a.pendingAppointments) });
    if (a.pendingDilekce > 0)
      kpiItems.push({ label: 'Bekleyen Dilekçe', value: String(a.pendingDilekce) });
    if (a.pendingEvci > 0) kpiItems.push({ label: 'Bekleyen Evci', value: String(a.pendingEvci) });
    if (a.unreadNotifications > 0)
      kpiItems.push({ label: 'Okunmamış Bildirim', value: String(a.unreadNotifications) });
  }

  if (role === 'teacher' && overview) {
    const t = overview as TeacherOverview;
    kpiItems.push({ label: 'Aktif Ödev', value: String(t.activeHomework) });
    kpiItems.push({ label: 'Öğrenci', value: String(t.studentCount) });
    if (t.pendingDilekce > 0)
      kpiItems.push({ label: 'Bekleyen Dilekçe', value: String(t.pendingDilekce) });
    if (t.unreadNotifications > 0)
      kpiItems.push({ label: 'Okunmamış Bildirim', value: String(t.unreadNotifications) });
  }

  if (role === 'parent' && overview) {
    const p = overview as ParentOverview;
    p.children.forEach((c) => {
      kpiItems.push({
        label: `${c.adSoyad} (${c.sinif})`,
        value: c.averageGrade > 0 ? `Ort. ${c.averageGrade}` : 'Not yok',
      });
    });
    if (p.pendingHomework > 0)
      kpiItems.push({ label: 'Bekleyen Ödev', value: String(p.pendingHomework) });
    if (p.unreadNotifications > 0)
      kpiItems.push({ label: 'Okunmamış Bildirim', value: String(p.unreadNotifications) });
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
      <div className="space-y-6 p-6">
        <WelcomeHero adSoyad={authUser.adSoyad} />
        <EmailVerificationBanner />
        <KpiTable items={kpiItems} />
        <TodaySchedule rows={scheduleRows} />
        <HomeworkQueue rows={homeworkRows} />
        {announcement && (
          <AnnouncementCard
            title={announcement.title}
            body={announcement.body}
            date={announcement.date}
          />
        )}
        <RecentActivity entries={recentActivity} />
      </div>
    </ModernDashboardLayout>
  );
};

export default ModernDashboard;
