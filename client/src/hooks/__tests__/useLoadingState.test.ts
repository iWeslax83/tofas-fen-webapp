import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoadingState } from '../useLoadingState';

describe('useLoadingState', () => {
  it('initializes with idle state', () => {
    const { result } = renderHook(() => useLoadingState());
    expect(result.current.loading).toBe('idle');
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('startLoading sets state to loading', () => {
    const { result } = renderHook(() => useLoadingState());
    act(() => result.current.startLoading());
    expect(result.current.loading).toBe('loading');
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isIdle).toBe(false);
  });

  it('setSuccess sets state to success', () => {
    const { result } = renderHook(() => useLoadingState());
    act(() => result.current.setSuccess());
    expect(result.current.loading).toBe('success');
    expect(result.current.isSuccess).toBe(true);
  });

  it('setError sets state to error', () => {
    const { result } = renderHook(() => useLoadingState());
    act(() => result.current.setError());
    expect(result.current.loading).toBe('error');
    expect(result.current.isError).toBe(true);
  });

  it('reset returns to idle', () => {
    const { result } = renderHook(() => useLoadingState());
    act(() => result.current.startLoading());
    act(() => result.current.reset());
    expect(result.current.loading).toBe('idle');
    expect(result.current.isIdle).toBe(true);
  });

  it('setLoading accepts any valid state', () => {
    const { result } = renderHook(() => useLoadingState());
    act(() => result.current.setLoading('success'));
    expect(result.current.isSuccess).toBe(true);
    act(() => result.current.setLoading('error'));
    expect(result.current.isError).toBe(true);
    act(() => result.current.setLoading('idle'));
    expect(result.current.isIdle).toBe(true);
  });

  it('withLoading returns result on success', async () => {
    const { result } = renderHook(() => useLoadingState());
    let value: number | null = null;
    await act(async () => {
      value = await result.current.withLoading(async () => 42);
    });
    expect(value).toBe(42);
    expect(result.current.isSuccess).toBe(true);
  });

  it('withLoading transitions through loading → success', async () => {
    const { result } = renderHook(() => useLoadingState());
    await act(async () => {
      await result.current.withLoading(async () => 'ok');
    });
    expect(result.current.isSuccess).toBe(true);
  });

  it('withLoading catches error and sets error state', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useLoadingState());
    let value: string | null = null;
    await act(async () => {
      value = await result.current.withLoading(async () => {
        throw new Error('fail');
      });
    });
    expect(value).toBeNull();
    expect(result.current.isError).toBe(true);
    consoleSpy.mockRestore();
  });

  it('boolean selectors are mutually exclusive', () => {
    const { result } = renderHook(() => useLoadingState());
    // idle
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);

    act(() => result.current.startLoading());
    expect(result.current.isIdle).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});
