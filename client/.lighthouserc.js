/**
 * Lighthouse CI Configuration
 * Performance budget and Core Web Vitals tracking
 */

module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:5173'],
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        // Performance Budget
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.8 }],
        'categories:seo': ['error', { minScore: 0.8 }],
        
        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }], // 2s
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // 2.5s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // CLS < 0.1
        'total-blocking-time': ['error', { maxNumericValue: 300 }], // TBT < 300ms
        'speed-index': ['error', { maxNumericValue: 3000 }], // 3s
        
        // Resource Budgets
        'total-byte-weight': ['error', { maxNumericValue: 5000000 }], // 5MB
        'dom-size': ['error', { maxNumericValue: 1500 }], // DOM nodes
        
        // Network
        'uses-optimized-images': 'warn',
        'uses-text-compression': 'warn',
        'uses-responsive-images': 'warn',
        'modern-image-formats': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

