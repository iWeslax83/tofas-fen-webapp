import { describe, it, expect } from 'vitest';
import { AppError, ErrorType, ErrorSeverity } from '../AppError';

describe('AppError', () => {
  it('is an Error subclass with the right name', () => {
    const e = new AppError('boom');
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(AppError);
    expect(e.name).toBe('AppError');
    expect(e.message).toBe('boom');
  });

  it('defaults type=UNKNOWN, severity=MEDIUM', () => {
    const e = new AppError('boom');
    expect(e.type).toBe(ErrorType.UNKNOWN);
    expect(e.severity).toBe(ErrorSeverity.MEDIUM);
  });

  it('attaches the originalError', () => {
    const cause = new Error('root');
    const e = new AppError('wrapped', ErrorType.NETWORK, ErrorSeverity.LOW, {}, cause);
    expect(e.originalError).toBe(cause);
  });

  it('records a numeric timestamp in context and an ISO timestamp on the instance', () => {
    const before = Date.now();
    const e = new AppError('x');
    const after = Date.now();
    expect(typeof e.context.timestamp).toBe('number');
    expect((e.context.timestamp as unknown as number) >= before).toBe(true);
    expect((e.context.timestamp as unknown as number) <= after).toBe(true);
    // ISO timestamp parses cleanly
    expect(Number.isNaN(Date.parse(e.timestamp))).toBe(false);
  });

  describe('factory helpers', () => {
    it('network() builds a NETWORK error with default Turkish copy', () => {
      const e = AppError.network();
      expect(e.type).toBe(ErrorType.NETWORK);
      expect(e.severity).toBe(ErrorSeverity.MEDIUM);
      expect(e.message).toBe('Ağ bağlantısı hatası');
    });

    it('validation() lifts message verbatim and uses LOW severity', () => {
      const e = AppError.validation('İsim boş olamaz');
      expect(e.type).toBe(ErrorType.VALIDATION);
      expect(e.severity).toBe(ErrorSeverity.LOW);
      expect(e.message).toBe('İsim boş olamaz');
    });

    it('unauthorized() / forbidden() are HIGH severity', () => {
      expect(AppError.unauthorized().severity).toBe(ErrorSeverity.HIGH);
      expect(AppError.forbidden().severity).toBe(ErrorSeverity.HIGH);
    });

    it('rateLimit() / timeout() are MEDIUM severity', () => {
      expect(AppError.rateLimit().severity).toBe(ErrorSeverity.MEDIUM);
      expect(AppError.timeout().severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('server() / storage() are HIGH severity', () => {
      expect(AppError.server().severity).toBe(ErrorSeverity.HIGH);
      expect(AppError.storage().severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('getUserMessage', () => {
    it('returns the canned NETWORK message regardless of the raw message', () => {
      const e = new AppError('connection refused', ErrorType.NETWORK);
      expect(e.getUserMessage()).toBe(
        'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.',
      );
    });

    it('passes through the raw message for VALIDATION', () => {
      const e = AppError.validation('e-posta zorunludur');
      expect(e.getUserMessage()).toBe('e-posta zorunludur');
    });

    it('returns the canned auth message for AUTHENTICATION', () => {
      const e = new AppError('jwt expired', ErrorType.AUTHENTICATION);
      expect(e.getUserMessage()).toBe('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
    });

    it('returns the canned message for AUTHORIZATION / NOT_FOUND / TIMEOUT / RATE_LIMIT / SERVER', () => {
      expect(new AppError('', ErrorType.AUTHORIZATION).getUserMessage()).toBe(
        'Bu işlemi yapmaya yetkiniz yok.',
      );
      expect(new AppError('', ErrorType.NOT_FOUND).getUserMessage()).toBe(
        'Aradığınız kaynak bulunamadı.',
      );
      expect(new AppError('', ErrorType.TIMEOUT).getUserMessage()).toBe(
        'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',
      );
      expect(new AppError('', ErrorType.RATE_LIMIT).getUserMessage()).toBe(
        'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.',
      );
      expect(new AppError('', ErrorType.SERVER).getUserMessage()).toBe(
        'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
      );
    });

    it('falls back to the raw message for UNKNOWN', () => {
      const e = new AppError('something weird', ErrorType.UNKNOWN);
      expect(e.getUserMessage()).toBe('something weird');
    });

    it('falls back to the canned UNKNOWN copy when no message is set', () => {
      const e = new AppError('', ErrorType.UNKNOWN);
      expect(e.getUserMessage()).toBe('Beklenmeyen bir hata oluştu.');
    });
  });

  describe('toJSON', () => {
    it('serialises name / message / type / severity / timestamp / context', () => {
      const e = new AppError('boom', ErrorType.SERVER, ErrorSeverity.HIGH, { url: '/x' });
      const json = e.toJSON();
      expect(json.name).toBe('AppError');
      expect(json.message).toBe('boom');
      expect(json.type).toBe(ErrorType.SERVER);
      expect(json.severity).toBe(ErrorSeverity.HIGH);
      expect(typeof json.timestamp).toBe('string');
      expect(json.context).toMatchObject({ url: '/x' });
    });
  });
});
