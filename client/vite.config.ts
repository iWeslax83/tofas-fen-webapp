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
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
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
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
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
  // F-H8: strip all console.* calls from production builds. The codebase
  // still uses raw `console.error(...)` in many files and rewriting each is
  // out of scope here; letting esbuild drop them at build time achieves the
  // same effect (no info leakage via browser console) without touching every
  // page. `debugger` statements are dropped too. Dev builds keep them.
  esbuild: {
    drop: ['console', 'debugger'],
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        // Exactly two vendor chunks, and the split is chosen so the chunk
        // graph cannot contain a cycle: `react-vendor` is a leaf (everything
        // imports it, it imports nothing) and `vendor` only ever points at
        // `react-vendor`.
        //
        // The previous config assigned a chunk per vendor package (chart-,
        // radix-, monitoring-, ... , plus a catch-all `vendor`). Package-level
        // splitting cuts the module graph where it has edges going both ways —
        // `@sentry-internal/*` fell into `vendor` yet imports `@sentry/core`;
        // `victory-vendor` fell into `vendor` yet imports `d3-shape`. That
        // produced vendor<->monitoring-vendor, vendor<->chart-vendor and
        // vendor<->radix-vendor cycles. Circular ESM chunks are legal, but a
        // `const` read across the cycle throws "Cannot access 'X' before
        // initialization" and the app never mounts.
        //
        // `scheduler` must travel with React — react-dom depends on it at
        // runtime, and separating them killed the bundle with
        // "Cannot set properties of undefined (setting 'unstable_now')".
        //
        // Don't reintroduce per-package chunks without checking the emitted
        // chunk graph for cycles; a passing `vite build` does not catch this.
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            const pkg = id.split('node_modules/').pop()?.split('/')[0];

            if (
              pkg === 'react' ||
              pkg === 'react-dom' ||
              pkg === 'scheduler' ||
              pkg === 'react-is'
            ) {
              return 'react-vendor';
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
    chunkSizeWarningLimit: 500, // Catch bundle size regressions early
    target: 'esnext',
    cssCodeSplit: true,
    reportCompressedSize: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})