import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@sentry/node', () => ({ init: vi.fn() }));

// instrument.ts reads process.env.SENTRY_DSN at module load, so each case
// needs a fresh module registry rather than a re-import of a cached module.
async function loadInstrument() {
  vi.resetModules();
  const Sentry = await import('@sentry/node');
  const mod = await import('../../instrument');
  return { init: vi.mocked(Sentry.init), isSentryEnabled: mod.isSentryEnabled };
}

describe('instrument', () => {
  const originalDsn = process.env.SENTRY_DSN;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = originalDsn;
  });

  it('does not initialize Sentry when SENTRY_DSN is unset', async () => {
    delete process.env.SENTRY_DSN;

    const { init, isSentryEnabled } = await loadInstrument();

    expect(init).not.toHaveBeenCalled();
    expect(isSentryEnabled).toBe(false);
  });

  it('initializes Sentry without taking over OpenTelemetry when SENTRY_DSN is set', async () => {
    process.env.SENTRY_DSN = 'https://public@example.ingest.sentry.io/1';

    const { init, isSentryEnabled } = await loadInstrument();

    expect(isSentryEnabled).toBe(true);
    expect(init).toHaveBeenCalledOnce();
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://public@example.ingest.sentry.io/1',
        // The app runs its own OpenTelemetry NodeSDK; these two keep Sentry
        // from registering a conflicting global tracer provider.
        tracesSampleRate: 0,
        skipOpenTelemetrySetup: true,
      }),
    );
  });
});
