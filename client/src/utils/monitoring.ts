import * as Sentry from '@sentry/react';

// Performance monitoring interface
interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

// User analytics interface
interface UserEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
}

// Initialize Sentry
export function initializeSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN || '',
      integrations: [
        Sentry.browserTracingIntegration({
          tracePropagationTargets: ['localhost', 'your-domain.com'],
        }),
      ],
      tracesSampleRate: 0.1,
      environment: import.meta.env.MODE,
      beforeSend(event) {
        const sensitiveKeys = [
          'tckn',
          'tcknhash',
          'password',
          'sifre',
          'token',
          'refreshtoken',
          'secret',
          'authorization',
        ];

        function scrubObject(obj: Record<string, any>): Record<string, any> {
          const cleaned: Record<string, any> = {};
          for (const [key, value] of Object.entries(obj)) {
            if (sensitiveKeys.includes(key.toLowerCase())) {
              cleaned[key] = '[REDACTED]';
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              cleaned[key] = scrubObject(value);
            } else {
              cleaned[key] = value;
            }
          }
          return cleaned;
        }

        if (event.extra) {
          event.extra = scrubObject(event.extra as Record<string, any>);
        }
        if (event.contexts) {
          event.contexts = scrubObject(event.contexts as Record<string, any>);
        }
        if (event.breadcrumbs) {
          for (const crumb of event.breadcrumbs) {
            if (crumb.data?.headers) {
              delete crumb.data.headers.Authorization;
              delete crumb.data.headers.authorization;
            }
          }
        }
        return event;
      },
    });
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  measurePageLoad(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;

      if (navigation) {
        const pageLoadTime = navigation.loadEventEnd - navigation.loadEventStart;

        // Measure Core Web Vitals
        this.measureCoreWebVitals();

        this.metrics.push({
          pageLoadTime,
          firstContentfulPaint: 0,
          largestContentfulPaint: 0,
          cumulativeLayoutShift: 0,
          firstInputDelay: 0,
        });

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.log('Page Load Time:', pageLoadTime, 'ms');
        }

        // Send to monitoring service in production
        if (process.env.NODE_ENV === 'production') {
          this.sendMetricsToService({
            type: 'page_load',
            value: pageLoadTime,
            url: window.location.href,
          });
        }
      }
    }
  }

  private measureCoreWebVitals(): void {
    // First Contentful Paint
    if ('PerformanceObserver' in window) {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            const fcp = entry.startTime;
            if (process.env.NODE_ENV === 'production') {
              this.sendMetricsToService({
                type: 'fcp',
                value: fcp,
                url: window.location.href,
              });
            }
          }
        }
      });

      paintObserver.observe({ entryTypes: ['paint'] });
    }

    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const lcp = entry.startTime;
          if (process.env.NODE_ENV === 'production') {
            this.sendMetricsToService({
              type: 'lcp',
              value: lcp,
              url: window.location.href,
            });
          }
        }
      });

      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    }

    // Cumulative Layout Shift
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutEntry = entry as PerformanceEntry & Record<string, unknown>;
          if (!(layoutEntry['hadRecentInput'] as boolean)) {
            clsValue += layoutEntry['value'] as number;
          }
        }
      });

      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Report CLS after page unload
      window.addEventListener('beforeunload', () => {
        if (process.env.NODE_ENV === 'production') {
          this.sendMetricsToService({
            type: 'cls',
            value: clsValue,
            url: window.location.href,
          });
        }
      });
    }
  }

  private sendMetricsToService(metric: unknown): void {
    // Send to your analytics service
    fetch('/api/metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metric),
    }).catch(console.error);
  }

  getMetrics(): PerformanceMetrics[] {
    return this.metrics;
  }
}

// User analytics
export class Analytics {
  private static instance: Analytics;
  private events: UserEvent[] = [];

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  trackEvent(event: string, properties?: Record<string, unknown>): void {
    const userEvent: UserEvent = {
      event,
      properties: properties || {},
      timestamp: Date.now(),
    };

    this.events.push(userEvent);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', userEvent);
    }

    // Send to analytics service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendEventToService(userEvent);
    }
  }

  trackPageView(page: string): void {
    this.trackEvent('page_view', { page });
  }

  trackUserAction(action: string, details?: Record<string, any>): void {
    this.trackEvent('user_action', { action, ...details });
  }

  trackError(error: Error, context?: Record<string, any>): void {
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      ...context,
    });

    // Also send to Sentry
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, {
        extra: context || {},
      });
    }
  }

  private sendEventToService(event: UserEvent): void {
    // Send to your analytics service
    fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }).catch(console.error);
  }

  getEvents(): UserEvent[] {
    return this.events;
  }
}

// Memory monitoring
export class MemoryMonitor {
  static checkMemoryUsage(): void {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);

      // Warning if memory usage is high
      if (usedMB > limitMB * 0.8) {
        if (process.env.NODE_ENV === 'production') {
          Sentry.captureMessage('High memory usage detected', 'warning');
        }
      }
    }
  }

  static startMemoryMonitoring(interval: number = 30000): () => void {
    const intervalId = setInterval(() => {
      this.checkMemoryUsage();
    }, interval);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }
}

// Network monitoring
export class NetworkMonitor {
  static monitorNetworkRequests(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;

          // Log slow requests
          if (resourceEntry.duration > 3000) {
            if (process.env.NODE_ENV === 'production') {
              Sentry.captureMessage('Slow network request detected', 'warning');
            }
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
    }
  }
}

// Export instances
export const performanceMonitor = PerformanceMonitor.getInstance();
export const analytics = Analytics.getInstance();

// Initialize monitoring
export function initializeMonitoring(): void {
  // Initialize Sentry
  initializeSentry();

  // Start performance monitoring
  performanceMonitor.measurePageLoad();

  // Start memory monitoring
  MemoryMonitor.startMemoryMonitoring();

  // Start network monitoring
  NetworkMonitor.monitorNetworkRequests();

  // Track initial page view
  analytics.trackPageView(window.location.pathname);
}
