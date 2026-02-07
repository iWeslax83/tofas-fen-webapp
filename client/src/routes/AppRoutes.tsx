import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../stores/authStore';

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
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'));

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
const StudentCarziPage = lazy(() => import('../pages/Dashboard/StudentCarziPage'));
const DilekcePage = lazy(() => import('../pages/Dashboard/DilekcePage'));
const AdminCarziListPage = lazy(() => import('../pages/Dashboard/AdminCarziListPage'));
const AdminDilekceListPage = lazy(() => import('../pages/Dashboard/AdminDilekceListPage'));
const ParentEvciPage = lazy(() => import('../pages/Dashboard/ParentEvciPage'));
const AdminEvciListPage = lazy(() => import('../pages/Dashboard/AdminEvciListPage'));

// Settings and Admin Pages
const SettingsPage = lazy(() => import('../pages/Dashboard/SettingsPage'));
const SenkronizasyonPage = lazy(() => import('../pages/Dashboard/SenkronizasyonPage'));
// const ReportManagement = lazy(() => import('../pages/Dashboard/ReportManagement'));
const CalendarPage = lazy(() => import('../pages/Dashboard/CalendarPage'));
// const FileManagementPage = lazy(() => import('../pages/Dashboard/FileManagementPage'));
const CommunicationPage = lazy(() => import('../pages/Dashboard/CommunicationPage'));
const PerformancePage = lazy(() => import('../pages/Dashboard/PerformancePage'));

// Demo Pages
const SkeletonDemoPage = lazy(() => import('../pages/Dashboard/SkeletonDemoPage'));
const ErrorHandlingDemoPage = lazy(() => import('../pages/Dashboard/ErrorHandlingDemoPage'));
const FormUXDemoPage = lazy(() => import('../pages/Dashboard/FormUXDemoPage'));
const NavigationDemoPage = lazy(() => import('../pages/Dashboard/NavigationDemoPage'));
const AccessibilityDemoPage = lazy(() => import('../pages/Dashboard/AccessibilityDemoPage'));

// Root redirect component - Optimized to prevent unnecessary renders
function RootRedirect() {
  const hasNavigated = React.useRef(false);
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  // Use useEffect to handle navigation after render - only once
  React.useEffect(() => {
    if (isLoading || hasNavigated.current) return;

    if (user?.rol) {
      // If user is logged in, redirect to their dashboard
      hasNavigated.current = true;
      navigate(`/${user.rol}`, { replace: true });
    } else {
      // If not logged in, redirect to login
      hasNavigated.current = true;
      navigate('/login', { replace: true });
    }
  }, [user, navigate, isLoading]);

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <LoadingSpinner />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Root and Auth Routes */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Main Dashboard Routes */}
        <Route path="/admin" element={<ModernDashboard />} />
        <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />
        <Route path="/teacher" element={<ModernDashboard />} />
        <Route path="/dashboard/teacher" element={<Navigate to="/teacher" replace />} />
        <Route path="/parent" element={<ModernDashboard />} />
        <Route path="/dashboard/parent" element={<Navigate to="/parent" replace />} />
        <Route path="/student" element={<ModernDashboard />} />
        <Route path="/dashboard/student" element={<Navigate to="/student" replace />} />
        <Route path="/hizmetli" element={<ModernDashboard />} />
        <Route path="/dashboard/hizmetli" element={<Navigate to="/hizmetli" replace />} />

        {/* Academic Routes */}
        <Route path="/admin/odevler" element={<OdevlerPage />} />
        <Route path="/teacher/odevler" element={<OdevlerPage />} />
        <Route path="/parent/odevler" element={<OdevlerPage />} />
        <Route path="/parent/odevler" element={<OdevlerPage />} />
        {/* <Route path="/student/odevler" element={<OdevlerPage />} /> */}

        <Route path="/teacher/ders-programi" element={<DersProgramiPage />} />
        <Route path="/parent/ders-programi" element={<DersProgramiPage />} />
        <Route path="/student/ders-programi" element={<DersProgramiPage />} />

        <Route path="/student/notlar" element={<NotlarPage />} />
        <Route path="/parent/notlar" element={<NotlarPage />} />
        <Route path="/teacher/notlar" element={<NotlarPage />} />

        <Route path="/admin/file-import" element={<NotEkleme />} />
        <Route path="/teacher/file-import" element={<NotEkleme />} />

        <Route path="/teacher/file-import" element={<NotEkleme />} />

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
        <Route path="/student/carzi" element={<StudentCarziPage />} />
        <Route path="/parent/evci" element={<ParentEvciPage />} />

        {/* Dilekçe Routes */}
        <Route path="/student/dilekce" element={<DilekcePage />} />
        <Route path="/teacher/dilekce" element={<DilekcePage />} />
        <Route path="/parent/dilekce" element={<DilekcePage />} />
        <Route path="/admin/evci-listesi" element={<AdminEvciListPage />} />
        <Route path="/admin/carzi-listesi" element={<AdminCarziListPage />} />
        <Route path="/admin/dilekce-listesi" element={<AdminDilekceListPage />} />

        {/* Settings and Admin Routes */}
        <Route path="/ayarlar" element={<SettingsPage />} />
        <Route path="/admin/senkronizasyon" element={<SenkronizasyonPage />} />
        <Route path="/admin/senkronizasyon" element={<SenkronizasyonPage />} />
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
  );
}
