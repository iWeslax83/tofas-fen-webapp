/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  useDebounce,
  useThrottle,
  useVirtualization,
  useMemoryMonitor,
  useRenderPerformance,
  usePerformanceMetrics,
} from '../usePerformance';
import { useUIStore } from '../../stores/uiStore';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('only fires the underlying callback after the delay', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useDebounce(cb, 200));
    act(() => {
      (result.current as (n: number) => void)(1);
    });
    expect(cb).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(cb).toHaveBeenCalledWith(1);
  });

  it('resets the timer on each call (latest wins)', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useDebounce(cb, 200));
    act(() => {
      (result.current as (n: number) => void)(1);
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      (result.current as (n: number) => void)(2);
    });
    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(cb).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(2);
  });
});

describe('useThrottle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires immediately on first call', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useThrottle(cb, 200));
    act(() => {
      (result.current as (n: number) => void)(1);
    });
    expect(cb).toHaveBeenCalledWith(1);
  });

  it('drops calls inside the throttle window', () => {
    const cb = vi.fn();
    // Throttle compares against Date.now(), with lastCallRef.current=0 — so
    // the very first call's `now - 0` must be >= delay. Push the clock past
    // the threshold before the first invocation.
    vi.setSystemTime(new Date(1_000_000));
    const { result } = renderHook(() => useThrottle(cb, 200));
    act(() => {
      (result.current as (n: number) => void)(1);
    });
    expect(cb).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    act(() => {
      (result.current as (n: number) => void)(2);
    });
    expect(cb).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      (result.current as (n: number) => void)(3);
    });
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith(3);
  });
});

describe('useVirtualization', () => {
  it('computes the visible window for the initial scrollTop=0', () => {
    const { result } = renderHook(() => useVirtualization(100, 50, 200));
    expect(result.current.totalHeight).toBe(5000);
    expect(result.current.offsetY).toBe(0);
    // 200/50 = 4 visible + 1 buffer = 5 items, starting at 0
    expect(result.current.visibleItems).toEqual([0, 1, 2, 3, 4]);
  });

  it('shifts the visible window when setScrollTop is called', () => {
    const { result } = renderHook(() => useVirtualization(100, 50, 200));
    act(() => {
      result.current.setScrollTop(125);
    });
    // floor(125/50) = 2 → start
    expect(result.current.offsetY).toBe(100);
    expect(result.current.visibleItems[0]).toBe(2);
  });

  it('clamps the visible end to itemCount', () => {
    const { result } = renderHook(() => useVirtualization(3, 50, 500));
    expect(result.current.visibleItems).toEqual([0, 1, 2]);
  });
});

describe('useMemoryMonitor', () => {
  it('stays null when performance.memory is unavailable', () => {
    const original = (performance as unknown as { memory?: unknown }).memory;
    if (original !== undefined) {
      delete (performance as unknown as { memory?: unknown }).memory;
    }
    const { result } = renderHook(() => useMemoryMonitor());
    expect(result.current.memoryInfo).toBeNull();
    expect(result.current.getMemoryUsagePercentage()).toBe(0);
    expect(result.current.isMemoryHigh()).toBe(false);
    if (original !== undefined) {
      (performance as unknown as { memory: unknown }).memory = original;
    }
  });

  it('reads from performance.memory when available', () => {
    (performance as unknown as { memory: unknown }).memory = {
      usedJSHeapSize: 50,
      totalJSHeapSize: 100,
      jsHeapSizeLimit: 100,
    };
    const { result } = renderHook(() => useMemoryMonitor());
    expect(result.current.memoryInfo).toEqual({
      usedJSHeapSize: 50,
      totalJSHeapSize: 100,
      jsHeapSizeLimit: 100,
    });
    expect(result.current.getMemoryUsagePercentage()).toBe(50);
    expect(result.current.isMemoryHigh()).toBe(false);
    delete (performance as unknown as { memory?: unknown }).memory;
  });

  it('isMemoryHigh flips true above 80% utilisation', () => {
    (performance as unknown as { memory: unknown }).memory = {
      usedJSHeapSize: 90,
      totalJSHeapSize: 100,
      jsHeapSizeLimit: 100,
    };
    const { result } = renderHook(() => useMemoryMonitor());
    expect(result.current.isMemoryHigh()).toBe(true);
    delete (performance as unknown as { memory?: unknown }).memory;
  });
});

describe('useRenderPerformance', () => {
  it('mounts and unmounts without throwing', () => {
    const { unmount } = renderHook(() => useRenderPerformance('Foo'));
    expect(() => unmount()).not.toThrow();
  });
});

describe('usePerformanceMetrics', () => {
  beforeEach(() => {
    useUIStore.getState().setGlobalLoading(false);
  });

  it('measureSync forwards the return value', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    const value = result.current.measureSync('compute', () => 42);
    expect(value).toBe(42);
  });

  it('measureSync rethrows the underlying error', () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    expect(() =>
      result.current.measureSync('boom', () => {
        throw new Error('x');
      }),
    ).toThrow('x');
  });

  it('measureAsync forwards the resolved value', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    await expect(result.current.measureAsync('fetch', async () => 'ok')).resolves.toBe('ok');
  });

  it('measureAsync toggles global loading when showLoading is true', async () => {
    const original = useUIStore.getState().setGlobalLoading;
    const spy = vi.fn(original);
    // Inject the spy BEFORE rendering so the hook destructures it.
    useUIStore.setState({ setGlobalLoading: spy });

    const { result } = renderHook(() => usePerformanceMetrics());
    await result.current.measureAsync('fetch', async () => 'ok', true);
    const flags = spy.mock.calls.map((c) => c[0]);
    expect(flags[0]).toBe(true);
    expect(flags[flags.length - 1]).toBe(false);

    useUIStore.setState({ setGlobalLoading: original });
  });

  it('measureAsync does NOT toggle global loading when showLoading is false (default)', async () => {
    const original = useUIStore.getState().setGlobalLoading;
    const spy = vi.fn(original);
    useUIStore.setState({ setGlobalLoading: spy });

    const { result } = renderHook(() => usePerformanceMetrics());
    await result.current.measureAsync('fetch', async () => 'ok');
    expect(spy).not.toHaveBeenCalled();

    useUIStore.setState({ setGlobalLoading: original });
  });

  it('measureAsync rejects when the underlying promise rejects', async () => {
    const { result } = renderHook(() => usePerformanceMetrics());
    await expect(
      result.current.measureAsync('boom', async () => {
        throw new Error('x');
      }),
    ).rejects.toThrow('x');
  });
});
