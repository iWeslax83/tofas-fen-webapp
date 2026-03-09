import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // No setupFiles - unit tests don't need MongoDB
    testTimeout: 10000,
    include: [
      'src/test/unit/**/*.test.ts'
    ],
    reporters: ['verbose'],
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
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.JWT_SECRET': '"test-jwt-secret-key-minimum-32-characters-long"',
    'process.env.JWT_REFRESH_SECRET': '"test-refresh-secret-key-minimum-32-characters"',
    'process.env.MONGODB_URI': '"mongodb://localhost:27017/test-db"',
  }
})
