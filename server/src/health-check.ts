/**
 * Docker HEALTHCHECK script.
 *
 * Runs as a separate `node` process inside the container, completely
 * isolated from the main server process. The previous implementation
 * imported `mongoose` and checked `mongoose.connection.readyState`, which
 * always returned 0 because this process never called `mongoose.connect()`.
 * That meant docker permanently marked the container unhealthy even when
 * the server was fine, causing an endless restart loop.
 *
 * The correct approach is to talk to the main server over HTTP — it exposes
 * a `/health` endpoint that already verifies database + redis + memory + cpu.
 */

import http from 'http';

const PORT = process.env.PORT || '3001';
const HOST = process.env.HEALTHCHECK_HOST || '127.0.0.1';
const PATH = '/health';
const TIMEOUT_MS = 5000;

const req = http.request(
  { host: HOST, port: Number(PORT), path: PATH, method: 'GET', timeout: TIMEOUT_MS },
  (res) => {
    // 2xx and 3xx are healthy; anything else is not.
    const statusCode = res.statusCode ?? 0;
    // Drain the body so the socket closes cleanly.
    res.on('data', () => {});
    res.on('end', () => {
      if (statusCode >= 200 && statusCode < 400) {
        process.exit(0);
      } else {
        console.error(`Health check failed: HTTP ${statusCode}`);
        process.exit(1);
      }
    });
  },
);

req.on('timeout', () => {
  console.error(`Health check timed out after ${TIMEOUT_MS}ms`);
  req.destroy();
  process.exit(1);
});

req.on('error', (err) => {
  console.error('Health check request failed:', err.message);
  process.exit(1);
});

req.end();
