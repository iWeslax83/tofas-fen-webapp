import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Loading component
const LoadingSpinner = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>Yükleniyor...</p>
  </div>
);

// Club pages
const ClubDetailPage = lazy(() => import('../pages/Dashboard/ClubDetailPage'));
const MyClubsPage = lazy(() => import('../pages/Dashboard/MyClubsPage'));
const AdminClubsPage = lazy(() => import('../pages/Dashboard/AdminClubsPage'));
const JoinClubPage = lazy(() => import('../pages/Dashboard/JoinClubPage'));

export const ClubRoutes = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/clubs/:id" element={<ClubDetailPage />} />
      <Route path="/my-clubs" element={<MyClubsPage />} />
      <Route path="/admin/clubs" element={<AdminClubsPage />} />
      <Route path="/join-club" element={<JoinClubPage />} />
    </Routes>
  </Suspense>
);
