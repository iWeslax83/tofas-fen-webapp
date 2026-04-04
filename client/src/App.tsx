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

  return (
    <AuthProvider>
      <Router>
        <AppInner />
      </Router>
    </AuthProvider>
  );
}

export default Sentry.withProfiler(App);
