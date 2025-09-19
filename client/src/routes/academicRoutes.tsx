import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Loading component
const LoadingSpinner = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>Yükleniyor...</p>
  </div>
);

// Academic pages
const NotesPage = lazy(() => import('../pages/Dashboard/NotlarPage'));
const HomeworksPage = lazy(() => import('../pages/Dashboard/OdevlerPage'));
const SchedulePage = lazy(() => import('../pages/Dashboard/SchedulePage'));
const AnnouncementsPage = lazy(() => import('../pages/Dashboard/DuyurularPage'));

export const AcademicRoutes = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/notes" element={<NotesPage />} />
      <Route path="/homeworks" element={<HomeworksPage />} />
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/announcements" element={<AnnouncementsPage />} />
    </Routes>
  </Suspense>
);
