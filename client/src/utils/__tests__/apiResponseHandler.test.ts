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
  // Ham sunucu metni artık olduğu gibi geçmiyor: errorMessages süzüyor.
  // Kullanıcıya bir şey anlatmayan İngilizce/teknik metinler Türkçe
  // karşılıklarıyla değişiyor, düzgün Türkçe cümleler korunuyor.
  it('returns a Turkish sentence for null / empty input', () => {
    for (const girdi of [null, undefined]) {
      const mesaj = extractError(girdi);
      expect(mesaj.length).toBeGreaterThan(10);
      expect(mesaj).toMatch(/[çğıöşü]/i);
    }
  });

  it('keeps a Turkish string body sitting at err.response.data', () => {
    expect(extractError({ response: { data: 'Dosya çok büyük görünüyor.' } })).toBe(
      'Dosya çok büyük görünüyor.',
    );
  });

  it('prefers the nested error.message when both data.error and data.message exist', () => {
    expect(
      extractError({
        response: {
          data: {
            error: { message: 'İç mesaj burada duruyor.' },
            message: 'Kök mesaj burada duruyor.',
          },
        },
      }),
    ).toBe('İç mesaj burada duruyor.');
  });

  it('falls back to data.message when error is absent', () => {
    expect(
      extractError({
        response: { data: { message: 'Kök mesaj burada duruyor.' } },
      }),
    ).toBe('Kök mesaj burada duruyor.');
  });

  it('joins data.errors[] when the entries are strings', () => {
    expect(
      extractError({
        response: { data: { errors: ['Şifre çok kısa', 'E-posta geçersiz'] } },
      }),
    ).toBe('Şifre çok kısa, E-posta geçersiz');
  });

  it('joins data.errors[] when the entries have .message', () => {
    expect(
      extractError({
        response: {
          data: {
            errors: [{ message: 'A alanı zorunlu' }, { message: 'B alanı zorunlu' }],
          },
        },
      }),
    ).toBe('A alanı zorunlu, B alanı zorunlu');
  });

  it('reads the top-level error / message string when there is no axios envelope', () => {
    expect(extractError({ error: 'Üst düzey hata mesajı.' })).toBe('Üst düzey hata mesajı.');
    expect(extractError({ message: 'Üst düzey bilgi mesajı.' })).toBe('Üst düzey bilgi mesajı.');
  });

  it('reads top-level error.message when error is an object', () => {
    expect(extractError({ error: { message: 'Sarmalanmış Türkçe mesaj.' } })).toBe(
      'Sarmalanmış Türkçe mesaj.',
    );
  });

  it('replaces English technical strings instead of showing them', () => {
    for (const ham of ['Internal server error', 'User not found', 'Validation failed']) {
      const mesaj = extractError({ response: { status: 500, data: { error: ham } } });
      expect(mesaj).not.toBe(ham);
      expect(mesaj).toMatch(/[çğıöşü]/i);
    }
  });

  it('maps known HTTP status codes to Turkish copy', () => {
    expect(extractError({ status: 400 })).toMatch(/bilgi|kontrol/i);
    expect(extractError({ status: 401 })).toMatch(/giriş/i);
    expect(extractError({ status: 403 })).toMatch(/yetki/i);
    expect(extractError({ status: 404 })).toMatch(/bulunamadı/i);
    expect(extractError({ status: 500 })).toMatch(/sunucu/i);
  });

  it('falls back to a Turkish sentence when nothing matches', () => {
    const mesaj = extractError({});
    expect(mesaj.length).toBeGreaterThan(10);
    expect(mesaj).toMatch(/[çğıöşü]/i);
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
    const apiCall = Promise.reject({ response: { data: 'Kayıt bulunamadı gibi görünüyor.' } });
    const result = await handleResponse(apiCall, { x: 0 });
    expect(result).toEqual({ data: { x: 0 }, error: 'Kayıt bulunamadı gibi görünüyor.' });
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
    expect(result.data).toEqual([]);
    expect(result.error).toMatch(/sunucu/i);
  });
});
