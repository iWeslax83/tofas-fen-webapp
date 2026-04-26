import { useEffect } from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import ErrorBoundary from './components/ErrorBoundary';
import AuthProvider from './contexts/AuthContext';
import AppRoutes from './routes/AppRoutes';
import { useUIStore } from './stores/uiStore';
import './App.css';

function AppInner() {
  const location = useLocation();

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <AppRoutes />
    </ErrorBoundary>
  );
}

function App() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      root.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
      const handler = (e: MediaQueryListEvent) =>
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Cross-tab sync: intentionally theme-only. The Zustand `persist`
  // middleware does not fan out updates across tabs by default; rather
  // than rehydrate the whole partialized payload (sidebar state etc.),
  // we narrowly mirror the visible-to-user theme so dark/light flips
  // in one tab follow in others. Extend if other fields ever need it.
  useEffect(() => {
    const ALLOWED = ['light', 'dark', 'system'] as const;
    const handler = (e: StorageEvent) => {
      if (e.key !== 'ui-storage' || !e.newValue) return;
      try {
        const next = JSON.parse(e.newValue);
        const incoming = next?.state?.theme;
        if (
          (ALLOWED as readonly string[]).includes(incoming) &&
          incoming !== useUIStore.getState().theme
        ) {
          useUIStore.setState({ theme: incoming });
        }
      } catch {
        /* ignore malformed storage payload */
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <AppInner />
      </Router>
    </AuthProvider>
  );
}

export default Sentry.withProfiler(App);
