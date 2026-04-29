import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  safeStringify,
  safeConsoleError,
  safeConsoleWarn,
  safeConsoleLog,
  ultraSafeErrorLog,
} from '../safeLogger';

describe('safeStringify', () => {
  it('returns "null" / "undefined" string sentinels for null and undefined', () => {
    expect(safeStringify(null)).toBe('null');
    expect(safeStringify(undefined)).toBe('undefined');
  });

  it('returns strings unchanged', () => {
    expect(safeStringify('hello')).toBe('hello');
    expect(safeStringify('')).toBe('');
  });

  it('coerces numbers and booleans to their string form', () => {
    expect(safeStringify(0)).toBe('0');
    expect(safeStringify(-1.5)).toBe('-1.5');
    expect(safeStringify(true)).toBe('true');
    expect(safeStringify(false)).toBe('false');
  });

  it('returns the message of an Error instance', () => {
    expect(safeStringify(new Error('boom'))).toBe('boom');
  });

  it('falls back to a placeholder for an Error without a message', () => {
    const e = new Error();
    e.message = '';
    expect(safeStringify(e)).toBe('Error object without message');
  });

  it('JSON.stringifies plain objects with 2-space indent', () => {
    expect(safeStringify({ a: 1, b: 'x' })).toBe('{\n  "a": 1,\n  "b": "x"\n}');
  });

  it('falls back to "[Object]" when JSON.stringify throws (cycle)', () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(safeStringify(cycle)).toBe('[Object]');
  });

  it('coerces other primitive types via String()', () => {
    expect(safeStringify(BigInt(42))).toBe('42');
  });
});

describe('safeConsoleLog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('logs a bare message without a data arg', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    safeConsoleLog('hello');
    expect(log).toHaveBeenCalledWith('hello');
  });

  it('logs the message + safeStringify-d data when data is provided', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    safeConsoleLog('msg', { a: 1 });
    expect(log).toHaveBeenCalledWith('msg', '{\n  "a": 1\n}');
  });

  it('handles string data without re-quoting', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    safeConsoleLog('msg', 'simple');
    expect(log).toHaveBeenCalledWith('msg', 'simple');
  });
});

describe('safeConsoleError + safeConsoleWarn (DEV-gated)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Vitest's import.meta.env.DEV is true by default in test runs. The
  // helpers are no-ops in production (DEV=false), but here they should
  // forward to the underlying console method.

  it('safeConsoleError forwards a bare message', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    safeConsoleError('boom');
    expect(err).toHaveBeenCalledWith('boom');
  });

  it('safeConsoleError forwards message + safeStringify-d error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    safeConsoleError('boom', new Error('details'));
    expect(err).toHaveBeenCalledWith('boom', 'details');
  });

  it('safeConsoleWarn forwards a bare message', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    safeConsoleWarn('careful');
    expect(warn).toHaveBeenCalledWith('careful');
  });

  it('safeConsoleWarn forwards message + safeStringify-d data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    safeConsoleWarn('careful', { reason: 'x' });
    expect(warn).toHaveBeenCalledWith('careful', '{\n  "reason": "x"\n}');
  });
});

describe('ultraSafeErrorLog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('logs only the message when error is undefined', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    ultraSafeErrorLog('boom');
    expect(err).toHaveBeenCalledWith('boom');
  });

  it('logs the literal "null" string when error is null', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    ultraSafeErrorLog('boom', null);
    expect(err).toHaveBeenCalledWith('boom', 'null');
  });

  it('logs the string error verbatim', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    ultraSafeErrorLog('boom', 'failure');
    expect(err).toHaveBeenCalledWith('boom', 'failure');
  });

  it('coerces numeric and boolean errors via String()', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    ultraSafeErrorLog('a', 42);
    ultraSafeErrorLog('b', true);
    expect(err).toHaveBeenNthCalledWith(1, 'a', '42');
    expect(err).toHaveBeenNthCalledWith(2, 'b', 'true');
  });

  it('logs an Error instance using its message', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    ultraSafeErrorLog('boom', new Error('details'));
    expect(err).toHaveBeenCalledWith('boom', 'details');
  });

  it('falls back to the bare message for non-string / non-Error objects', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    ultraSafeErrorLog('boom', { weird: true });
    expect(err).toHaveBeenCalledWith('boom');
  });

  it('never throws, even when console.error is broken', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      throw new Error('console.error is broken');
    });
    expect(() => ultraSafeErrorLog('boom', new Error('details'))).not.toThrow();
  });
});
