import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useUser, useIsLoading } from '../stores/authStore';
import ModernDashboardLayout from './ModernDashboardLayout';
import EmailVerificationBanner from './EmailVerificationBanner';
import { OfficialNoticeHero } from './dashboard/OfficialNoticeHero';
import { KpiTable, type KpiItem } from './dashboard/KpiTable';
import { TodaySchedule, type ScheduleRow } from './dashboard/TodaySchedule';
import { HomeworkQueue, type HomeworkRow } from './dashboard/HomeworkQueue';
import { QuickActions, type QuickAction } from './dashboard/QuickActions';
import { useDashboardOverview } from '../hooks/queries/useDashboardOverview';
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

  const overview = overviewData?.overview;

  // KPI'lar — yalnızca anlamlı değer varsa hücre çıkar.
  const kpiItems: KpiItem[] = [];
  if (overview && overview.pendingHomework.total > 0) {
    kpiItems.push({
      label: 'Ödev',
      value: String(overview.pendingHomework.total),
      badge:
        overview.pendingHomework.dueToday > 0
          ? `${overview.pendingHomework.dueToday} bugün`
          : undefined,
    });
  }
  if (overview?.nextExam) {
    kpiItems.push({
      label: 'Sıradaki Sınav',
      value: overview.nextExam.subject,
      badge: `${overview.nextExam.daysUntil} gün`,
    });
  }

  // TABLO II / III için veri kaynakları henüz wire edilmedi (sayfa
  // migrasyonları sırasında bağlanacak); empty row'lar bileşeni
  // null'a düşürür, kullanıcı boş bir bölüm görmez.
  const scheduleRows: ScheduleRow[] = [];
  const homeworkRows: HomeworkRow[] = [];

  // Hızlı İşlem — role-aware.
  const quickActions: QuickAction[] = [];
  if (authUser.rol === 'admin' || authUser.rol === 'teacher') {
    quickActions.push({
      key: 'enter-grade',
      shortcut: 'N',
      label: 'Not gir',
      onSelect: () => navigate('/notlar'),
    });
  }
  if (authUser.rol === 'admin') {
    quickActions.push({
      key: 'add-user',
      shortcut: 'K',
      label: 'Yeni kullanıcı',
      onSelect: () => navigate('/admin/sifre-yonetimi'),
    });
  }
  if (authUser.rol === 'student' || authUser.rol === 'parent') {
    quickActions.push({
      key: 'write-petition',
      shortcut: 'D',
      label: 'Dilekçe yaz',
      onSelect: () => navigate(`/${authUser.rol}/dilekce`),
    });
  }

  return (
    <ModernDashboardLayout pageTitle="Panel">
      <div className="space-y-6 p-6">
        <OfficialNoticeHero adSoyad={authUser.adSoyad} />
        <EmailVerificationBanner />
        <KpiTable items={kpiItems} />
        <TodaySchedule rows={scheduleRows} />
        <HomeworkQueue rows={homeworkRows} />
        <QuickActions actions={quickActions} />
      </div>
    </ModernDashboardLayout>
  );
};

export default ModernDashboard;
