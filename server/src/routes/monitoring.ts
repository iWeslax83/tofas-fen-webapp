import express from 'express';
import monitoringService, { startRequestTimer, endRequestTimer, logRequestMetrics } from '../utils/monitoring';
import logger from '../utils/logger';

const router = express.Router();

// Health check endpoint
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

// System metrics endpoint
router.get('/metrics', (req, res) => {
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

// Performance report endpoint
router.get('/report', (req, res) => {
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

// Memory usage endpoint
router.get('/memory', (req, res) => {
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

// CPU usage endpoint
router.get('/cpu', (req, res) => {
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

// Uptime endpoint
router.get('/uptime', (req, res) => {
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

// Warnings endpoint
router.get('/warnings', (req, res) => {
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

export default router; 