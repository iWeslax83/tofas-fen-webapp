/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDebounce } from '../usePerformance';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a callable function', () => {
    const { result } = renderHook(() => useDebounce(() => 'noop', 100));
    expect(typeof result.current).toBe('function');
  });

  it('does not invoke the callback synchronously', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useDebounce(cb, 100));
    result.current('x');
    expect(cb).not.toHaveBeenCalled();
  });

  it('invokes the callback exactly once after the delay elapses', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useDebounce(cb, 100));
    result.current('x');
    vi.advanceTimersByTime(99);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('x');
  });

  it('coalesces rapid calls into a single trailing invocation', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useDebounce(cb, 100));
    result.current('a');
    vi.advanceTimersByTime(50);
    result.current('b');
    vi.advanceTimersByTime(50);
    result.current('c');
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('c');
  });

  it('forwards every argument to the callback', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useDebounce(cb, 50));
    result.current(1, 'two', { three: 3 });
    vi.advanceTimersByTime(50);
    expect(cb).toHaveBeenCalledWith(1, 'two', { three: 3 });
  });
});
