/**
 * Performance monitoring and Core Web Vitals tracking
 */

import { useEffect } from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id: string;
  navigationType?: string;
}

interface PerformanceBudget {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  tti: number;
  tbt: number;
}

// Performance budget thresholds
const BUDGET: PerformanceBudget = {
  lcp: 2500, // Largest Contentful Paint (ms)
  fid: 100, // First Input Delay (ms)
  cls: 0.1, // Cumulative Layout Shift
  fcp: 1800, // First Contentful Paint (ms)
  tti: 3800, // Time to Interactive (ms)
  tbt: 300, // Total Blocking Time (ms)
};

// Rating function
function getRating(
  value: number,
  threshold: { good: number; poor: number },
): 'good' | 'needs-improvement' | 'poor' {
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

// Core Web Vitals thresholds
const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
  tti: { good: 3800, poor: 7300 },
  tbt: { good: 300, poor: 600 },
};

/**
 * Track Core Web Vitals
 */
export function trackWebVitals(onPerfEntry?: (metric: PerformanceMetric) => void) {
  if (!onPerfEntry || typeof window === 'undefined') {
    return;
  }

  // LCP - Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & Record<string, unknown>;
        const value = (lastEntry['renderTime'] as number) || (lastEntry['loadTime'] as number) || 0;
        const metric: PerformanceMetric = {
          name: 'LCP',
          value,
          rating: getRating(value, THRESHOLDS.lcp),
          id: (lastEntry['id'] as string) || '',
          navigationType: lastEntry['navigationType'] as string | undefined,
        };
        onPerfEntry(metric);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP tracking not supported', e);
    }

    // FID - First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: PerformanceEntry & Record<string, unknown>) => {
          const value = (entry['processingStart'] as number) - (entry['startTime'] as number);
          const metric: PerformanceMetric = {
            name: 'FID',
            value,
            rating: getRating(value, THRESHOLDS.fid),
            id: (entry['id'] as string) || '',
            navigationType: entry['navigationType'] as string | undefined,
          };
          onPerfEntry(metric);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID tracking not supported', e);
    }

    // CLS - Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: PerformanceEntry & Record<string, unknown>) => {
          if (!(entry['hadRecentInput'] as boolean)) {
            clsValue += (entry['value'] as number) || 0;
          }
        });
        const metric: PerformanceMetric = {
          name: 'CLS',
          value: clsValue,
          rating: getRating(clsValue, THRESHOLDS.cls),
          id: 'cls',
        };
        onPerfEntry(metric);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS tracking not supported', e);
    }

    // FCP - First Contentful Paint
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: PerformanceEntry & Record<string, unknown>) => {
          if (entry.name === 'first-contentful-paint') {
            const start = entry.startTime || 0;
            const metric: PerformanceMetric = {
              name: 'FCP',
              value: start,
              rating: getRating(start, THRESHOLDS.fcp),
              id: (entry['id'] as string) || '',
            };
            onPerfEntry(metric);
          }
        });
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('FCP tracking not supported', e);
    }
  }
}

/**
 * Get performance metrics
 */
export function getPerformanceMetrics(): Record<string, number> {
  if (typeof window === 'undefined' || !window.performance) {
    return {};
  }

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');

  const metrics: Record<string, number> = {};

  if (navigation) {
    metrics.dns = navigation.domainLookupEnd - navigation.domainLookupStart;
    metrics.tcp = navigation.connectEnd - navigation.connectStart;
    metrics.request = navigation.responseStart - navigation.requestStart;
    metrics.response = navigation.responseEnd - navigation.responseStart;
    metrics.domProcessing = navigation.domComplete - navigation.domInteractive;
    metrics.load = navigation.loadEventEnd - navigation.fetchStart;
  }

  paint.forEach((entry) => {
    if (entry.name === 'first-contentful-paint') {
      metrics.fcp = entry.startTime;
    }
  });

  return metrics;
}

/**
 * Check if performance budget is met
 */
export function checkPerformanceBudget(metrics: Record<string, number>): {
  passed: boolean;
  violations: Array<{ metric: string; value: number; threshold: number }>;
} {
  const violations: Array<{ metric: string; value: number; threshold: number }> = [];

  Object.entries(BUDGET).forEach(([key, threshold]) => {
    const value = metrics[key.toLowerCase()];
    if (value && value > threshold) {
      violations.push({ metric: key, value, threshold });
    }
  });

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Log performance metrics to console (development only)
 */
export function logPerformanceMetrics() {
  if (import.meta.env.DEV) {
    const metrics = getPerformanceMetrics();
    console.group('🚀 Performance Metrics');
    Object.entries(metrics).forEach(([key, value]) => {
      console.log(`${key}: ${value.toFixed(2)}ms`);
    });
    console.groupEnd();
  }
}

/**
 * Hook to monitor component performance
 */
export function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const startTime = performance.now();

    return () => {
      const renderTime = performance.now() - startTime;
      if (import.meta.env.DEV && renderTime > 16) {
        console.log(`[Performance] ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
      }
    };
  });
}
