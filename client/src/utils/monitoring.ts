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
        // F-H3: match sensitive keys via regex so variations like `tcknHash`,
        // `student_tckn`, `refresh_token`, `sifreHash`, `notesPayload` are also
        // scrubbed. The old exact-lowercase list was leaky.
        const SENSITIVE_KEY =
          /(tckn|password|sifre|token|secret|authorization|cookie|session|api[-_]?key|credit|card|cvv|iban)/i;
        // Any key containing one of these hints likely carries a full request
        // or response body — redact the whole value.
        const BODY_LIKE_KEY = /^(body|payload|data|response|request|params|query)$/i;

        function scrub(value: unknown, depth = 0): unknown {
          if (depth > 6) return '[TRUNCATED]';
          if (value === null || typeof value !== 'object') return value;
          if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));

          const cleaned: Record<string, unknown> = {};
          for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
            if (SENSITIVE_KEY.test(key)) {
              cleaned[key] = '[REDACTED]';
            } else if (BODY_LIKE_KEY.test(key)) {
              // Keep shape info but drop contents.
              cleaned[key] = '[REDACTED_BODY]';
            } else {
              cleaned[key] = scrub(v, depth + 1);
            }
          }
          return cleaned;
        }

        if (event.extra) {
          event.extra = scrub(event.extra) as typeof event.extra;
        }
        if (event.contexts) {
          event.contexts = scrub(event.contexts) as typeof event.contexts;
        }
        if (event.request) {
          // Never send request bodies or cookies to Sentry.
          delete event.request.data;
          delete event.request.cookies;
          if (event.request.headers) {
            event.request.headers = scrub(event.request.headers) as Record<string, string>;
          }
        }
        if (event.breadcrumbs) {
          for (const crumb of event.breadcrumbs) {
            if (crumb.data) {
              // Reject bodies from breadcrumbs entirely — they're the biggest
              // source of accidental PII leaks because fetch/xhr breadcrumbs
              // attach request + response bodies by default.
              crumb.data = scrub(crumb.data) as typeof crumb.data;
            }
            if (crumb.message) {
              // Redact anything that looks like a JWT or 11-digit TCKN.
              crumb.message = crumb.message
                .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[REDACTED_JWT]')
                .replace(/\b\d{11}\b/g, '[REDACTED_TCKN]');
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
