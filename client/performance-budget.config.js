/**
 * Performance Budget Configuration
 * Defines limits for bundle size, asset size, and Core Web Vitals
 */

export const performanceBudget = {
  // Bundle size limits (in KB)
  bundles: {
    main: 200, // Main bundle
    vendor: 300, // Vendor bundle
    total: 500, // Total bundle size
    chunk: 100, // Individual chunk size
  },
  
  // Asset size limits (in KB)
  assets: {
    image: 200, // Image files
    font: 50, // Font files
    video: 5000, // Video files
    total: 10000, // Total assets
  },
  
  // Core Web Vitals thresholds
  coreWebVitals: {
    lcp: 2500, // Largest Contentful Paint (ms)
    fid: 100, // First Input Delay (ms)
    cls: 0.1, // Cumulative Layout Shift
    fcp: 1800, // First Contentful Paint (ms)
    tti: 3800, // Time to Interactive (ms)
    tbt: 300, // Total Blocking Time (ms)
  },
  
  // Network thresholds
  network: {
    requests: 50, // Max number of requests
    totalSize: 5000, // Total page size (KB)
    timeToFirstByte: 600, // TTFB (ms)
  },
  
  // Runtime performance
  runtime: {
    memoryUsage: 50, // Max memory usage (MB)
    jsExecutionTime: 1000, // Max JS execution time (ms)
  },
};

// Bundle analyzer configuration
export const bundleAnalyzer = {
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
  analyzerMode: 'static',
  reportFilename: 'bundle-report.html',
};

