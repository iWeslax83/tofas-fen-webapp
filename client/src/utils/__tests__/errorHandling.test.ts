import { describe, it, expect, vi, beforeEach } from 'vitest';

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  loading: vi.fn(),
}));

const analyticsMocks = vi.hoisted(() => ({
  trackError: vi.fn(),
  getInstance: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastMocks.error,
    loading: toastMocks.loading,
  },
}));

vi.mock('../monitoring', () => ({
  Analytics: {
    getInstance: () => ({
      trackError: analyticsMocks.trackError,
    }),
  },
}));

import { ErrorHandler, errorHandler } from '../errorHandling';
import { AppError, ErrorType, ErrorSeverity } from '../AppError';

describe('ErrorHandler.categorizeError', () => {
  const handler = ErrorHandler.getInstance();

  beforeEach(() => {
    toastMocks.error.mockReset();
    toastMocks.loading.mockReset();
    analyticsMocks.trackError.mockReset();
    handler.clearErrorQueue();
  });

  it('returns the same singleton via getInstance and the exported errorHandler', () => {
    expect(ErrorHandler.getInstance()).toBe(handler);
    expect(errorHandler).toBe(handler);
  });

  it('produces an AppError with the original error attached when input is an Error', () => {
    const cause = new Error('boom');
    const ae = handler.categorizeError(cause);
    expect(ae).toBeInstanceOf(AppError);
    expect(ae.originalError).toBe(cause);
  });

  it('categorises NETWORK_ERROR code as NETWORK', () => {
    const ae = handler.categorizeError({ code: 'NETWORK_ERROR' });
    expect(ae.type).toBe(ErrorType.NETWORK);
    expect(ae.severity).toBe(ErrorSeverity.MEDIUM);
    expect(ae.message).toBe('İnternet bağlantısı hatası');
  });

  it('categorises a "Network Error" message as NETWORK', () => {
    const ae = handler.categorizeError({ message: 'A Network Error happened' });
    expect(ae.type).toBe(ErrorType.NETWORK);
  });

  it('categorises HTTP 401 as AUTHENTICATION (HIGH severity)', () => {
    const ae = handler.categorizeError({ response: { status: 401, data: { message: 'no auth' } } });
    expect(ae.type).toBe(ErrorType.AUTHENTICATION);
    expect(ae.severity).toBe(ErrorSeverity.HIGH);
    expect(ae.message).toBe('no auth');
  });

  it('falls back to a Turkish default message when 401 has no data.message', () => {
    const ae = handler.categorizeError({ response: { status: 401 } });
    expect(ae.message).toBe('Kimlik doğrulama hatası');
  });

  it('categorises 403 as AUTHORIZATION (HIGH severity)', () => {
    const ae = handler.categorizeError({ response: { status: 403 } });
    expect(ae.type).toBe(ErrorType.AUTHORIZATION);
    expect(ae.severity).toBe(ErrorSeverity.HIGH);
  });

  it('categorises 400 as VALIDATION (LOW severity)', () => {
    const ae = handler.categorizeError({ response: { status: 400 } });
    expect(ae.type).toBe(ErrorType.VALIDATION);
    expect(ae.severity).toBe(ErrorSeverity.LOW);
  });

  it('categorises 404 as CLIENT (MEDIUM severity)', () => {
    const ae = handler.categorizeError({ response: { status: 404 } });
    expect(ae.type).toBe(ErrorType.CLIENT);
    expect(ae.severity).toBe(ErrorSeverity.MEDIUM);
  });

  it('categorises 500/502/503 as SERVER (HIGH severity)', () => {
    for (const status of [500, 502, 503]) {
      const ae = handler.categorizeError({ response: { status } });
      expect(ae.type).toBe(ErrorType.SERVER);
      expect(ae.severity).toBe(ErrorSeverity.HIGH);
    }
  });

  it('falls back to UNKNOWN for unrecognised HTTP statuses', () => {
    const ae = handler.categorizeError({ response: { status: 418 } });
    expect(ae.type).toBe(ErrorType.UNKNOWN);
  });

  it('categorises ValidationError name as VALIDATION', () => {
    const ae = handler.categorizeError({ name: 'ValidationError', message: 'oops' });
    expect(ae.type).toBe(ErrorType.VALIDATION);
    expect(ae.message).toBe('oops');
  });

  it('categorises a "validation" substring in the message as VALIDATION', () => {
    const ae = handler.categorizeError({ message: 'validation failed' });
    expect(ae.type).toBe(ErrorType.VALIDATION);
  });

  it('categorises TypeError/ReferenceError names as CLIENT', () => {
    const a = handler.categorizeError({ name: 'TypeError', message: 'a' });
    const b = handler.categorizeError({ name: 'ReferenceError', message: 'b' });
    expect(a.type).toBe(ErrorType.CLIENT);
    expect(b.type).toBe(ErrorType.CLIENT);
  });

  it('attaches the supplied context onto the resulting AppError', () => {
    const ae = handler.categorizeError(new Error('x'), {
      component: 'X',
      action: 'A',
      userId: 'u-1',
    });
    expect(ae.context.component).toBe('X');
    expect(ae.context.action).toBe('A');
    expect(ae.context.userId).toBe('u-1');
  });

  it('falls back to UNKNOWN with default message when given a primitive', () => {
    const ae = handler.categorizeError('a random string');
    expect(ae.type).toBe(ErrorType.UNKNOWN);
    expect(ae.message).toBe('Beklenmeyen bir hata oluştu');
  });
});

