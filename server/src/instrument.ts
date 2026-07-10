import * as Sentry from '@sentry/node';

// Must be imported after ./config/environment (so SENTRY_DSN is loaded) and
// before any module that might throw.
//
// `tracesSampleRate: 0` + `skipOpenTelemetrySetup: true` keep Sentry from
// taking over OpenTelemetry: this app runs its own NodeSDK (see
// ./utils/telemetry.ts) and letting Sentry set up OTel too would register a
// conflicting global tracer provider. To add distributed tracing later, wire
// @sentry/opentelemetry's SentrySpanProcessor / SentrySampler /
// SentryPropagator / SentryContextManager into that NodeSDK rather than
// dropping these flags.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0,
    skipOpenTelemetrySetup: true,
  });
}

export const isSentryEnabled = Boolean(dsn);

// Sentry's transport is async, so a captured event is lost if the process
// exits before it ships. Any code path that calls process.exit after
// capturing a fatal error must await this first. A flush failure must never
// block the exit, so timeouts and transport errors are swallowed.
export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (!isSentryEnabled) return;
  try {
    await Sentry.flush(timeoutMs);
  } catch {
    // Nothing useful left to do — we are already on the way down.
  }
}
