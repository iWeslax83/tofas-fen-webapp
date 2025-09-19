import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { PerformanceService } from '../services/PerformanceService';
// Auth middleware is not exported; endpoints are public or guarded elsewhere

const router = express.Router();

// Validation middleware
const validateMetricCreate = [
  body('type').isIn(['api', 'database', 'frontend', 'system', 'cache', 'memory', 'cpu', 'network']),
  body('category').isIn(['response_time', 'throughput', 'error_rate', 'resource_usage', 'optimization', 'bottleneck']),
  body('metric').isString().notEmpty(),
  body('value').isNumeric(),
  body('unit').isString().notEmpty(),
  body('threshold').isNumeric(),
  body('context.timestamp').isISO8601().toDate(),
  body('context.endpoint').optional().isString(),
  body('context.method').optional().isString(),
  body('context.userId').optional().isString(),
  body('context.userRole').optional().isString(),
  body('context.browser').optional().isString(),
  body('context.device').optional().isString()
];

const validateOptimizationCreate = [
  body('type').isIn(['automatic', 'manual', 'scheduled']),
  body('action').isIn(['cache_clear', 'db_optimization', 'memory_cleanup', 'query_optimization', 'asset_compression', 'cdn_update']),
  body('target').isString().notEmpty(),
  body('description').isString().notEmpty(),
  body('impact').isIn(['low', 'medium', 'high'])
];

const validateConfigCreate = [
  body('name').isString().notEmpty(),
  body('description').isString().notEmpty(),
  body('category').isIn(['caching', 'database', 'api', 'frontend', 'monitoring']),
  body('settings').isObject(),
  body('isEnabled').optional().isBoolean(),
  body('priority').optional().isInt({ min: 1, max: 10 }),
  body('schedule.type').optional().isIn(['interval', 'cron', 'manual']),
  body('schedule.value').optional().isString(),
  body('conditions').optional().isArray(),
  body('conditions.*.threshold').optional().isNumeric(),
  body('conditions.*.operator').optional().isIn(['gt', 'lt', 'eq', 'gte', 'lte']),
  body('conditions.*.metric').optional().isString()
];

// Middleware to handle validation errors
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// Metrics endpoints
router.post('/metrics', validateMetricCreate, handleValidationErrors, async (req, res) => {
  try {
    await PerformanceService.recordMetric(req.body);
    res.status(201).json({
      success: true,
      message: 'Metric recorded successfully'
    });
  } catch (error) {
    console.error('Error recording metric:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording metric',
      error: error.message
    });
  }
});

router.get('/metrics', [
  query('type').optional().isString(),
  query('category').optional().isString(),
  query('status').optional().isString(),
  query('startDate').optional().isISO8601().toDate(),
  query('endDate').optional().isISO8601().toDate(),
  query('userId').optional().isString(),
  query('userRole').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], handleValidationErrors, async (req, res) => {
  try {
    const filters = {
      type: req.query.type as string,
      category: req.query.category as string,
      status: req.query.status as string,
      startDate: req.query.startDate as Date,
      endDate: req.query.endDate as Date,
      userId: req.query.userId as string,
      userRole: req.query.userRole as string
    };

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await PerformanceService.getMetrics(filters, page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting metrics',
      error: error.message
    });
  }
});

router.get('/metrics/type/:type', [
  param('type').isIn(['api', 'database', 'frontend', 'system', 'cache', 'memory', 'cpu', 'network']),
  query('limit').optional().isInt({ min: 1, max: 1000 })
], handleValidationErrors, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const metrics = await PerformanceService.getMetricsByType(req.params.type, limit);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting metrics by type:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting metrics by type',
      error: error.message
    });
  }
});

router.get('/metrics/critical', async (req, res) => {
  try {
    const metrics = await PerformanceService.getCriticalMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting critical metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting critical metrics',
      error: error.message
    });
  }
});

// Optimization endpoints
router.post('/optimizations', validateOptimizationCreate, handleValidationErrors, async (req, res) => {
  try {
    const optimization = await PerformanceService.createOptimization({
      ...req.body,
      executedBy: req.user?.id || 'system'
    });
    
    res.status(201).json({
      success: true,
      data: optimization
    });
  } catch (error) {
    console.error('Error creating optimization:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating optimization',
      error: error.message
    });
  }
});

router.get('/optimizations', [
  query('type').optional().isString(),
  query('action').optional().isString(),
  query('status').optional().isString(),
  query('impact').optional().isString(),
  query('startDate').optional().isISO8601().toDate(),
  query('endDate').optional().isISO8601().toDate(),
  query('executedBy').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], handleValidationErrors, async (req, res) => {
  try {
    const filters = {
      type: req.query.type as string,
      action: req.query.action as string,
      status: req.query.status as string,
      impact: req.query.impact as string,
      startDate: req.query.startDate as Date,
      endDate: req.query.endDate as Date,
      executedBy: req.query.executedBy as string
    };

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await PerformanceService.getOptimizations(filters, page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting optimizations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting optimizations',
      error: error.message
    });
  }
});