describe('ErrorHandler.handleError + processError', () => {
  const handler = ErrorHandler.getInstance();

  beforeEach(() => {
    toastMocks.error.mockReset();
    analyticsMocks.trackError.mockReset();
    handler.clearErrorQueue();
  });

  it('shows a toast.error for medium-severity errors', async () => {
    await handler.handleError({ response: { status: 500 } });
    expect(toastMocks.error).toHaveBeenCalled();
    const [msg, opts] = toastMocks.error.mock.calls[0];
    expect(msg).toBe('Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.');
    expect(opts).toMatchObject({ duration: expect.any(Number), icon: expect.any(String) });
  });

  it('does NOT show a toast for LOW-severity errors (e.g. validation)', async () => {
    await handler.handleError({ response: { status: 400 } });
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it('reports the error to Analytics.trackError', async () => {
    await handler.handleError({ response: { status: 500 } }, { component: 'C' });
    expect(analyticsMocks.trackError).toHaveBeenCalledTimes(1);
    const [appErr, meta] = analyticsMocks.trackError.mock.calls[0];
    expect(appErr).toBeInstanceOf(AppError);
    expect(meta).toMatchObject({
      type: ErrorType.SERVER,
      severity: ErrorSeverity.HIGH,
      component: 'C',
    });
  });
});

describe('ErrorHandler.getRecoverySuggestion / shouldRetry', () => {
  const handler = ErrorHandler.getInstance();

  it('returns the recovery action for a known type', () => {
    const ae = new AppError('x', ErrorType.NETWORK, ErrorSeverity.MEDIUM);
    expect(handler.getRecoverySuggestion(ae)).toBe('Ağ bağlantısını kontrol edin');
  });

  it('returns null for an unrecognised type', () => {
    const ae = new AppError('x', 'no-such-type' as ErrorType, ErrorSeverity.MEDIUM);
    expect(handler.getRecoverySuggestion(ae)).toBeNull();
  });

  it('shouldRetry returns true for NETWORK and false for VALIDATION', () => {
    expect(handler.shouldRetry(new AppError('x', ErrorType.NETWORK, ErrorSeverity.MEDIUM))).toBe(
      true,
    );
    expect(handler.shouldRetry(new AppError('x', ErrorType.VALIDATION, ErrorSeverity.LOW))).toBe(
      false,
    );
  });

  it('shouldRetry returns false for an unrecognised type', () => {
    expect(
      handler.shouldRetry(new AppError('x', 'no-such-type' as ErrorType, ErrorSeverity.MEDIUM)),
    ).toBe(false);
  });
});

describe('ErrorHandler.getErrorStats / clearErrorQueue', () => {
  const handler = ErrorHandler.getInstance();

  beforeEach(() => {
    handler.clearErrorQueue();
    toastMocks.error.mockReset();
    analyticsMocks.trackError.mockReset();
  });

  it('clearErrorQueue empties the queue', async () => {
    await handler.handleError({ response: { status: 500 } });
    handler.clearErrorQueue();
    expect(handler.getErrorStats().total).toBe(0);
  });
});

describe('ErrorHandler.retryOperation', () => {
  const handler = ErrorHandler.getInstance();

  beforeEach(() => {
    toastMocks.loading.mockReset();
  });

  it('returns the value when the operation resolves on the first try', async () => {
    const op = vi.fn().mockResolvedValue('ok');
    await expect(handler.retryOperation(op)).resolves.toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('does not retry on a non-retryable error (validation)', async () => {
    const op = vi.fn().mockRejectedValue({ response: { status: 400 } });
    await expect(handler.retryOperation(op)).rejects.toBeInstanceOf(AppError);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries up to the supplied maxRetries on a retryable error and ultimately rejects', async () => {
    vi.useFakeTimers();
    const op = vi.fn().mockRejectedValue({ code: 'NETWORK_ERROR' });

    const promise = handler.retryOperation(op, undefined, 3);
    promise.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toBeInstanceOf(AppError);
    // 1 initial attempt + 3 retries = 4 total invocations
    expect(op).toHaveBeenCalledTimes(4);
    vi.useRealTimers();
  });

  it('uses the default retry budget (UNKNOWN.maxRetries=1) when maxRetries is omitted', async () => {
    vi.useFakeTimers();
    const op = vi.fn().mockRejectedValue({ code: 'NETWORK_ERROR' });

    const promise = handler.retryOperation(op);
    promise.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toBeInstanceOf(AppError);
    // 1 initial attempt + 1 retry = 2 total invocations
    expect(op).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('returns the value when a retryable operation eventually succeeds', async () => {
    vi.useFakeTimers();
    const op = vi.fn().mockRejectedValueOnce({ code: 'NETWORK_ERROR' }).mockResolvedValue('ok');

    const promise = handler.retryOperation(op);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe('ok');
    expect(op).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
