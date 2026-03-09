import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Monitoring endpoint'leri için API key tabanlı auth.
 * Harici monitoring araçları (Prometheus, Grafana, uptime checker) JWT yerine
 * MONITORING_API_KEY header'ı ile erişebilir.
 * Admin kullanıcılar JWT ile de erişebilir (mevcut requireAuth + requireRole korunur).
 */
export const requireMonitoringAuth = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.get('X-Monitoring-Key') || req.query.monitoring_key;
  const configuredKey = process.env.MONITORING_API_KEY;

  // API key varsa ve eşleşiyorsa geç
  if (configuredKey && apiKey === configuredKey) {
    logger.debug('Monitoring access granted via API key', {
      ip: req.ip,
      path: req.path,
    });
    return next();
  }

  // API key yoksa veya eşleşmiyorsa, JWT auth'a düş (requireAuth zaten route'ta var)
  // Bu middleware sadece API key bypass sağlar, JWT auth ayrıca uygulanır
  if (apiKey && apiKey !== configuredKey) {
    logger.warn('Invalid monitoring API key attempt', {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({ error: 'Geçersiz monitoring API key' });
    return;
  }

  // API key gönderilmemişse, sonraki middleware'e (requireAuth) bırak
  next();
};
