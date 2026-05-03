import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { globalErrorHandler } from '../../middleware/errorHandler';
import logger from '../../utils/logger';

describe('globalErrorHandler — req.body redaction (N-C2)', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'warn').mockImplementation(() => logger);
    vi.spyOn(logger, 'error').mockImplementation(() => logger);
  });

  it('redacts password fields from logged body on errors', async () => {
    const app = express();
    app.use(express.json());
    app.post('/boom', (_req, _res, next) => next(new Error('synthetic')));
    app.use(globalErrorHandler);

    await request(app).post('/boom').send({ id: 'u1', password: 'hunter2', sifre: 'şf' });

    const calls = (logger.error as any).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const logged = JSON.stringify(calls[0]);
    expect(logged).not.toContain('hunter2');
    expect(logged).not.toContain('şf');
    expect(logged).toContain('[REDACTED]');
  });

  it('drops Authorization header from logged context', async () => {
    const app = express();
    app.use(express.json());
    app.get('/boom', (_req, _res, next) => next(new Error('synthetic')));
    app.use(globalErrorHandler);

    await request(app).get('/boom').set('Authorization', 'Bearer secret-token-xyz');

    const calls = (logger.error as any).mock.calls;
    const logged = JSON.stringify(calls[0]);
    expect(logged).not.toContain('secret-token-xyz');
  });
});
