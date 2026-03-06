import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../stores/authStore';
import ProtectedRoute from '../components/ProtectedRoute';

// Scroll to top on route changes
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Loading component for Suspense
const LoadingSpinner = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>Yükleniyor...</p>
  </div>
);

// Main dashboard component
const ModernDashboard = lazy(() => import('../components/ModernDashboard'));
const NotFoundPage = lazy(() => import('../pages/Dashboard/NotFoundPage'));

// Auth Pages
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegistrationFormPage = lazy(() => import('../pages/RegistrationFormPage'));
// Academic Pages
const OdevlerPage = lazy(() => import('../pages/Dashboard/OdevlerPage'));
const DersProgramiPage = lazy(() => import('../pages/Dashboard/DersProgramiPage'));
const NotlarPage = lazy(() => import('../pages/Dashboard/NotlarPage'));
const NotEkleme = lazy(() => import('../pages/Dashboard/NotEkleme'));
// const YoklamaPage = lazy(() => import('../pages/Dashboard/YoklamaPage'));

// Communication Pages
const DuyurularPage = lazy(() => import('../pages/Dashboard/DuyurularPage'));
const HelpPage = lazy(() => import('../pages/Dashboard/HelpPage'));

// Dormitory Pages
const MealListPage = lazy(() => import('../pages/Dashboard/MealListPage'));
const SupervisorListPage = lazy(() => import('../pages/Dashboard/SupervisorListPage'));

// Evci Pages
const StudentEvciPage = lazy(() => import('../pages/Dashboard/StudentEvciPage'));
const DilekcePage = lazy(() => import('../pages/Dashboard/DilekcePage'));
const AdminDilekceListPage = lazy(() => import('../pages/Dashboard/AdminDilekceListPage'));
const ParentEvciPage = lazy(() => import('../pages/Dashboard/ParentEvciPage'));
const AdminEvciListPage = lazy(() => import('../pages/Dashboard/AdminEvciListPage'));
const EvciStatsPage = lazy(() => import('../pages/Dashboard/EvciStatsPage'));

// Settings and Admin Pages
const SettingsPage = lazy(() => import('../pages/Dashboard/SettingsPage'));
const SenkronizasyonPage = lazy(() => import('../pages/Dashboard/SenkronizasyonPage'));
const ParentChildManagement = lazy(() => import('../pages/Dashboard/ParentChildManagement'));
// const ReportManagement = lazy(() => import('../pages/Dashboard/ReportManagement'));
const CalendarPage = lazy(() => import('../pages/Dashboard/CalendarPage'));
// const FileManagementPage = lazy(() => import('../pages/Dashboard/FileManagementPage'));
const CommunicationPage = lazy(() => import('../pages/Dashboard/CommunicationPage'));
const PerformancePage = lazy(() => import('../pages/Dashboard/PerformancePage'));

// Visitor / Registration Pages
const AdminRegistrationsPage = lazy(() => import('../pages/Dashboard/AdminRegistrationsPage'));
const AdminAppointmentsPage = lazy(() => import('../pages/Dashboard/AdminAppointmentsPage'));
const VisitorChatPage = lazy(() => import('../pages/Dashboard/VisitorChatPage'));
const VisitorAppointmentPage = lazy(() => import('../pages/Dashboard/VisitorAppointmentPage'));

// Demo Pages
const SkeletonDemoPage = lazy(() => import('../pages/Dashboard/SkeletonDemoPage'));
const ErrorHandlingDemoPage = lazy(() => import('../pages/Dashboard/ErrorHandlingDemoPage'));
const FormUXDemoPage = lazy(() => import('../pages/Dashboard/FormUXDemoPage'));
const NavigationDemoPage = lazy(() => import('../pages/Dashboard/NavigationDemoPage'));
const AccessibilityDemoPage = lazy(() => import('../pages/Dashboard/AccessibilityDemoPage'));

