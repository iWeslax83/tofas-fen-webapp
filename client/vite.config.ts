// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ],
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        // ⚠️ GÜVENLİK: httpOnly cookies için gerekli
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Forward cookies
            if (req.headers.cookie) {
              proxyReq.setHeader('Cookie', req.headers.cookie);
            }
          });
        },
      },
      // Health check endpoint için de proxy
      "/health": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            if (req.headers.cookie) {
              proxyReq.setHeader('Cookie', req.headers.cookie);
            }
          });
        },
      }
    },
    port: 5173,
    strictPort: true,
    open: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - more granular splitting
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }

            // UI libraries
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            if (id.includes('@radix-ui')) {
              return 'radix-vendor';
            }
            if (id.includes('@headlessui')) {
              return 'headless-vendor';
            }

            // HTTP and data
            if (id.includes('axios')) {
              return 'http-vendor';
            }
            if (id.includes('yup') || id.includes('formik')) {
              return 'form-vendor';
            }

            // Utilities
            if (id.includes('lodash')) {
              return 'lodash-vendor';
            }
            if (id.includes('date-fns')) {
              return 'date-vendor';
            }
            if (id.includes('dompurify')) {
              return 'security-vendor';
            }

            // Large libraries - separate chunks
            if (id.includes('framer-motion')) {
              return 'animation-vendor';
            }

            // Monitoring - lazy load
            if (id.includes('@sentry')) {
              return 'monitoring-vendor';
            }

            // GraphQL - separate chunk
            if (id.includes('graphql')) {
              return 'graphql-vendor';
            }

            return 'vendor';
          }

          // Feature-based chunks - smaller chunks for better parallel loading
          // if (id.includes('/pages/Dashboard/')) {
          //   // Split dashboard pages into smaller chunks
          //   const pageName = id.split('/pages/Dashboard/')[1]?.split('.')[0];
          //   if (pageName && ['StudentPanel', 'TeacherPanel', 'AdminPanel', 'ParentPanel', 'HizmetliPanel'].includes(pageName)) {
          //     return 'dashboard-panels';
          //   }
          //   // Allow individual code splitting for pages to avoid single-point-of-failure in a large chunk
          //   // and fix "Failed to fetch dynamically imported module" errors
          //   return undefined; 
          // }
          // if (id.includes('/pages/')) {
          //   return 'pages';
          // }
          // if (id.includes('/components/')) {
          //   return 'components';
          // }
          // if (id.includes('/utils/')) {
          //   return 'utils';
          // }
          // if (id.includes('/contexts/')) {
          //   return 'contexts';
          // }
          // if (id.includes('/hooks/')) {
          //   return 'hooks';
          // }
          // if (id.includes('/routes/')) {
          //   return 'routes';
          // }
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increased to suppress warnings during dev
    target: 'esnext',
    cssCodeSplit: true,
    reportCompressedSize: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})