import { defineConfig } from 'vitest/config'
import path from 'path'
import { config as dotenvConfig } from 'dotenv'

// Load ONLY the root .env (docker-compose secrets like MONGO_PASSWORD).
// Do NOT load server/.env here — it contains MONGODB_URI pointing to the
// dev database without auth, which would clobber the test URI we build below.
dotenvConfig({ path: path.resolve(__dirname, '../.env') })

// Always build a dedicated test URI with auth credentials from docker-compose.
// Ignore any MONGODB_URI already in the environment (it came from server/.env
// or the shell and points to dev/production, not the test database).
const mongoPassword = process.env.MONGO_PASSWORD || ''
const testMongoUri = mongoPassword
  ? `mongodb://admin:${mongoPassword}@127.0.0.1:27017/tofas-fen-test?authSource=admin`
  : 'mongodb://127.0.0.1:27017/tofas-fen-test'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // Set env vars BEFORE any module is imported, so top-level
    // validations (e.g. JWT_SECRET length check) see test values.
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: testMongoUri,
      JWT_SECRET: 'test-jwt-secret-key-for-vitest-minimum-32-chars',
      JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-vitest-min-32-chars',
    },
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
})