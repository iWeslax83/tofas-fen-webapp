import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/theme.css'
import App from './App.tsx'
// axios import removed - using SecureAPI instead
// React imports removed as they're not used
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { initializeMonitoring } from './utils/monitoring';

// Fix for "process is not defined" error
if (typeof window !== 'undefined' && !window.process) {
  (window as { process: { env: { NODE_ENV: string } } }).process = {
    env: {
      NODE_ENV: 'development'
    }
  };
}

// axios.defaults.withCredentials = true; // SecureAPI kullanıyoruz

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in newer versions)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Initialize monitoring and analytics
initializeMonitoring();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#16a34a',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#dc2626',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
)
