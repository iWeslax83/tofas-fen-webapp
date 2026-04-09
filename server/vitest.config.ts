import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'build/',
        'coverage/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 10000, // 10 seconds for hooks
    maxConcurrency: 1, // Run tests sequentially for database tests
    pool: 'forks', // Use fork pool for better isolation
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**'
    ],
    reporters: [
      'verbose',
      'html',
      'json'
    ],
    outputFile: {
      html: './coverage/test-report.html',
      json: './coverage/test-results.json'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './src/test'),
      '@models': path.resolve(__dirname, './src/models'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@middleware': path.resolve(__dirname, './src/middleware'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services')
    },
  },
  // Note: esbuild `define` statically rewrites `process.env.X` in source at
  // build time, so these values override any shell env var. Use 127.0.0.1
  // explicitly because `localhost` resolves to ::1 first on modern Node and
  // mongo running in Docker/podman typically binds IPv4 only.
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.MONGODB_URI': '"mongodb://127.0.0.1:27017/test-db"',
    'process.env.JWT_SECRET': '"test-jwt-secret"',
    'process.env.JWT_REFRESH_SECRET': '"test-refresh-secret"'
  }
})