router.get('/optimizations/stats', async (req, res) => {
  try {
    const stats = await PerformanceService.getOptimizationStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting optimization stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting optimization stats',
      error: error.message
    });
  }
});

// Configuration endpoints
router.post('/configs', validateConfigCreate, handleValidationErrors, async (req, res) => {
  try {
    const config = await PerformanceService.createConfig(req.body);
    
    res.status(201).json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error creating config:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating config',
      error: error.message
    });
  }
});

router.get('/configs', [
  query('category').optional().isString()
], handleValidationErrors, async (req, res) => {
  try {
    const category = req.query.category as string;
    const configs = await PerformanceService.getConfigs(category);
    
    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('Error getting configs:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting configs',
      error: error.message
    });
  }
});

router.patch('/configs/:id', [
  param('id').isString().notEmpty(),
  body('name').optional().isString(),
  body('description').optional().isString(),
  body('category').optional().isString(),
  body('settings').optional().isObject(),
  body('isEnabled').optional().isBoolean(),
  body('priority').optional().isInt({ min: 1, max: 10 }),
  body('schedule').optional().isObject(),
  body('conditions').optional().isArray()
], handleValidationErrors, async (req, res) => {
  try {
    const config = await PerformanceService.updateConfig(req.params.id, req.body);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating config',
      error: error.message
    });
  }
});

// System monitoring endpoints
router.get('/system', async (req, res) => {
  try {
    const metrics = await PerformanceService.getSystemMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting system metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting system metrics',
      error: error.message
    });
  }
});

router.get('/database', async (req, res) => {
  try {
    const metrics = await PerformanceService.getDatabaseMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting database metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting database metrics',
      error: error.message
    });
  }
});

router.get('/api', async (req, res) => {
  try {
    const metrics = await PerformanceService.getAPIMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting API metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting API metrics',
      error: error.message
    });
  }
});

// Automated optimization endpoints
router.post('/optimize/scheduled', async (req, res) => {
  try {
    await PerformanceService.runScheduledOptimizations();
    
    res.json({
      success: true,
      message: 'Scheduled optimizations completed'
    });
  } catch (error) {
    console.error('Error running scheduled optimizations:', error);
    res.status(500).json({
      success: false,
      message: 'Error running scheduled optimizations',
      error: error.message
    });
  }
});

// Manual optimization triggers
router.post('/optimize/cache', async (req, res) => {
  try {
    const optimization = await PerformanceService.createOptimization({
      type: 'manual',
      action: 'cache_clear',
      target: 'application_cache',
      description: 'Manual cache clear triggered',
      impact: 'medium',
      executedBy: req.user?.id || 'system'
    });
    
    res.json({
      success: true,
      data: optimization
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cache',
      error: error.message
    });
  }
});

router.post('/optimize/database', async (req, res) => {
  try {
    const optimization = await PerformanceService.createOptimization({
      type: 'manual',
      action: 'db_optimization',
      target: 'database',
      description: 'Manual database optimization triggered',
      impact: 'high',
      executedBy: req.user?.id || 'system'
    });
    
    res.json({
      success: true,
      data: optimization
    });
  } catch (error) {
    console.error('Error optimizing database:', error);
    res.status(500).json({
      success: false,
      message: 'Error optimizing database',
      error: error.message
    });
  }
});

router.post('/optimize/memory', async (req, res) => {
  try {
    const optimization = await PerformanceService.createOptimization({
      type: 'manual',
      action: 'memory_cleanup',
      target: 'application_memory',
      description: 'Manual memory cleanup triggered',
      impact: 'medium',
      executedBy: req.user?.id || 'system'
    });
    
    res.json({
      success: true,
      data: optimization
    });
  } catch (error) {
    console.error('Error cleaning memory:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning memory',
      error: error.message
    });
  }
});

// Dashboard summary endpoint
router.get('/dashboard', async (req, res) => {
  try {
    const [systemMetrics, databaseMetrics, apiMetrics, criticalMetrics, recentOptimizations] = await Promise.all([
      PerformanceService.getSystemMetrics(),
      PerformanceService.getDatabaseMetrics(),
      PerformanceService.getAPIMetrics(),
      PerformanceService.getCriticalMetrics(),
      PerformanceService.getOptimizations({}, 1, 5)
    ]);
    
    res.json({
      success: true,
      data: {
        system: systemMetrics,
        database: databaseMetrics,
        api: apiMetrics,
        criticalMetrics: criticalMetrics.length,
        recentOptimizations: recentOptimizations.optimizations
      }
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting dashboard data',
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const [systemMetrics, criticalMetrics] = await Promise.all([
      PerformanceService.getSystemMetrics(),
      PerformanceService.getCriticalMetrics()
    ]);
    
    const healthStatus = {
      status: criticalMetrics.length > 0 ? 'warning' : 'healthy',
      timestamp: new Date(),
      system: systemMetrics,
      criticalIssues: criticalMetrics.length
    };
    
    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    console.error('Error getting health status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting health status',
      error: error.message
    });
  }
});

export default router;
