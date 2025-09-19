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
                  
                  // Monitoring
                  if (id.includes('@sentry')) {
                    return 'monitoring-vendor';
                  }
                  
                  return 'vendor';
                }
                
                // Feature-based chunks
                if (id.includes('/pages/Dashboard/')) {
                  return 'dashboard-pages';
                }
                if (id.includes('/pages/')) {
                  return 'pages';
                }
                if (id.includes('/components/')) {
                  return 'components';
                }
                if (id.includes('/utils/')) {
                  return 'utils';
                }
                if (id.includes('/contexts/')) {
                  return 'contexts';
                }
                if (id.includes('/hooks/')) {
                  return 'hooks';
                }
                if (id.includes('/routes/')) {
                  return 'routes';
                }
              },
            },
          },
          chunkSizeWarningLimit: 500, // Reduced from 1000
          target: 'esnext',
          cssCodeSplit: true,
        },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})