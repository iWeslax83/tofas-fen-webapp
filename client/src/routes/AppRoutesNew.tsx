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

// Root redirect component
function RootRedirect() {
  // This will be handled by AuthContext
  return null;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />
        
        {/* Auth routes */}
        <Route path="/auth/*" element={<AuthRoutes />} />
        
        {/* Dashboard routes */}
        <Route path="/dashboard/*" element={<DashboardRoutes />} />
        
        {/* Club routes */}
        <Route path="/clubs/*" element={<ClubRoutes />} />
        
        {/* Academic routes */}
        <Route path="/academic/*" element={<AcademicRoutes />} />
        
        {/* Legacy routes for backward compatibility */}
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/reset-password" element={<Navigate to="/auth/reset-password" replace />} />
        
        {/* Role-based dashboard routes */}
        <Route path="/student" element={<ModernDashboard />} />
        <Route path="/teacher" element={<ModernDashboard />} />
        <Route path="/admin" element={<ModernDashboard />} />
        <Route path="/parent" element={<ModernDashboard />} />
        <Route path="/hizmetli" element={<ModernDashboard />} />
        
        {/* 404 handler */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
