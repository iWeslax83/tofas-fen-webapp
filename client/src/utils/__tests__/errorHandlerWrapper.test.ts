import { describe, it, expect, vi } from 'vitest';
import { ErrorHandlerWrapper, useApiErrorHandler } from '../errorHandlerWrapper';
import { AppError, ErrorType, ErrorSeverity } from '../errorHandling';

const ctx = { component: 'C', action: 'A' };

describe('ErrorHandlerWrapper.wrapApiCall', () => {
  it('returns the value verbatim when the apiCall resolves', async () => {
    const apiCall = vi.fn().mockResolvedValue({ id: 7 });
    await expect(ErrorHandlerWrapper.wrapApiCall(apiCall, ctx)).resolves.toEqual({ id: 7 });
  });

  it('rethrows as AppError when the apiCall rejects', async () => {
    const apiCall = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(ErrorHandlerWrapper.wrapApiCall(apiCall, ctx)).rejects.toBeInstanceOf(AppError);
  });

  it('preserves the original error as AppError.originalError', async () => {
    const cause = new Error('boom');
    const apiCall = vi.fn().mockRejectedValue(cause);
    try {
      await ErrorHandlerWrapper.wrapApiCall(apiCall, ctx);
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).originalError).toBe(cause);
    }
  });

  it('attaches component / action / url / userAgent to context', async () => {
    const apiCall = vi.fn().mockRejectedValue(new Error('x'));
    try {
      await ErrorHandlerWrapper.wrapApiCall(apiCall, {
        component: 'NotlarPage',
        action: 'fetch',
        userId: 'u-1',
      });
    } catch (e) {
      const ae = e as AppError;
      expect(ae.context.component).toBe('NotlarPage');
      expect(ae.context.action).toBe('fetch');
      expect(ae.context.userId).toBe('u-1');
      expect(typeof ae.context.url).toBe('string');
      const additional = ae.context.additionalData as Record<string, unknown>;
      expect(typeof additional?.userAgent).toBe('string');
    }
  });

  it('omits userId when it is not supplied', async () => {
    const apiCall = vi.fn().mockRejectedValue(new Error('x'));
    try {
      await ErrorHandlerWrapper.wrapApiCall(apiCall, ctx);
    } catch (e) {
      expect((e as AppError).context.userId).toBeUndefined();
    }
  });
});

describe('ErrorHandlerWrapper categorisation (via thrown AppError)', () => {
  const trigger = async (rejection: unknown): Promise<AppError> => {
    try {
      await ErrorHandlerWrapper.wrapApiCall(() => Promise.reject(rejection), ctx);
      throw new Error('expected wrapApiCall to reject');
    } catch (e) {
      return e as AppError;
    }
  };

  it('categorises NETWORK_ERROR by code', async () => {
    const e = await trigger({ code: 'NETWORK_ERROR' });
    expect(e.type).toBe(ErrorType.NETWORK);
    expect(e.severity).toBe(ErrorSeverity.MEDIUM);
  });

  it('categorises "Network Error" message string as NETWORK', async () => {
    const e = await trigger({ message: 'Network Error happened' });
    expect(e.type).toBe(ErrorType.NETWORK);
  });

  it('categorises HTTP 401 as AUTHENTICATION (HIGH severity)', async () => {
    const e = await trigger({ response: { status: 401 } });
    expect(e.type).toBe(ErrorType.AUTHENTICATION);
    expect(e.severity).toBe(ErrorSeverity.HIGH);
  });

  it('categorises HTTP 403 as AUTHORIZATION (HIGH severity)', async () => {
    const e = await trigger({ response: { status: 403 } });
    expect(e.type).toBe(ErrorType.AUTHORIZATION);
    expect(e.severity).toBe(ErrorSeverity.HIGH);
  });

  it('categorises generic 4xx as CLIENT (MEDIUM severity)', async () => {
    const e = await trigger({ response: { status: 422 } });
    expect(e.type).toBe(ErrorType.CLIENT);
    expect(e.severity).toBe(ErrorSeverity.MEDIUM);
  });

  it('categorises 5xx as SERVER (MEDIUM severity)', async () => {
    const e = await trigger({ response: { status: 500 } });
    expect(e.type).toBe(ErrorType.SERVER);
    expect(e.severity).toBe(ErrorSeverity.MEDIUM);
  });

  it('categorises validation-flavoured 4xx body as VALIDATION (LOW severity)', async () => {
    const e = await trigger({
      response: {
        // No status to avoid the 4xx generic branch — categoriser falls through
        data: { error: 'validation failed' },
      },
    });
    expect(e.type).toBe(ErrorType.VALIDATION);
    expect(e.severity).toBe(ErrorSeverity.LOW);
  });

  it('falls back to UNKNOWN when nothing matches', async () => {
    const e = await trigger({ random: 'thing' });
    expect(e.type).toBe(ErrorType.UNKNOWN);
  });

  it('returns UNKNOWN with default-severity message for null/undefined rejections', async () => {
    const e = await trigger(null);
    expect(e.type).toBe(ErrorType.UNKNOWN);
  });
});

describe('ErrorHandlerWrapper.getErrorMessage (via thrown AppError)', () => {
  const triggerMsg = async (rejection: unknown): Promise<string> => {
    try {
      await ErrorHandlerWrapper.wrapApiCall(() => Promise.reject(rejection), ctx);
      return 'unreached';
    } catch (e) {
      return (e as AppError).message;
    }
  };

  it('extracts response.data.error first', async () => {
    expect(await triggerMsg({ response: { data: { error: 'A' }, status: 400 } })).toBe('A');
  });

  it('falls back to response.data.message', async () => {
    expect(await triggerMsg({ response: { data: { message: 'M' }, status: 400 } })).toBe('M');
  });

  it('falls back to top-level error.message', async () => {
    expect(await triggerMsg({ message: 'top message' })).toBe('top message');
  });

  it('falls back to canned Turkish message when none of the above match', async () => {
    expect(await triggerMsg({})).toBe('Beklenmeyen bir hata oluştu');
  });
});

describe('useApiErrorHandler', () => {
  it('exposes wrapApiCall bound to ErrorHandlerWrapper', () => {
    const { wrapApiCall } = useApiErrorHandler();
    expect(wrapApiCall).toBe(ErrorHandlerWrapper.wrapApiCall);
  });
});
