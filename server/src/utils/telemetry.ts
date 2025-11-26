/**
 * OpenTelemetry Configuration
 * Distributed tracing and metrics collection
 */

// Optional OpenTelemetry imports are done dynamically to allow running without installing the SDK in
// development environments. If OpenTelemetry packages are missing, telemetry will be skipped.
import logger from './logger';

// Initialize OpenTelemetry SDK
let sdk: any = null;

export function initializeTelemetry() {
  if (sdk) {
    logger.warn('Telemetry already initialized');
    return;
  }

  // Only initialize in production or when explicitly enabled
  const enableTelemetry = process.env.ENABLE_TELEMETRY === 'true' || process.env.NODE_ENV === 'production';
  
  if (!enableTelemetry) {
    logger.info('Telemetry disabled. Set ENABLE_TELEMETRY=true to enable.');
    return;
  }

  try {
    // Dynamically require OpenTelemetry packages so missing deps don't crash the app
    // (they are optional for local development)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Resource } = require('@opentelemetry/resources');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PeriodicExportingMetricReader, ConsoleMetricExporter } = require('@opentelemetry/sdk-metrics');
    const serviceName = process.env.SERVICE_NAME || 'tofas-fen-backend';
    const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';

    // Create resource
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    });

    // Prometheus metrics exporter
    const prometheusExporter = new PrometheusExporter({
      port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
      endpoint: '/metrics',
    }, () => {
      logger.info(`Prometheus metrics server started on port ${process.env.PROMETHEUS_PORT || '9464'}`);
    });

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
      sdk.shutdown()
        .then(() => {
          logger.info('Telemetry SDK shut down');
          resolve();
        })
  .catch((error: any) => {
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

