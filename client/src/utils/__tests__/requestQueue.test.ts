/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestQueue, debounce, throttle } from '../requestQueue';

describe('requestQueue', () => {
  it('resolves the queued request with its return value', async () => {
    const result = await requestQueue.add(async () => 42);
    expect(result).toBe(42);
  });

  it('propagates rejections from the request', async () => {
    await expect(
      requestQueue.add(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });

  it('runs multiple requests and returns each value to the right caller', async () => {
    const results = await Promise.all([
      requestQueue.add(async () => 'a'),
      requestQueue.add(async () => 'b'),
      requestQueue.add(async () => 'c'),
    ]);
    expect(results).toEqual(['a', 'b', 'c']);
  });

  it('isolates rejections so other requests still resolve', async () => {
    const results = await Promise.allSettled([
      requestQueue.add(async () => 'ok'),
      requestQueue.add(async () => {
        throw new Error('fail');
      }),
      requestQueue.add(async () => 'ok-2'),
    ]);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
    expect(results[2].status).toBe('fulfilled');
  });

  it('getQueueLength reports 0 when idle', () => {
    expect(requestQueue.getQueueLength()).toBe(0);
  });

  it('clear() rejects requests that are still queued (past the first batch)', async () => {
    // batchSize is 5 — add more than that, then clear immediately. The
    // first 5 are already in-flight; the rest are still queued and
    // should reject with the 'cleared' message.
    const slow = () => new Promise<string>((resolve) => setTimeout(() => resolve('done'), 50));
    const inFlight = Array.from({ length: 5 }, () => requestQueue.add(slow));
    const queued = Array.from({ length: 3 }, () => requestQueue.add(slow));
    requestQueue.clear();
    const results = await Promise.allSettled(queued);
    results.forEach((r) => {
      expect(r.status).toBe('rejected');
      if (r.status === 'rejected') {
        expect(String(r.reason)).toMatch(/cleared/i);
      }
    });
    // Drain the in-flight ones so the global queue isn't left mid-process.
    await Promise.allSettled(inFlight);
  });
});

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns a callable function', () => {
    const debounced = debounce(() => 'x', 100);
    expect(typeof debounced).toBe('function');
  });

  it('does not invoke the wrapped fn synchronously', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('a');
    expect(fn).not.toHaveBeenCalled();
  });

  it('invokes the wrapped fn exactly once after the wait elapses', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('a');
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('coalesces rapid calls — only the trailing args fire', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('a');
    vi.advanceTimersByTime(50);
    debounced('b');
    vi.advanceTimersByTime(50);
    debounced('c');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });
});

describe('throttle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns a callable function', () => {
    const throttled = throttle(() => 'x', 100);
    expect(typeof throttled).toBe('function');
  });

  it('invokes the wrapped fn on the leading edge (synchronously)', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled('a');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('drops calls within the throttle window', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled('a');
    throttled('b');
    throttled('c');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('allows the next call after the throttle window elapses', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled('a');
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    throttled('b');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('b');
  });
});
