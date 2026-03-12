import express from 'express';
import monitoringService, { startRequestTimer, endRequestTimer, logRequestMetrics } from '../utils/monitoring';
import logger from '../utils/logger';
import { requireAuth, requireRole } from '../middleware/auth';
import { requireMonitoringAuth } from '../middleware/monitoringAuth';
import { BackupService } from '../services/BackupService';
import { getWafStatus, blockIP, unblockIP } from '../middleware/waf';
import { SecurityAlertService } from '../services/SecurityAlertService';

const router = express.Router();

// Health check endpoint (public - Kubernetes/load balancer probes)
router.get('/health', async (req, res) => {
  const startTime = startRequestTimer();

  try {
    const healthCheck = await monitoringService.performHealthCheck();

    const statusCode = healthCheck.status === 'healthy' ? 200 :
                      healthCheck.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthCheck);

    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    logger.info(`Health check completed: ${healthCheck.status}`, {
      status: healthCheck.status,
      responseTime: duration,
    });
  } catch (error) {
    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// System metrics endpoint (API key OR admin JWT)
router.get('/metrics', requireMonitoringAuth, requireAuth, requireRole(['admin']), (req, res) => {
  const startTime = startRequestTimer();

  try {
    const metrics = {
      system: monitoringService.getSystemMetrics(),
      performance: monitoringService.getPerformanceMetrics(),
      warnings: monitoringService.checkPerformanceWarnings(),
      memoryLeak: monitoringService.checkMemoryLeak(),
    };

    res.json(metrics);

    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    logger.debug('System metrics retrieved', {
      responseTime: duration,
      warnings: metrics.warnings.length,
    });
  } catch (error) {
    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    logger.error('Failed to get system metrics', { error: error.message });
    res.status(500).json({
      error: 'Failed to get system metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

// Performance report endpoint (API key OR admin JWT)
router.get('/report', requireMonitoringAuth, requireAuth, requireRole(['admin']), (req, res) => {
  const startTime = startRequestTimer();

  try {
    const report = monitoringService.generateReport();

    res.json(report);

    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    logger.info('Performance report generated', {
      responseTime: duration,
      warnings: report.warnings.length,
    });
  } catch (error) {
    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    logger.error('Failed to generate performance report', { error: error.message });
    res.status(500).json({
      error: 'Failed to generate performance report',
      timestamp: new Date().toISOString(),
    });
  }
});

// Memory usage endpoint (API key OR admin JWT)
router.get('/memory', requireMonitoringAuth, requireAuth, requireRole(['admin']), (req, res) => {
  const startTime = startRequestTimer();

  try {
    const memoryUsage = process.memoryUsage();
    const systemMetrics = monitoringService.getSystemMetrics();

    const memoryInfo = {
      process: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
      },
      system: systemMetrics.memory,
      heapUsagePercentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      memoryLeak: monitoringService.checkMemoryLeak(),
    };

    res.json(memoryInfo);

    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    logger.debug('Memory usage retrieved', {
      responseTime: duration,
      heapUsage: memoryInfo.heapUsagePercentage,
    });
  } catch (error) {
    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    logger.error('Failed to get memory usage', { error: error.message });
    res.status(500).json({
      error: 'Failed to get memory usage',
      timestamp: new Date().toISOString(),
    });
  }
});

// CPU usage endpoint (API key OR admin JWT)
router.get('/cpu', requireMonitoringAuth, requireAuth, requireRole(['admin']), (req, res) => {
  const startTime = startRequestTimer();

  try {
    const systemMetrics = monitoringService.getSystemMetrics();

    const cpuInfo = {
      usage: systemMetrics.cpu.usage,
      loadAverage: systemMetrics.cpu.loadAverage,
      cores: systemMetrics.cpu.cores,
      platform: systemMetrics.platform,
    };

    res.json(cpuInfo);

    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    logger.debug('CPU usage retrieved', {
      responseTime: duration,
      usage: cpuInfo.usage,
    });
  } catch (error) {
    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    logger.error('Failed to get CPU usage', { error: error.message });
    res.status(500).json({
      error: 'Failed to get CPU usage',
      timestamp: new Date().toISOString(),
    });
  }
});

// Uptime endpoint (API key OR admin JWT)
router.get('/uptime', requireMonitoringAuth, requireAuth, requireRole(['admin']), (req, res) => {
  const startTime = startRequestTimer();

  try {
    const uptime = {
      process: process.uptime(),
      system: monitoringService.getSystemMetrics().uptime,
      startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    };

    res.json(uptime);

    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    logger.debug('Uptime retrieved', {
      responseTime: duration,
      processUptime: uptime.process,
    });
  } catch (error) {
    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    logger.error('Failed to get uptime', { error: error.message });
    res.status(500).json({
      error: 'Failed to get uptime',
      timestamp: new Date().toISOString(),
    });
  }
});

// Warnings endpoint (API key OR admin JWT)
router.get('/warnings', requireMonitoringAuth, requireAuth, requireRole(['admin']), (req, res) => {
  const startTime = startRequestTimer();

  try {
    const warnings = monitoringService.checkPerformanceWarnings();

    res.json({
      warnings,
      count: warnings.length,
      timestamp: new Date().toISOString(),
    });

    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    if (warnings.length > 0) {
      logger.warn('Performance warnings detected', {
        warnings,
        responseTime: duration,
      });
    }
  } catch (error) {
    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    logger.error('Failed to get warnings', { error: error.message });
    res.status(500).json({
      error: 'Failed to get warnings',
      timestamp: new Date().toISOString(),
    });
  }
});

// --- Database Backup Endpoints (admin only) ---

// Manuel yedek al
router.post('/backup', requireAuth, requireRole(['admin']), async (req, res) => {
  const startTime = startRequestTimer();

  try {
    logger.info('Manual backup triggered', { userId: (req as any).user?.id });
    const result = await BackupService.createBackup();

    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    if (result.success) {
      res.json({
        message: 'Yedekleme başarılı',
        ...result,
        duration,
      });
    } else {
      res.status(500).json({
        message: 'Yedekleme başarısız',
        error: result.error,
      });
    }
  } catch (error) {
    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    logger.error('Backup endpoint failed', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      error: 'Yedekleme sırasında hata oluştu',
      timestamp: new Date().toISOString(),
    });
  }
});

// Yedek listesini getir
router.get('/backups', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const backups = BackupService.listBackups();
    res.json({ backups, count: backups.length });
  } catch (error) {
    logger.error('List backups failed', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Yedek listesi alınamadı' });
  }
});

// Yedek dogrula
router.post('/backup/verify', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { backupName } = req.body;
    const result = await BackupService.verifyBackup(backupName);
    res.json(result);
  } catch (error) {
    logger.error('Backup verification failed', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Yedek dogrulanamadi' });
  }
});

// Yedek al ve dogrula
router.post('/backup/create-and-verify', requireAuth, requireRole(['admin']), async (req, res) => {
  const startTime = startRequestTimer();

  try {
    logger.info('Create and verify backup triggered', { userId: (req as any).user?.id });
    const result = await BackupService.createAndVerifyBackup();

    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    res.json({
      ...result,
      duration,
    });
  } catch (error) {
    const duration = endRequestTimer(startTime);
    logRequestMetrics(req, res, duration);

    logger.error('Create and verify backup failed', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Yedekleme ve dogrulama sirasinda hata olustu' });
  }
});

// --- WAF & Security Status ---

// WAF status
router.get('/waf', requireAuth, requireRole(['admin']), (_req, res) => {
  try {
    const status = getWafStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    logger.error('WAF status failed', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'WAF durumu alinamadi' });
  }
});

// Block an IP
router.post('/waf/block', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { ip, durationMinutes } = req.body;
    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({ error: 'IP adresi gereklidir' });
    }
    const duration = durationMinutes ? durationMinutes * 60 * 1000 : undefined;
    blockIP(ip, duration);
    res.json({ success: true, message: `${ip} engellendi` });
  } catch (error) {
    logger.error('WAF block failed', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'IP engellenemedi' });
  }
});

// Unblock an IP
router.post('/waf/unblock', requireAuth, requireRole(['admin']), (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({ error: 'IP adresi gereklidir' });
    }
    unblockIP(ip);
    res.json({ success: true, message: `${ip} engeli kaldirildi` });
  } catch (error) {
    logger.error('WAF unblock failed', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'IP engeli kaldirilamadi' });
  }
});

// Security alerts status
router.get('/security', requireAuth, requireRole(['admin']), async (_req, res) => {
  try {
    const status = await SecurityAlertService.getSecurityStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    logger.error('Security status failed', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Guvenlik durumu alinamadi' });
  }
});

export default router;
