import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Loading component
const LoadingSpinner = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>Yükleniyor...</p>
  </div>
);

// Dashboard pages
const StudentPanel = lazy(() => import('../pages/Dashboard/StudentPanel'));
const TeacherPanel = lazy(() => import('../pages/Dashboard/TeacherPanel'));
const AdminPanel = lazy(() => import('../pages/Dashboard/AdminPanel'));
const ParentPanel = lazy(() => import('../pages/Dashboard/ParentPanel'));
const HizmetliPanel = lazy(() => import('../pages/Dashboard/HizmetliPanel'));

export const DashboardRoutes = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/student" element={<StudentPanel />} />
      <Route path="/teacher" element={<TeacherPanel />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/parent" element={<ParentPanel />} />
      <Route path="/hizmetli" element={<HizmetliPanel />} />
    </Routes>
  </Suspense>
);
