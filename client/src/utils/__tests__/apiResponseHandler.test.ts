import { describe, it, expect } from 'vitest';
import {
  ApiResponseHandler,
  extractData,
  extractDataArray,
  extractDataItem,
  extractError,
  handleResponse,
  handleResponseArray,
  isSuccess,
} from '../apiResponseHandler';

describe('ApiResponseHandler.extractData', () => {
  it('unwraps the nested data envelope (response.data.data)', () => {
    const r = { data: { success: true, data: { id: 1 } } };
    expect(ApiResponseHandler.extractData(r as never)).toEqual({ id: 1 });
  });

  it('returns response.data when there is no nested data field', () => {
    const r = { data: { id: 1 } };
    expect(ApiResponseHandler.extractData(r as never)).toEqual({ id: 1 });
  });

  it('returns the raw value when response.data is a primitive', () => {
    expect(ApiResponseHandler.extractData({ data: 'hello' } as never)).toBe('hello');
  });
});

describe('extractDataSafe', () => {
  it('returns the fallback for null / undefined input', () => {
    expect(extractData(null, 'fb')).toBe('fb');
    expect(extractData(undefined, 'fb')).toBe('fb');
  });

  it('returns the fallback for primitive input that has no .data', () => {
    expect(extractData('plain string', 'fb')).toBe('fb');
  });

  it('extracts from a nested axios-shaped response', () => {
    const r = { data: { success: true, data: { x: 1 } } };
    expect(extractData(r, { x: 0 })).toEqual({ x: 1 });
  });

  it('returns response.data for shapes with only one level of data', () => {
    const r = { data: { x: 5 } };
    expect(extractData(r, { x: 0 })).toEqual({ x: 5 });
  });
});

describe('extractDataArray', () => {
  it('returns the array data when present', () => {
    expect(extractDataArray({ data: [1, 2, 3] }, [])).toEqual([1, 2, 3]);
  });

  it('falls back to the supplied default when data is not an array', () => {
    expect(extractDataArray({ data: 'not array' }, [9])).toEqual([9]);
  });

  it('falls back to [] by default when input is unusable', () => {
    expect(extractDataArray(null)).toEqual([]);
    expect(extractDataArray(undefined)).toEqual([]);
  });
});

describe('extractDataItem', () => {
  it('returns the item when present', () => {
    expect(extractDataItem({ data: { id: 7 } }, { id: 0 })).toEqual({ id: 7 });
  });

  it('falls back when data is missing', () => {
    expect(extractDataItem(null, { id: 0 })).toEqual({ id: 0 });
  });

  it('falls back when data is a falsy value (0)', () => {
    expect(extractDataItem({ data: 0 }, 99)).toBe(99);
  });
});

describe('isSuccess', () => {
  it('returns false for null / undefined', () => {
    expect(isSuccess(null)).toBe(false);
    expect(isSuccess(undefined)).toBe(false);
  });

  it('returns false when HTTP status is outside 2xx', () => {
    expect(isSuccess({ status: 400, data: { success: true } })).toBe(false);
    expect(isSuccess({ status: 500, data: { success: true } })).toBe(false);
    expect(isSuccess({ status: 301 })).toBe(false);
  });

  it('returns the data.success flag when present', () => {
    expect(isSuccess({ status: 200, data: { success: true } })).toBe(true);
    expect(isSuccess({ status: 200, data: { success: false } })).toBe(false);
  });

  it('treats 2xx with no success flag as success', () => {
    expect(isSuccess({ status: 204 })).toBe(true);
    expect(isSuccess({ status: 200, data: { id: 1 } })).toBe(true);
  });
});

describe('extractError', () => {
  it('returns the canned message for null / empty input', () => {
    expect(extractError(null)).toBe('Bilinmeyen hata');
    expect(extractError(undefined)).toBe('Bilinmeyen hata');
  });

  it('extracts a string body sitting at err.response.data', () => {
    expect(extractError({ response: { data: 'plain text error' } })).toBe('plain text error');
  });

  it('prefers the nested error.message when both data.error and data.message exist', () => {
    expect(
      extractError({
        response: {
          data: {
            error: { message: 'nested message' },
            message: 'root message',
          },
        },
      }),
    ).toBe('nested message');
  });

  it('falls back to data.message when error is absent', () => {
    expect(
      extractError({
        response: { data: { message: 'root message' } },
      }),
    ).toBe('root message');
  });

  it('joins data.errors[] when the entries are strings', () => {
    expect(
      extractError({
        response: { data: { errors: ['too short', 'no @'] } },
      }),
    ).toBe('too short, no @');
  });

  it('joins data.errors[] when the entries have .message', () => {
    expect(
      extractError({
        response: {
          data: {
            errors: [{ message: 'A' }, { message: 'B' }],
          },
        },
      }),
    ).toBe('A, B');
  });

  it('reads the top-level error / message string when there is no axios envelope', () => {
    expect(extractError({ error: 'top error' })).toBe('top error');
    expect(extractError({ message: 'top message' })).toBe('top message');
  });

  it('reads top-level error.message when error is an object', () => {
    expect(extractError({ error: { message: 'wrapped' } })).toBe('wrapped');
  });

  it('maps known HTTP status codes to Turkish copy', () => {
    expect(extractError({ status: 400 })).toBe('Geçersiz istek');
    expect(extractError({ status: 401 })).toBe('Yetkisiz erişim');
    expect(extractError({ status: 403 })).toBe('Erişim reddedildi');
    expect(extractError({ status: 404 })).toBe('Kaynak bulunamadı');
    expect(extractError({ status: 500 })).toBe('Sunucu hatası');
    expect(extractError({ status: 418 })).toBe('HTTP 418 hatası');
  });

  it('falls back to "Bilinmeyen hata" when nothing matches', () => {
    expect(extractError({ random: 'thing' })).toBe('Bilinmeyen hata');
  });
});

describe('createError', () => {
  it('builds the standardized object with defaults', () => {
    const e = ApiResponseHandler.createError('boom');
    expect(e).toEqual({ message: 'boom', code: 'UNKNOWN_ERROR', status: 500 });
  });

  it('honours the supplied code + status', () => {
    const e = ApiResponseHandler.createError('boom', 'BAD', 422);
    expect(e).toEqual({ message: 'boom', code: 'BAD', status: 422 });
  });
});

describe('handleResponse', () => {
  it('resolves to { data, error: null } on success', async () => {
    const apiCall = Promise.resolve({ data: { x: 1 } } as never);
    const result = await handleResponse(apiCall, { x: 0 });
    expect(result).toEqual({ data: { x: 1 }, error: null });
  });

  it('resolves to { data: fallback, error: <message> } on rejection', async () => {
    const apiCall = Promise.reject({ response: { data: 'boom' } });
    const result = await handleResponse(apiCall, { x: 0 });
    expect(result).toEqual({ data: { x: 0 }, error: 'boom' });
  });
});

describe('handleResponseArray', () => {
  it('returns the array on success', async () => {
    const apiCall = Promise.resolve({ data: [1, 2] } as never);
    const result = await handleResponseArray<number>(apiCall, []);
    expect(result).toEqual({ data: [1, 2], error: null });
  });

  it('falls back to [] on error', async () => {
    const apiCall = Promise.reject({ status: 500 });
    const result = await handleResponseArray<number>(apiCall, []);
    expect(result).toEqual({ data: [], error: 'Sunucu hatası' });
  });
});
