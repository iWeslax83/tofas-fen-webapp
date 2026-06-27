import { defineConfig } from 'vitest/config'
import path from 'path'
import { config as dotenvConfig } from 'dotenv'

// Load ONLY the root .env (docker-compose secrets like MONGO_PASSWORD).
// Do NOT load server/.env here — it contains MONGODB_URI pointing to the
// dev database without auth, which would clobber the test URI we build below.
dotenvConfig({ path: path.resolve(__dirname, '../.env') })

// Test database selection. By default the suite is hermetic: setup.ts spins up
// an in-memory MongoDB (mongodb-memory-server) so no external mongod is needed.
// Set TEST_MONGODB_URI to point the suite at a specific external MongoDB instead
// (CI service container, or a local mongod). Precedence when external:
//   1. TEST_MONGODB_URI verbatim.
//   2. docker-compose admin auth built from MONGO_PASSWORD.
//   3. auth-less local mongod fallback.
// USE_MEMORY_DB tells setup.ts which path to take (env must be set here so the
// test worker process sees it).
const externalUri = process.env.TEST_MONGODB_URI
const mongoPassword = process.env.MONGO_PASSWORD || ''
const useMemoryDb = !externalUri
const testMongoUri =
  externalUri ||
  (mongoPassword
    ? `mongodb://admin:${mongoPassword}@127.0.0.1:27017/tofas-fen-test?authSource=admin`
    : 'mongodb://127.0.0.1:27017/tofas-fen-test')

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
      USE_MEMORY_DB: useMemoryDb ? 'true' : 'false',
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