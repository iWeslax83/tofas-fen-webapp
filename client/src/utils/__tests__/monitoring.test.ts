/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sentryMocks = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
}));

vi.mock('@sentry/react', () => ({
  init: sentryMocks.init,
  captureException: sentryMocks.captureException,
  captureMessage: sentryMocks.captureMessage,
  browserTracingIntegration: sentryMocks.browserTracingIntegration,
}));

import { Analytics, PerformanceMonitor, MemoryMonitor } from '../monitoring';

describe('Analytics', () => {
  let analytics: Analytics;

  beforeEach(() => {
    analytics = Analytics.getInstance();
    // Drain prior events
    const events = analytics.getEvents();
    events.length = 0;
    sentryMocks.captureException.mockReset();
  });

  it('getInstance returns the same singleton', () => {
    expect(Analytics.getInstance()).toBe(analytics);
  });

  it('trackEvent records the event with timestamp + properties', () => {
    analytics.trackEvent('login_clicked', { method: 'tckn' });
    const events = analytics.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: 'login_clicked',
      properties: { method: 'tckn' },
    });
    expect(typeof events[0].timestamp).toBe('number');
  });

  it('trackEvent defaults properties to {} when omitted', () => {
    analytics.trackEvent('ping');
    expect(analytics.getEvents()[0].properties).toEqual({});
  });

  it('trackPageView records a page_view event with the page in properties', () => {
    analytics.trackPageView('/dashboard');
    const events = analytics.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('page_view');
    expect(events[0].properties).toEqual({ page: '/dashboard' });
  });

  it('trackUserAction records a user_action with merged details', () => {
    analytics.trackUserAction('clicked_save', { id: 7 });
    const events = analytics.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('user_action');
    expect(events[0].properties).toEqual({ action: 'clicked_save', id: 7 });
  });

  it('trackError records an error event with message + stack', () => {
    const err = new Error('boom');
    analytics.trackError(err, { component: 'X' });
    const events = analytics.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('error');
    expect(events[0].properties).toMatchObject({
      message: 'boom',
      component: 'X',
    });
    expect(typeof events[0].properties?.stack).toBe('string');
  });

  it('trackError does NOT call Sentry.captureException in non-production', () => {
    analytics.trackError(new Error('x'));
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
  });

  it('getEvents returns the same underlying array (live view)', () => {
    analytics.trackEvent('a');
    const before = analytics.getEvents();
    analytics.trackEvent('b');
    const after = analytics.getEvents();
    expect(after).toBe(before); // same reference
    expect(after.length).toBe(2);
  });
});

describe('PerformanceMonitor', () => {
  it('getInstance returns the same singleton', () => {
    expect(PerformanceMonitor.getInstance()).toBe(PerformanceMonitor.getInstance());
  });

  it('getMetrics returns an array', () => {
    expect(Array.isArray(PerformanceMonitor.getInstance().getMetrics())).toBe(true);
  });

  it('measurePageLoad is safe to call when there is no PerformanceNavigationTiming entry', () => {
    // jsdom does not provide a real navigation entry, so this should no-op
    // without throwing.
    const monitor = PerformanceMonitor.getInstance();
    expect(() => monitor.measurePageLoad()).not.toThrow();
  });
});

describe('MemoryMonitor', () => {
  it('startMemoryMonitoring returns a cleanup function that clears the interval', () => {
    vi.useFakeTimers();
    const setSpy = vi.spyOn(global, 'setInterval');
    const clearSpy = vi.spyOn(global, 'clearInterval');

    const cleanup = MemoryMonitor.startMemoryMonitoring(1000);
    expect(setSpy).toHaveBeenCalled();
    cleanup();
    expect(clearSpy).toHaveBeenCalled();

    setSpy.mockRestore();
    clearSpy.mockRestore();
    vi.useRealTimers();
  });

  it('checkMemoryUsage is safe to call when performance.memory is unavailable', () => {
    expect(() => MemoryMonitor.checkMemoryUsage()).not.toThrow();
  });
});
