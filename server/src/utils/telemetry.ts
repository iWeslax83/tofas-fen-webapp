/**
 * OpenTelemetry Configuration
 * Distributed tracing and metrics collection
 */

// Optional OpenTelemetry imports are done dynamically to allow running without installing the SDK in
// development environments. If OpenTelemetry packages are missing, telemetry will be skipped.
import logger from './logger';

// Minimal interface for the dynamically-loaded NodeSDK instance
interface TelemetrySdk {
  start(): void;
  shutdown(): Promise<void>;
}

// Initialize OpenTelemetry SDK
let sdk: TelemetrySdk | null = null;

export function initializeTelemetry() {
  if (sdk) {
    logger.warn('Telemetry already initialized');
    return;
  }

  // Only initialize in production or when explicitly enabled
  const enableTelemetry =
    process.env.ENABLE_TELEMETRY === 'true' || process.env.NODE_ENV === 'production';

  if (!enableTelemetry) {
    logger.info('Telemetry disabled. Set ENABLE_TELEMETRY=true to enable.');
    return;
  }

  try {
    // Dynamically require OpenTelemetry packages so missing deps don't crash the app
    // (they are optional for local development)
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
    const { Resource } = require('@opentelemetry/resources');
    const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
    const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    const {
      PeriodicExportingMetricReader,
      ConsoleMetricExporter,
    } = require('@opentelemetry/sdk-metrics');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const serviceName = process.env.SERVICE_NAME || 'tofas-fen-backend';
    const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';

    // Create resource
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    });

    // Prometheus metrics exporter
    const prometheusExporter = new PrometheusExporter(
      {
        port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
        endpoint: '/metrics',
      },
      () => {
        logger.info(
          `Prometheus metrics server started on port ${process.env.PROMETHEUS_PORT || '9464'}`,
        );
      },
    );

    // Trace exporter (OTLP or Jaeger)
    const traceExporter = process.env.JAEGER_ENDPOINT
      ? new OTLPTraceExporter({
          url: process.env.JAEGER_ENDPOINT,
        })
      : new ConsoleMetricExporter(); // Fallback to console

    // Create SDK
    sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader: new PeriodicExportingMetricReader({
        exporter: prometheusExporter,
        exportIntervalMillis: 10000, // Export every 10 seconds
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable fs instrumentation to reduce noise
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
        }),
      ],
    });

    // Start SDK
    sdk.start();
    logger.info('OpenTelemetry SDK initialized', {
      serviceName,
      serviceVersion,
      prometheusPort: process.env.PROMETHEUS_PORT || '9464',
    });
  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry:', error);
  }
}

export function shutdownTelemetry(): Promise<void> {
  return new Promise((resolve) => {
    if (sdk) {
      sdk
        .shutdown()
        .then(() => {
          logger.info('Telemetry SDK shut down');
          resolve();
        })
        .catch((error: unknown) => {
          logger.error('Error shutting down telemetry SDK:', error);
          resolve();
        });
    } else {
      resolve();
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  shutdownTelemetry().then(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  shutdownTelemetry().then(() => {
    process.exit(0);
  });
});
