/**
 * Prometheus Metrics
 * Custom application metrics
 */

import logger from './logger';

// Try to load prom-client dynamically so missing dependency doesn't crash local dev
let Counter: any;
let Histogram: any;
let Gauge: any;
let RegistryClass: any;
let register: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const prom = require('prom-client');
  Counter = prom.Counter;
  Histogram = prom.Histogram;
  Gauge = prom.Gauge;
  RegistryClass = prom.Registry;
  register = new RegistryClass();
} catch (err) {
  logger.warn('prom-client not found; metrics disabled for local development');

  // No-op implementations
  register = {
    registerMetric: () => { },
    getMetricsAsJSON: async () => [],
  };

  const noopMetric = () => ({
    inc: () => { },
    observe: () => { },
    set: () => { },
    labels: () => ({ inc: () => { }, set: () => { }, observe: () => { } }),
    startTimer: () => () => { },
  });

  Counter = function () { return noopMetric(); };
  Histogram = function () { return noopMetric(); };
  Gauge = function () { return noopMetric(); };
  RegistryClass = function () { return register; };
}

// HTTP Metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestErrors = new Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type'],
  registers: [register],
});

// Database Metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const dbQueryTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'collection', 'status'],
  registers: [register],
});

// WebSocket Metrics
export const wsConnections = new Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

export const wsMessagesTotal = new Counter({
  name: 'websocket_messages_total',
  help: 'Total number of WebSocket messages',
  labelNames: ['type', 'direction'],
  registers: [register],
});

// Event Metrics
export const eventsPublished = new Counter({
  name: 'events_published_total',
  help: 'Total number of events published',
  labelNames: ['event_type'],
  registers: [register],
});

export const eventsProcessed = new Counter({
  name: 'events_processed_total',
  help: 'Total number of events processed',
  labelNames: ['event_type', 'status'],
  registers: [register],
});

// Cache Metrics
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register],
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

// Authentication Metrics
export const authAttempts = new Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['status'],
  registers: [register],
});

export const activeUsers = new Gauge({
  name: 'active_users_total',
  help: 'Number of active users',
  registers: [register],
});

// Business Metrics
export const announcementsCreated = new Counter({
  name: 'announcements_created_total',
  help: 'Total number of announcements created',
  labelNames: ['created_by'],
  registers: [register],
});

export const homeworksCreated = new Counter({
  name: 'homeworks_created_total',
  help: 'Total number of homeworks created',
  labelNames: ['created_by'],
  registers: [register],
});

export const evciRequestsCreated = new Counter({
  name: 'evci_requests_created_total',
  help: 'Total number of evci requests created',
  labelNames: ['status'],
  registers: [register],
});

// System Metrics
export const memoryUsage = new Gauge({
  name: 'nodejs_memory_usage_bytes',
  help: 'Node.js memory usage in bytes',
  labelNames: ['type'],
  registers: [register],
});

export const cpuUsage = new Gauge({
  name: 'nodejs_cpu_usage_percent',
  help: 'Node.js CPU usage percentage',
  registers: [register],
});

// Update system metrics periodically
if (typeof process !== 'undefined') {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    memoryUsage.set({ type: 'heap_used' }, memUsage.heapUsed);
    memoryUsage.set({ type: 'heap_total' }, memUsage.heapTotal);
    memoryUsage.set({ type: 'external' }, memUsage.external);
    memoryUsage.set({ type: 'rss' }, memUsage.rss);

    const cpuUsagePercent = process.cpuUsage();
    // Calculate CPU usage percentage (simplified)
    const totalCpuUsage = cpuUsagePercent.user + cpuUsagePercent.system;
    cpuUsage.set(totalCpuUsage / 1000000); // Convert to percentage
  }, 5000); // Update every 5 seconds
}

// Export all metrics
export const metrics = {
  http: {
    requestDuration: httpRequestDuration,
    requestTotal: httpRequestTotal,
    requestErrors: httpRequestErrors,
  },
  db: {
    queryDuration: dbQueryDuration,
    queryTotal: dbQueryTotal,
  },
  ws: {
    connections: wsConnections,
    messagesTotal: wsMessagesTotal,
  },
  events: {
    published: eventsPublished,
    processed: eventsProcessed,
  },
  cache: {
    hits: cacheHits,
    misses: cacheMisses,
  },
  auth: {
    attempts: authAttempts,
    activeUsers: activeUsers,
  },
  business: {
    announcementsCreated,
    homeworksCreated,
    evciRequestsCreated,
  },
  system: {
    memoryUsage,
    cpuUsage,
  },
};

logger.info('Prometheus metrics initialized');

// Export register for metrics endpoint
export { register };

