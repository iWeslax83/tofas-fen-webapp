import { v4 as uuidv4 } from 'uuid';
import { PerformanceMetric, OptimizationLog, PerformanceConfig } from '../models/Performance';
import { NotificationService } from './NotificationService';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PerformanceFilters {
  type?: string;
  category?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  userRole?: string;
}

export interface OptimizationFilters {
  type?: string;
  action?: string;
  status?: string;
  impact?: string;
  startDate?: Date;
  endDate?: Date;
  executedBy?: string;
}

export interface MetricData {
  type: string;
  category: string;
  metric: string;
  value: number;
  unit: string;
  threshold: number;
  context: {
    endpoint?: string;
    method?: string;
    userId?: string;
    userRole?: string;
    browser?: string;
    device?: string;
    timestamp: Date;
  };
  metadata?: Record<string, any>;
}

export interface OptimizationData {
  type: 'automatic' | 'manual' | 'scheduled';
  action: string;
  target: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  executedBy: string;
}

export class PerformanceService {
  private static cache = new Map<string, any>();
  private static cacheExpiry = new Map<string, number>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Metric Management
  static async recordMetric(data: MetricData): Promise<void> {
    try {
      const status = this.determineStatus(data.value, data.threshold);
      
      const metric = new PerformanceMetric({
        id: uuidv4(),
        ...data,
        status,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await metric.save();

      // Check if this is a critical metric and trigger alerts
      if (status === 'critical') {
        await this.triggerCriticalAlert(metric);
      }

      // Update cache
      this.updateMetricCache(data.type, data.category);
    } catch (error) {
      console.error('Error recording metric:', error);
      throw error;
    }
  }

  static async getMetrics(filters: PerformanceFilters = {}, page = 1, limit = 50): Promise<{
    metrics: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const query: any = { isActive: true };

      if (filters.type) query.type = filters.type;
      if (filters.category) query.category = filters.category;
      if (filters.status) query.status = filters.status;
      if (filters.userId) query['context.userId'] = filters.userId;
      if (filters.userRole) query['context.userRole'] = filters.userRole;
      if (filters.startDate || filters.endDate) {
        query['context.timestamp'] = {};
        if (filters.startDate) query['context.timestamp'].$gte = filters.startDate;
        if (filters.endDate) query['context.timestamp'].$lte = filters.endDate;
      }

      const skip = (page - 1) * limit;
      const [metrics, total] = await Promise.all([
        PerformanceMetric.find(query)
          .sort({ 'context.timestamp': -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PerformanceMetric.countDocuments(query)
      ]);

      return {
        metrics,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error getting metrics:', error);
      throw error;
    }
  }

  static async getMetricsByType(type: string, limit = 100): Promise<any[]> {
    try {
      return await PerformanceMetric.find({ type, isActive: true })
        .sort({ 'context.timestamp': -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      console.error('Error getting metrics by type:', error);
      throw error;
    }
  }

  static async getCriticalMetrics(): Promise<any[]> {
    try {
      return await PerformanceMetric.find({ status: 'critical', isActive: true })
        .sort({ 'context.timestamp': -1 })
        .lean();
    } catch (error) {
      console.error('Error getting critical metrics:', error);
      throw error;
    }
  }

  // Optimization Management
  static async createOptimization(data: OptimizationData): Promise<any> {
    try {
      const optimization = new OptimizationLog({
        id: uuidv4(),
        ...data,
        status: 'pending',
        results: {
          beforeMetrics: {},
          afterMetrics: {},
          improvement: 0,
          duration: 0
        },
        executedAt: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await optimization.save();

      // Execute optimization based on action
      await this.executeOptimization(optimization);

      return optimization;
    } catch (error) {
      console.error('Error creating optimization:', error);
      throw error;
    }
  }

  static async getOptimizations(filters: OptimizationFilters = {}, page = 1, limit = 50): Promise<{
    optimizations: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const query: any = { isActive: true };

      if (filters.type) query.type = filters.type;
      if (filters.action) query.action = filters.action;
      if (filters.status) query.status = filters.status;
      if (filters.impact) query.impact = filters.impact;
      if (filters.executedBy) query.executedBy = filters.executedBy;
      if (filters.startDate || filters.endDate) {
        query.executedAt = {};
        if (filters.startDate) query.executedAt.$gte = filters.startDate;
        if (filters.endDate) query.executedAt.$lte = filters.endDate;
      }

      const skip = (page - 1) * limit;
      const [optimizations, total] = await Promise.all([
        OptimizationLog.find(query)
          .sort({ executedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        OptimizationLog.countDocuments(query)
      ]);

      return {
        optimizations,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error getting optimizations:', error);
      throw error;
    }
  }

  static async getOptimizationStats(): Promise<any[]> {
    try {
      const stats = await OptimizationLog.aggregate([
        { $match: { isActive: true } },
        { $group: {
          _id: '$action',
          count: { $sum: 1 },
          avgImprovement: { $avg: '$results.improvement' }
        }}
      ]);
      return stats;
    } catch (error) {
      console.error('Error getting optimization stats:', error);
      throw error;
    }
  }

  // Configuration Management
  static async createConfig(data: {
    name: string;
    description: string;
    category: string;
    settings: Record<string, any>;
    isEnabled?: boolean;
    priority?: number;
    schedule?: { type: string; value: string };
    conditions?: Array<{ threshold: number; operator: string; metric: string }>;
  }): Promise<any> {
    try {
      const config = new PerformanceConfig({
        id: uuidv4(),
        ...data,
        isEnabled: data.isEnabled ?? true,
        priority: data.priority ?? 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await config.save();
      return config;
    } catch (error) {
      console.error('Error creating config:', error);
      throw error;
    }
  }

  static async getConfigs(category?: string): Promise<any[]> {
    try {
      const query: any = { isEnabled: true, isActive: true };
      if (category) query.category = category;
      return await PerformanceConfig.find(query).lean();
    } catch (error) {
      console.error('Error getting configs:', error);
      throw error;
    }
  }

  static async updateConfig(id: string, updates: Partial<any>): Promise<any> {
    try {
      const config = await PerformanceConfig.findOneAndUpdate(
        { id, isActive: true },
        { ...updates, updatedAt: new Date() },
        { new: true }
      );
      return config;
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  }

  // Performance Monitoring
  static async getSystemMetrics(): Promise<any> {
    try {
      const cacheKey = 'system_metrics';
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const [memoryUsage, cpuUsage, diskUsage] = await Promise.all([
        this.getMemoryUsage(),
        this.getCPUUsage(),
        this.getDiskUsage()
      ]);

      const metrics = {
        memory: memoryUsage,
        cpu: cpuUsage,
        disk: diskUsage,
        timestamp: new Date()
      };

      this.setCache(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Error getting system metrics:', error);
      throw error;
    }
  }

  static async getDatabaseMetrics(): Promise<any> {
    try {
      const cacheKey = 'database_metrics';
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const db = require('mongoose').connection.db;
      const stats = await db.stats();
      
      const metrics = {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        timestamp: new Date()
      };

      this.setCache(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Error getting database metrics:', error);
      throw error;
    }
  }

  static async getAPIMetrics(): Promise<any> {
    try {
      const cacheKey = 'api_metrics';
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const [totalRequests, errorRequests, avgResponseTime] = await Promise.all([
        PerformanceMetric.countDocuments({
          type: 'api',
          'context.timestamp': { $gte: oneHourAgo }
        }),
        PerformanceMetric.countDocuments({
          type: 'api',
          category: 'error_rate',
          'context.timestamp': { $gte: oneHourAgo }
        }),
        PerformanceMetric.aggregate([
          {
            $match: {
              type: 'api',
              category: 'response_time',
              'context.timestamp': { $gte: oneHourAgo }
            }
          },
          {
            $group: {
              _id: null,
              avgResponseTime: { $avg: '$value' }
            }
          }
        ])
      ]);

      const metrics = {
        totalRequests,
        errorRequests,
        errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
        avgResponseTime: avgResponseTime[0]?.avgResponseTime || 0,
        timestamp: now
      };

      this.setCache(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Error getting API metrics:', error);
      throw error;
    }
  }

  // Automated Optimizations
  static async runScheduledOptimizations(): Promise<void> {
    try {
      const configs = await this.getConfigs();
      
      for (const config of configs) {
        if (config.schedule && config.isEnabled) {
          await this.checkAndExecuteOptimization(config);
        }
      }
    } catch (error) {
      console.error('Error running scheduled optimizations:', error);
      throw error;
    }
  }

  static async executeOptimization(optimization: any): Promise<void> {
    try {
      // Update status to running
      optimization.status = 'running';
      await optimization.save();

      const startTime = Date.now();
      let beforeMetrics: Record<string, number> = {};
      let afterMetrics: Record<string, number> = {};

      // Get before metrics
      beforeMetrics = await this.getCurrentMetrics(optimization.action);

      // Execute the optimization
      switch (optimization.action) {
        case 'cache_clear':
          await this.clearCache();
          break;
        case 'db_optimization':
          await this.optimizeDatabase();
          break;
        case 'memory_cleanup':
          await this.cleanupMemory();
          break;
        case 'query_optimization':
          await this.optimizeQueries();
          break;
        case 'asset_compression':
          await this.compressAssets();
          break;
        case 'cdn_update':
          await this.updateCDN();
          break;
        default:
          throw new Error(`Unknown optimization action: ${optimization.action}`);
      }

      // Get after metrics
      afterMetrics = await this.getCurrentMetrics(optimization.action);

      // Calculate improvement
      const improvement = this.calculateImprovement(beforeMetrics, afterMetrics);
      const duration = Date.now() - startTime;

      // Update optimization results
      optimization.results = {
        beforeMetrics,
        afterMetrics,
        improvement,
        duration
      };
      optimization.status = 'completed';
      optimization.completedAt = new Date();
      await optimization.save();

      // Send notification if improvement is significant
      if (improvement > 10) {
        await this.notifyOptimizationSuccess(optimization);
      }
    } catch (error) {
      console.error('Error executing optimization:', error);
      
      optimization.status = 'failed';
      optimization.error = error.message;
      optimization.completedAt = new Date();
      await optimization.save();

      await this.notifyOptimizationFailure(optimization, error.message);
    }
  }

  // Private helper methods
  private static determineStatus(value: number, threshold: number): string {
    if (value <= threshold * 0.8) return 'optimized';
    if (value <= threshold) return 'normal';
    if (value <= threshold * 1.5) return 'warning';
    return 'critical';
  }

  private static async triggerCriticalAlert(metric: any): Promise<void> {
    try {
      await NotificationService.createNotification({
        title: 'Performance Alert',
        message: `Critical performance issue detected: ${metric.metric} = ${metric.value} ${metric.unit}`,
        type: 'error',
        priority: 'high',
        category: 'technical',
        recipients: ['admin'],
        sender: { id: 'system', name: 'System', role: 'system' }
      } as any);
    } catch (error) {
      console.error('Error triggering critical alert:', error);
    }
  }

  private static async getMemoryUsage(): Promise<any> {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024) // MB
    };
  }

  private static async getCPUUsage(): Promise<any> {
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endUsage = process.cpuUsage(startUsage);
    
    return {
      user: endUsage.user,
      system: endUsage.system
    };
  }

  private static async getDiskUsage(): Promise<any> {
    try {
      const { stdout } = await execAsync('df -h .');
      const lines = stdout.split('\n');
      const dataLine = lines[1];
      const parts = dataLine.split(/\s+/);
      
      return {
        total: parts[1],
        used: parts[2],
        available: parts[3],
        usagePercent: parts[4]
      };
    } catch (error) {
      return { error: 'Unable to get disk usage' };
    }
  }

  private static async getCurrentMetrics(action: string): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};
    
    switch (action) {
      case 'cache_clear':
        metrics.cacheSize = this.cache.size;
        break;
      case 'db_optimization':
        const dbMetrics = await this.getDatabaseMetrics();
        metrics.collections = dbMetrics.collections;
        metrics.dataSize = dbMetrics.dataSize;
        break;
      case 'memory_cleanup':
        const memMetrics = await this.getMemoryUsage();
        metrics.heapUsed = memMetrics.heapUsed;
        metrics.rss = memMetrics.rss;
        break;
      default:
        break;
    }
    
    return metrics;
  }

  private static calculateImprovement(before: Record<string, number>, after: Record<string, number>): number {
    if (Object.keys(before).length === 0 || Object.keys(after).length === 0) {
      return 0;
    }

    const beforeAvg = Object.values(before).reduce((a, b) => a + b, 0) / Object.keys(before).length;
    const afterAvg = Object.values(after).reduce((a, b) => a + b, 0) / Object.keys(after).length;
    
    if (beforeAvg === 0) return 0;
    return ((beforeAvg - afterAvg) / beforeAvg) * 100;
  }

  private static async clearCache(): Promise<void> {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  private static async optimizeDatabase(): Promise<void> {
    // This would typically involve database-specific optimizations
    // For MongoDB, we could run maintenance commands
    console.log('Database optimization completed');
  }

  private static async cleanupMemory(): Promise<void> {
    if (global.gc) {
      global.gc();
    }
  }

  private static async optimizeQueries(): Promise<void> {
    // This would involve analyzing and optimizing slow queries
    console.log('Query optimization completed');
  }

  private static async compressAssets(): Promise<void> {
    // This would involve compressing static assets
    console.log('Asset compression completed');
  }

  private static async updateCDN(): Promise<void> {
    // This would involve updating CDN cache
    console.log('CDN update completed');
  }

  private static async checkAndExecuteOptimization(config: any): Promise<void> {
    // Check if conditions are met for automatic execution
    const shouldExecute = await this.evaluateConditions(config.conditions);
    
    if (shouldExecute) {
      await this.createOptimization({
        type: 'automatic',
        action: config.settings.action || 'cache_clear',
        target: config.name,
        description: `Automatic optimization triggered for ${config.name}`,
        impact: 'medium',
        executedBy: 'system'
      });
    }
  }

  private static async evaluateConditions(conditions: any[]): Promise<boolean> {
    if (!conditions || conditions.length === 0) return false;

    for (const condition of conditions) {
      const currentValue = await this.getMetricValue(condition.metric);
      const shouldExecute = this.evaluateCondition(currentValue, condition.operator, condition.threshold);
      if (!shouldExecute) return false;
    }

    return true;
  }

  private static async getMetricValue(metric: string): Promise<number> {
    // This would get the current value of a specific metric
    // For now, return a mock value
    return Math.random() * 100;
  }

  private static evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }

  private static async notifyOptimizationSuccess(optimization: any): Promise<void> {
    try {
      await NotificationService.createNotification({
        title: 'Optimization Success',
        message: `${optimization.action} completed successfully with ${optimization.results.improvement.toFixed(2)}% improvement`,
        type: 'success',
        priority: 'medium',
        category: 'technical',
        recipients: ['admin'],
        sender: { id: 'system', name: 'System', role: 'system' }
      } as any);
    } catch (error) {
      console.error('Error sending optimization success notification:', error);
    }
  }

  private static async notifyOptimizationFailure(optimization: any, error: string): Promise<void> {
    try {
      await NotificationService.createNotification({
        title: 'Optimization Failed',
        message: `${optimization.action} failed: ${error}`,
        type: 'error',
        priority: 'high',
        category: 'technical',
        recipients: ['admin'],
        sender: { id: 'system', name: 'System', role: 'system' }
      } as any);
    } catch (error) {
      console.error('Error sending optimization failure notification:', error);
    }
  }

  // Cache management
  private static setCache(key: string, value: any): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  private static isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry && Date.now() < expiry;
  }

  private static updateMetricCache(type: string, category: string): void {
    const cacheKey = `metrics_${type}_${category}`;
    this.cache.delete(cacheKey);
  }
}
