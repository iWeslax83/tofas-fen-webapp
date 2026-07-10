import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';

// Records the real-time order of the two operations we care about, so the
// assertion is "flushed BEFORE exiting", not merely "both happened".
const order: string[] = [];

vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(async () => {
    // Yield once, the way a real network flush would, so a caller that
    // forgets to await us loses the race against process.exit.
    await new Promise((resolve) => setImmediate(resolve));
    order.push('flush');
    return true;
  }),
}));

// db.ts's fatal handlers close mongo then exit. Load it with a DSN present so
// the Sentry path is live, and grab the listener it registers.
async function loadDbHandler(event: 'uncaughtException' | 'unhandledRejection') {
  vi.resetModules();
  process.env.SENTRY_DSN = 'https://public@example.ingest.sentry.io/1';
  const before = process.listeners(event).length;
  await import('../../db');
  const listeners = process.listeners(event);
  expect(listeners.length).toBeGreaterThan(before);
  return listeners[listeners.length - 1] as (arg: unknown) => Promise<void>;
}

describe('fatal error handlers flush Sentry before exiting', () => {
  const originalDsn = process.env.SENTRY_DSN;
  const originalEnv = process.env.NODE_ENV;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let closeSpy: ReturnType<typeof vi.spyOn>;
  let registered: Array<(arg: unknown) => Promise<void>> = [];

  beforeEach(() => {
    order.length = 0;
    vi.clearAllMocks();
    // A fatal handler must not actually tear down the test process or the
    // shared mongoose connection the rest of the suite uses.
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((): never => {
      order.push('exit');
      return undefined as never;
    }) as never);
    closeSpy = vi.spyOn(mongoose.connection, 'close').mockResolvedValue(undefined);
    // db.ts only exits outside the test env.
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    exitSpy.mockRestore();
    closeSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
    if (originalDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = originalDsn;
    // Drop the handlers this test's import registered.
    for (const fn of registered) {
      process.off('uncaughtException', fn as never);
      process.off('unhandledRejection', fn as never);
    }
    registered = [];
  });

  it('flushes before process.exit on a fatal uncaughtException', async () => {
    const handler = await loadDbHandler('uncaughtException');
    registered.push(handler);

    await handler(new Error('fatal boom'));

    expect(order).toEqual(['flush', 'exit']);
  });

  it('flushes before process.exit on a fatal unhandledRejection', async () => {
    const handler = await loadDbHandler('unhandledRejection');
    registered.push(handler);

    await handler(new Error('rejected boom'));

    expect(order).toEqual(['flush', 'exit']);
  });

  it('stays up without flushing on a transient network error', async () => {
    const handler = await loadDbHandler('unhandledRejection');
    registered.push(handler);

    const transient = Object.assign(new Error('socket hang up'), {
      name: 'MongoNetworkError',
    });
    await handler(transient);

    // Process survives, so Sentry's own background transport delivers it.
    expect(order).toEqual([]);
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
