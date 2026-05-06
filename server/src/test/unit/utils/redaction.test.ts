import { describe, it, expect } from 'vitest';
import { redactSensitive } from '../../../utils/redaction';

describe('redactSensitive', () => {
  it('redacts password keys at any depth', () => {
    const input = { id: 'u1', password: 'hunter2', nested: { sifre: 'şifre1' } };
    const out = redactSensitive(input);
    expect(out).toEqual({ id: 'u1', password: '[REDACTED]', nested: { sifre: '[REDACTED]' } });
  });

  it('matches mixed case and common variants', () => {
    const input = {
      Authorization: 'Bearer x',
      apiKey: 'k',
      api_key: 'k',
      secret: 's',
      Cookie: 'c',
      Token: 't',
      pw: 'p',
      plaintext: 'pt',
    };
    const out = redactSensitive(input);
    Object.values(out).forEach((v) => expect(v).toBe('[REDACTED]'));
  });

  it('leaves non-sensitive keys alone', () => {
    expect(redactSensitive({ id: 'u1', adSoyad: 'Ada' })).toEqual({ id: 'u1', adSoyad: 'Ada' });
  });

  it('handles arrays of objects', () => {
    expect(redactSensitive([{ password: 'a' }, { password: 'b' }])).toEqual([
      { password: '[REDACTED]' },
      { password: '[REDACTED]' },
    ]);
  });

  it('does not mutate the input', () => {
    const input = { password: 'hunter2' };
    redactSensitive(input);
    expect(input.password).toBe('hunter2');
  });

  it('handles null/undefined/primitives', () => {
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive(undefined)).toBeUndefined();
    expect(redactSensitive('hi')).toBe('hi');
    expect(redactSensitive(42)).toBe(42);
    expect(redactSensitive(true)).toBe(true);
  });

  it('handles circular references safely', () => {
    const input: any = { a: 1 };
    input.self = input;
    const out = redactSensitive(input);
    expect(out.a).toBe(1);
    expect(out.self).toBe('[CIRCULAR]');
  });

  it('caps depth to bound cost', () => {
    let deep: any = { password: 'p' };
    for (let i = 0; i < 20; i++) deep = { nested: deep };
    const out = redactSensitive(deep);
    // Anything below depth 8 becomes '[DEPTH_LIMIT]'.
    let cur: any = out;
    for (let i = 0; i < 8; i++) cur = cur?.nested;
    expect(cur).toBe('[DEPTH_LIMIT]');
  });

  it('does not redact substring false positives', () => {
    // tokenVersion is a counter on User; cpwd / secretSanta are not credentials.
    // The old unanchored regex matched all of these and broke debug logging.
    const out = redactSensitive({
      tokenVersion: 7,
      tokenId: 'abc',
      cpwd: 'not-a-password',
    });
    expect(out).toEqual({ tokenVersion: 7, tokenId: 'abc', cpwd: 'not-a-password' });
  });

  it('redacts camelCase token variants', () => {
    const out = redactSensitive({
      accessToken: 'a',
      refreshToken: 'b',
      passwordHash: 'c',
      'api-key': 'd',
    });
    expect(out).toEqual({
      accessToken: '[REDACTED]',
      refreshToken: '[REDACTED]',
      passwordHash: '[REDACTED]',
      'api-key': '[REDACTED]',
    });
  });
});
