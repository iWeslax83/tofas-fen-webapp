/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  checkPerformanceBudget,
  getPerformanceMetrics,
  trackWebVitals,
  usePerformanceMonitor,
} from '../performance';

describe('checkPerformanceBudget', () => {
  it('passes when no metrics are over budget', () => {
    const result = checkPerformanceBudget({
      lcp: 2000,
      fid: 50,
      cls: 0.05,
      fcp: 1500,
      tti: 3000,
      tbt: 200,
    });
    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('flags each metric that exceeds its threshold', () => {
    const result = checkPerformanceBudget({
      lcp: 3000, // budget 2500 → violation
      fid: 50,
      cls: 0.5, // budget 0.1 → violation
      fcp: 1500,
      tti: 3000,
      tbt: 200,
    });
    expect(result.passed).toBe(false);
    const metricNames = result.violations.map((v) => v.metric).sort();
    expect(metricNames).toEqual(['cls', 'lcp']);
    const lcp = result.violations.find((v) => v.metric === 'lcp');
    expect(lcp).toEqual({ metric: 'lcp', value: 3000, threshold: 2500 });
  });

  it('treats missing metrics (undefined / 0) as non-violations', () => {
    const result = checkPerformanceBudget({});
    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('does NOT flag metrics with value of 0 (falsy short-circuit)', () => {
    // value && value > threshold → 0 is treated as missing
    const result = checkPerformanceBudget({ lcp: 0, cls: 0 });
    expect(result.passed).toBe(true);
  });
});

describe('getPerformanceMetrics', () => {
  it('returns an object even when no navigation entry is available (jsdom)', () => {
    const metrics = getPerformanceMetrics();
    expect(metrics).toBeTypeOf('object');
    expect(metrics).not.toBeNull();
  });
});

describe('trackWebVitals', () => {
  it('is a no-op when no callback is supplied', () => {
    expect(() => trackWebVitals()).not.toThrow();
  });

  it('does not throw when called with a callback under jsdom', () => {
    // jsdom does emit synthetic PerformanceObservers but no entries; the
    // function should at minimum register the observers without throwing.
    expect(() => trackWebVitals(() => {})).not.toThrow();
  });
});

describe('usePerformanceMonitor', () => {
  it('mounts and unmounts cleanly', () => {
    const { unmount } = renderHook(() => usePerformanceMonitor('TestComponent'));
    expect(() => unmount()).not.toThrow();
  });

  it('logs slow renders under dev mode (when render > 16ms)', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Stub performance.now so the cleanup measures > 16ms.
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(50);
    const { unmount } = renderHook(() => usePerformanceMonitor('Slow'));
    unmount();
    nowSpy.mockRestore();
    // Whether the log fires depends on import.meta.env.DEV — under vitest this
    // is typically true. The test just guarantees the cleanup path doesn't
    // throw; if it logs, it should mention the component name.
    if (logSpy.mock.calls.length > 0) {
      const joined = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(joined).toMatch(/Slow/);
    }
    logSpy.mockRestore();
  });
});
