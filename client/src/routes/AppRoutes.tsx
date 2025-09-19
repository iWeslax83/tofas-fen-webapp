import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthRoutes } from './authRoutes';
import { DashboardRoutes } from './dashboardRoutes';
import { ClubRoutes } from './clubRoutes';
import { AcademicRoutes } from './academicRoutes';

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

// Academic Pages
const OdevlerPage = lazy(() => import('../pages/Dashboard/OdevlerPage'));
const DersProgramiPage = lazy(() => import('../pages/Dashboard/DersProgramiPage'));
const NotlarPage = lazy(() => import('../pages/Dashboard/NotlarPage'));
const NotEkleme = lazy(() => import('../pages/Dashboard/NotEkleme'));

// Communication Pages
const DuyurularPage = lazy(() => import('../pages/Dashboard/DuyurularPage'));
const HelpPage = lazy(() => import('../pages/Dashboard/HelpPage'));

// Dormitory Pages
const MealListPage = lazy(() => import('../pages/Dashboard/MealListPage'));
const SupervisorListPage = lazy(() => import('../pages/Dashboard/SupervisorListPage'));
const MaintenanceRequestPage = lazy(() => import('../pages/Dashboard/MaintenanceRequestPage'));
const AdminRequestsPage = lazy(() => import('../pages/Dashboard/AdminRequestsPage'));

// Evci Pages
const StudentEvciPage = lazy(() => import('../pages/Dashboard/StudentEvciPage'));
const ParentEvciPage = lazy(() => import('../pages/Dashboard/ParentEvciPage'));
const AdminEvciListPage = lazy(() => import('../pages/Dashboard/AdminEvciListPage'));

// Settings and Admin Pages
const SettingsPage = lazy(() => import('../pages/Dashboard/SettingsPage'));
const SenkronizasyonPage = lazy(() => import('../pages/Dashboard/SenkronizasyonPage'));
const ReportManagement = lazy(() => import('../pages/Dashboard/ReportManagement'));
const CalendarPage = lazy(() => import('../pages/Dashboard/CalendarPage'));
const FileManagementPage = lazy(() => import('../pages/Dashboard/FileManagementPage'));
const CommunicationPage = lazy(() => import('../pages/Dashboard/CommunicationPage'));
const PerformancePage = lazy(() => import('../pages/Dashboard/PerformancePage'));
const NotificationManagementPage = lazy(() => import('../pages/Dashboard/NotificationManagementPage'));
const NotificationAutomationPage = lazy(() => import('../pages/Dashboard/NotificationAutomationPage'));
const MyStudentsPage = lazy(() => import('../pages/Dashboard/MyStudentsPage'));

// Demo Pages
const SkeletonDemoPage = lazy(() => import('../pages/Dashboard/SkeletonDemoPage'));
const ErrorHandlingDemoPage = lazy(() => import('../pages/Dashboard/ErrorHandlingDemoPage'));
const FormUXDemoPage = lazy(() => import('../pages/Dashboard/FormUXDemoPage'));
const NavigationDemoPage = lazy(() => import('../pages/Dashboard/NavigationDemoPage'));
const AccessibilityDemoPage = lazy(() => import('../pages/Dashboard/AccessibilityDemoPage'));
const DebugPage = lazy(() => import('../pages/DebugPage'));

// Root redirect component
function RootRedirect() {
  // This will be handled by AuthContext
  return null;
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
        <Route path="/student/odevler" element={<OdevlerPage />} />
        
        <Route path="/teacher/ders-programi" element={<DersProgramiPage />} />
        <Route path="/parent/ders-programi" element={<DersProgramiPage />} />
        <Route path="/student/ders-programi" element={<DersProgramiPage />} />
        
        <Route path="/student/notlar" element={<NotlarPage />} />
        <Route path="/parent/notlar" element={<NotlarPage />} />
        <Route path="/teacher/notlar" element={<NotlarPage />} />
        
        <Route path="/admin/file-import" element={<NotEkleme />} />
        <Route path="/teacher/file-import" element={<NotEkleme />} />
        
        <Route path="/teacher/ogrencilerim" element={<MyStudentsPage />} />
        
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
        <Route path="/student/bakim-talepleri" element={<MaintenanceRequestPage />} />
        <Route path="/hizmetli/yemek-listesi" element={<MealListPage />} />
        <Route path="/hizmetli/belletmen-listesi" element={<SupervisorListPage />} />
        <Route path="/hizmetli/bakim-talepleri" element={<AdminRequestsPage />} />
        <Route path="/admin/yemek-listesi" element={<MealListPage />} />
        <Route path="/admin/belletmen-listesi" element={<SupervisorListPage />} />
        <Route path="/admin/bakim-talepleri" element={<AdminRequestsPage />} />
        
        {/* Club Routes */}
        <Route path="/katil/:clubId" element={<JoinClubPage />} />
        <Route path="/join/:code" element={<JoinClubPage />} />
        <Route path="/student/kulup/:clubId" element={<ClubDetailPage />} />
        <Route path="/admin/kulupler" element={<AdminClubsPage />} />
        <Route path="/student/kuluplerim" element={<MyClubsPage />} />
        <Route path="/parent/kuluplerim" element={<MyClubsPage />} />
        
        {/* Notification Routes */}
        <Route path="/admin/bildirimler" element={<NotificationManagementPage />} />
        <Route path="/teacher/bildirimler" element={<NotificationManagementPage />} />
        <Route path="/admin/bildirim-otomasyonu" element={<NotificationAutomationPage />} />
        <Route path="/teacher/bildirim-otomasyonu" element={<NotificationAutomationPage />} />
        
        {/* Evci Routes */}
        <Route path="/student/evci" element={<StudentEvciPage />} />
        <Route path="/parent/evci" element={<ParentEvciPage />} />
        <Route path="/admin/evci-listesi" element={<AdminEvciListPage />} />
        
        {/* Settings and Admin Routes */}
        <Route path="/ayarlar" element={<SettingsPage />} />
        <Route path="/admin/senkronizasyon" element={<SenkronizasyonPage />} />
        <Route path="/admin/reports" element={<ReportManagement />} />
        <Route path="/teacher/reports" element={<ReportManagement />} />
        
        {/* Calendar Routes */}
        <Route path="/admin/takvim" element={<CalendarPage />} />
        <Route path="/teacher/takvim" element={<CalendarPage />} />
        <Route path="/student/takvim" element={<CalendarPage />} />
        <Route path="/parent/takvim" element={<CalendarPage />} />
        <Route path="/hizmetli/takvim" element={<CalendarPage />} />
        
        {/* File Management Routes */}
        <Route path="/admin/dosyalar" element={<FileManagementPage />} />
        <Route path="/teacher/dosyalar" element={<FileManagementPage />} />
        <Route path="/student/dosyalar" element={<FileManagementPage />} />
        <Route path="/parent/dosyalar" element={<FileManagementPage />} />
        <Route path="/hizmetli/dosyalar" element={<FileManagementPage />} />
        
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
        
        {/* Debug Route */}
        <Route path="/debug" element={<DebugPage />} />
        
        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