// Root redirect component
function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (user?.rol) {
    return <Navigate to={`/${user.rol}`} replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
        {/* Root and Auth Routes */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/kayit-basvurusu" element={<RegistrationFormPage />} />

        {/* Main Dashboard Routes */}
        <Route path="/admin" element={<ModernDashboard key="admin" />} />
        <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />
        <Route path="/teacher" element={<ModernDashboard key="teacher" />} />
        <Route path="/dashboard/teacher" element={<Navigate to="/teacher" replace />} />
        <Route path="/parent" element={<ModernDashboard key="parent" />} />
        <Route path="/dashboard/parent" element={<Navigate to="/parent" replace />} />
        <Route path="/student" element={<ModernDashboard key="student" />} />
        <Route path="/dashboard/student" element={<Navigate to="/student" replace />} />
        <Route path="/hizmetli" element={<ModernDashboard key="hizmetli" />} />
        <Route path="/dashboard/hizmetli" element={<Navigate to="/hizmetli" replace />} />
        <Route path="/ziyaretci" element={<ModernDashboard key="ziyaretci" />} />
        <Route path="/dashboard/ziyaretci" element={<Navigate to="/ziyaretci" replace />} />

        {/* Academic Routes */}
        <Route path="/admin/odevler" element={<OdevlerPage />} />
        <Route path="/teacher/odevler" element={<OdevlerPage />} />
        <Route path="/parent/odevler" element={<OdevlerPage />} />
        <Route path="/student/odevler" element={<OdevlerPage />} />

        <Route path="/teacher/ders-programi" element={<DersProgramiPage />} />
        <Route path="/parent/ders-programi" element={<DersProgramiPage />} />
        <Route path="/student/ders-programi" element={<DersProgramiPage />} />

        <Route path="/student/notlar" element={<NotlarPage />} />
        <Route path="/parent/notlar" element={<NotlarPage />} />
        <Route path="/teacher/notlar" element={<NotlarPage />} />

        <Route path="/admin/file-import" element={<ProtectedRoute allowedRoles={['admin']}><NotEkleme /></ProtectedRoute>} />
        <Route path="/teacher/file-import" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><NotEkleme /></ProtectedRoute>} />

        {/* <Route path="/teacher/ogrencilerim" element={<MyStudentsPage />} /> */}
        {/* <Route path="/teacher/yoklama" element={<YoklamaPage />} /> */}
        {/* <Route path="/admin/yoklama" element={<YoklamaPage />} /> */}

        {/* Communication Routes */}
        <Route path="/yardim" element={<HelpPage />} />
        <Route path="/help" element={<HelpPage />} />

        <Route path="/admin/duyurular" element={<DuyurularPage />} />
        <Route path="/teacher/duyurular" element={<DuyurularPage />} />
        <Route path="/parent/duyurular" element={<DuyurularPage />} />
        <Route path="/student/duyurular" element={<DuyurularPage />} />
        <Route path="/hizmetli/duyurular" element={<DuyurularPage />} />

        {/* Dormitory Routes */}
        <Route path="/teacher/yemek-listesi" element={<MealListPage />} />
        <Route path="/teacher/belletmen-listesi" element={<SupervisorListPage />} />
        <Route path="/parent/yemek-listesi" element={<MealListPage />} />
        <Route path="/parent/belletmen-listesi" element={<SupervisorListPage />} />
        <Route path="/student/yemek-listesi" element={<MealListPage />} />
        <Route path="/student/belletmen-listesi" element={<SupervisorListPage />} />
        <Route path="/hizmetli/yemek-listesi" element={<MealListPage />} />
        <Route path="/hizmetli/belletmen-listesi" element={<SupervisorListPage />} />
        <Route path="/admin/yemek-listesi" element={<MealListPage />} />
        <Route path="/admin/belletmen-listesi" element={<SupervisorListPage />} />

        {/* Evci Routes */}
        <Route path="/student/evci" element={<StudentEvciPage />} />
        <Route path="/parent/evci" element={<ParentEvciPage />} />

        {/* Dilekçe Routes */}
        <Route path="/student/dilekce" element={<DilekcePage />} />
        <Route path="/teacher/dilekce" element={<DilekcePage />} />
        <Route path="/parent/dilekce" element={<DilekcePage />} />
        <Route path="/admin/evci-listesi" element={<ProtectedRoute allowedRoles={['admin']}><AdminEvciListPage /></ProtectedRoute>} />
        <Route path="/admin/evci-istatistik" element={<ProtectedRoute allowedRoles={['admin']}><EvciStatsPage /></ProtectedRoute>} />
        <Route path="/teacher/evci-istatistik" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><EvciStatsPage /></ProtectedRoute>} />
        <Route path="/teacher/evci-listesi" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><AdminEvciListPage /></ProtectedRoute>} />
        <Route path="/admin/dilekce-listesi" element={<ProtectedRoute allowedRoles={['admin']}><AdminDilekceListPage /></ProtectedRoute>} />

        {/* Registration & Appointment Routes */}
        <Route path="/admin/yeni-kayit-basvurulari" element={<ProtectedRoute allowedRoles={['admin']}><AdminRegistrationsPage /></ProtectedRoute>} />
        <Route path="/admin/randevu-basvurulari" element={<ProtectedRoute allowedRoles={['admin']}><AdminAppointmentsPage /></ProtectedRoute>} />
        <Route path="/admin/ziyaretci-sohbet" element={<ProtectedRoute allowedRoles={['admin']}><VisitorChatPage /></ProtectedRoute>} />
        <Route path="/ziyaretci/sohbet" element={<ProtectedRoute allowedRoles={['ziyaretci']}><VisitorChatPage /></ProtectedRoute>} />
        <Route path="/ziyaretci/randevu" element={<ProtectedRoute allowedRoles={['ziyaretci']}><VisitorAppointmentPage /></ProtectedRoute>} />
        <Route path="/ziyaretci/ayarlar" element={<ProtectedRoute allowedRoles={['ziyaretci']}><SettingsPage /></ProtectedRoute>} />

        {/* Settings and Admin Routes */}
        <Route path="/admin/senkronizasyon" element={<ProtectedRoute allowedRoles={['admin']}><SenkronizasyonPage /></ProtectedRoute>} />
        <Route path="/admin/veli-eslestirme" element={<ProtectedRoute allowedRoles={['admin']}><ParentChildManagement /></ProtectedRoute>} />
        {/* <Route path="/admin/reports" element={<ReportManagement />} /> */}
        {/* <Route path="/teacher/reports" element={<ReportManagement />} /> */}

        {/* Calendar Routes */}
        <Route path="/admin/takvim" element={<CalendarPage />} />
        <Route path="/teacher/takvim" element={<CalendarPage />} />
        <Route path="/student/takvim" element={<CalendarPage />} />
        <Route path="/parent/takvim" element={<CalendarPage />} />
        <Route path="/hizmetli/takvim" element={<CalendarPage />} />

        {/* File Management Routes */}
        {/* File Management Routes - REMOVED */}
        {/* <Route path="/admin/dosyalar" element={<FileManagementPage />} /> */}
        {/* <Route path="/teacher/dosyalar" element={<FileManagementPage />} /> */}
        {/* <Route path="/student/dosyalar" element={<FileManagementPage />} /> */}
        {/* <Route path="/parent/dosyalar" element={<FileManagementPage />} /> */}
        {/* <Route path="/hizmetli/dosyalar" element={<FileManagementPage />} /> */}

        {/* Communication Routes */}
        <Route path="/admin/iletisim" element={<CommunicationPage />} />
        <Route path="/teacher/iletisim" element={<CommunicationPage />} />
        <Route path="/student/iletisim" element={<CommunicationPage />} />
        <Route path="/parent/iletisim" element={<CommunicationPage />} />
        <Route path="/hizmetli/iletisim" element={<CommunicationPage />} />

        {/* Performance Routes */}
        <Route path="/admin/performans" element={<PerformancePage />} />
        <Route path="/teacher/performans" element={<PerformancePage />} />
        <Route path="/student/performans" element={<PerformancePage />} />
        <Route path="/parent/performans" element={<PerformancePage />} />
        <Route path="/hizmetli/performans" element={<PerformancePage />} />

        {/* Settings Routes */}
        <Route path="/admin/ayarlar" element={<SettingsPage />} />
        <Route path="/teacher/ayarlar" element={<SettingsPage />} />
        <Route path="/student/ayarlar" element={<SettingsPage />} />
        <Route path="/parent/ayarlar" element={<SettingsPage />} />
        <Route path="/hizmetli/ayarlar" element={<SettingsPage />} />

        {/* Demo Routes */}
        <Route path="/admin/skeleton-demo" element={<SkeletonDemoPage />} />
        <Route path="/teacher/skeleton-demo" element={<SkeletonDemoPage />} />
        <Route path="/student/skeleton-demo" element={<SkeletonDemoPage />} />
        <Route path="/parent/skeleton-demo" element={<SkeletonDemoPage />} />
        <Route path="/hizmetli/skeleton-demo" element={<SkeletonDemoPage />} />

        <Route path="/admin/error-demo" element={<ErrorHandlingDemoPage />} />
        <Route path="/teacher/error-demo" element={<ErrorHandlingDemoPage />} />
        <Route path="/student/error-demo" element={<ErrorHandlingDemoPage />} />
        <Route path="/parent/error-demo" element={<ErrorHandlingDemoPage />} />
        <Route path="/hizmetli/error-demo" element={<ErrorHandlingDemoPage />} />

        <Route path="/admin/form-demo" element={<FormUXDemoPage />} />
        <Route path="/teacher/form-demo" element={<FormUXDemoPage />} />
        <Route path="/student/form-demo" element={<FormUXDemoPage />} />
        <Route path="/parent/form-demo" element={<FormUXDemoPage />} />
        <Route path="/hizmetli/form-demo" element={<FormUXDemoPage />} />

        <Route path="/admin/navigation-demo" element={<NavigationDemoPage />} />
        <Route path="/teacher/navigation-demo" element={<NavigationDemoPage />} />
        <Route path="/student/navigation-demo" element={<NavigationDemoPage />} />
        <Route path="/parent/navigation-demo" element={<NavigationDemoPage />} />
        <Route path="/hizmetli/navigation-demo" element={<NavigationDemoPage />} />

        <Route path="/admin/accessibility-demo" element={<AccessibilityDemoPage />} />
        <Route path="/teacher/accessibility-demo" element={<AccessibilityDemoPage />} />
        <Route path="/student/accessibility-demo" element={<AccessibilityDemoPage />} />
        <Route path="/parent/accessibility-demo" element={<AccessibilityDemoPage />} />
        <Route path="/hizmetli/accessibility-demo" element={<AccessibilityDemoPage />} />

        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
