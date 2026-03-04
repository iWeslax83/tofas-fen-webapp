import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';

// Mock react-hot-toast
const { mockToastError } = vi.hoisted(() => {
  const mockToastError = vi.fn();
  return { mockToastError };
});
vi.mock('react-hot-toast', () => {
  const mockToast = Object.assign(vi.fn(), { error: mockToastError, success: vi.fn() });
  return { default: mockToast, toast: mockToast };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useErrorHandler', () => {
  it('initializes with no error', () => {
    const { result } = renderHook(() => useErrorHandler());
    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });

  it('setError with string sets error state', () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => result.current.setError('Something went wrong'));
    expect(result.current.error).toBe('Something went wrong');
    expect(result.current.hasError).toBe(true);
  });

  it('setError with Error object extracts message', () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => result.current.setError(new Error('Test error')));
    expect(result.current.error).toBe('Test error');
    expect(result.current.hasError).toBe(true);
  });

  it('setError shows toast notification', () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => result.current.setError('Error toast'));
    expect(mockToastError).toHaveBeenCalledWith('Error toast');
  });

  it('setError with null clears error', () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => result.current.setError('Error'));
    act(() => result.current.setError(null));
    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });

  it('clearError resets error state', () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => result.current.setError('Error'));
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });

  it('handleAsyncError returns result on success', async () => {
    const { result } = renderHook(() => useErrorHandler());
    let value: string | null = null;
    await act(async () => {
      value = await result.current.handleAsyncError(async () => 'success');
    });
    expect(value).toBe('success');
    expect(result.current.hasError).toBe(false);
  });

  it('handleAsyncError catches and sets error', async () => {
    const { result } = renderHook(() => useErrorHandler());
    let value: string | null = null;
    await act(async () => {
      value = await result.current.handleAsyncError(async () => {
        throw new Error('Async fail');
      });
    });
    expect(value).toBeNull();
    expect(result.current.error).toBe('Async fail');
  });

  it('handleAsyncError uses custom error message', async () => {
    const { result } = renderHook(() => useErrorHandler());
    await act(async () => {
      await result.current.handleAsyncError(
        async () => { throw new Error('original'); },
        'Custom message'
      );
    });
    expect(result.current.error).toBe('Custom message');
  });

  it('handleApiError extracts error from response.data.error', () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => {
      result.current.handleApiError({ response: { data: { error: 'API error' } } });
    });
    expect(result.current.error).toBe('API error');
  });

  it('handleApiError extracts error from response.data.message', () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => {
      result.current.handleApiError({ response: { data: { message: 'API message' } } });
    });
    expect(result.current.error).toBe('API message');
  });

  it('handleApiError uses fallback message', () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => {
      result.current.handleApiError({}, 'Fallback');
    });
    expect(result.current.error).toBe('Fallback');
  });

  it('handleApiError uses error.message when no response data', () => {
    const { result } = renderHook(() => useErrorHandler());
    act(() => {
      result.current.handleApiError({ message: 'Direct message' });
    });
    expect(result.current.error).toBe('Direct message');
  });
});
