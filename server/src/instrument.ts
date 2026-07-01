import * as Sentry from '@sentry/node';

// Server-side Sentry error tracking. Imported first in index.ts (right after
// ./config/environment, so SENTRY_DSN is loaded) and before any other module.
//
// Error-only configuration: `tracesSampleRate: 0` + `skipOpenTelemetrySetup:
// true` keep Sentry from taking over OpenTelemetry. This app runs its own
// OpenTelemetry NodeSDK (see ./utils/telemetry.ts); letting Sentry also set up
// OTel would register a conflicting global tracer provider. If distributed
// tracing is wanted later, wire @sentry/opentelemetry's SentrySpanProcessor /
// SentrySampler / SentryPropagator / SentryContextManager into that NodeSDK
// instead of removing these flags.
//
// No DSN → Sentry.init is skipped and every Sentry call is a safe no-op, so
// local/dev (where SENTRY_DSN is unset) behaves exactly as before.
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
