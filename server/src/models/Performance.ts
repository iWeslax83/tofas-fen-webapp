import mongoose, { Document, Schema } from 'mongoose';

export interface IPerformanceMetric extends Document {
  id: string;
  type: 'api' | 'database' | 'frontend' | 'system' | 'cache' | 'memory' | 'cpu' | 'network';
  category: 'response_time' | 'throughput' | 'error_rate' | 'resource_usage' | 'optimization' | 'bottleneck';
  metric: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'normal' | 'warning' | 'critical' | 'optimized';
  context: {
    endpoint?: string;
    method?: string;
    userId?: string;
    userRole?: string;
    browser?: string;
    device?: string;
    timestamp: Date;
  };
  metadata: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOptimizationLog extends Document {
  id: string;
  type: 'automatic' | 'manual' | 'scheduled';
  action: 'cache_clear' | 'db_optimization' | 'memory_cleanup' | 'query_optimization' | 'asset_compression' | 'cdn_update';
  target: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: {
    beforeMetrics: Record<string, number>;
    afterMetrics: Record<string, number>;
    improvement: number;
    duration: number;
  };
  executedBy: string;
  executedAt: Date;
  completedAt?: Date;
  error?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPerformanceConfig extends Document {
  id: string;
  name: string;
  description: string;
  category: 'caching' | 'database' | 'api' | 'frontend' | 'monitoring';
  settings: Record<string, any>;
  isEnabled: boolean;
  priority: number;
  schedule?: {
    type: 'interval' | 'cron' | 'manual';
    value: string;
  };
  conditions: {
    threshold: number;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    metric: string;
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PerformanceMetricSchema = new Schema<IPerformanceMetric>({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['api', 'database', 'frontend', 'system', 'cache', 'memory', 'cpu', 'network'] },
  category: { type: String, required: true, enum: ['response_time', 'throughput', 'error_rate', 'resource_usage', 'optimization', 'bottleneck'] },
  metric: { type: String, required: true },
  value: { type: Number, required: true },
  unit: { type: String, required: true },
  threshold: { type: Number, required: true },
  status: { type: String, required: true, enum: ['normal', 'warning', 'critical', 'optimized'] },
  context: {
    endpoint: String,
    method: String,
    userId: String,
    userRole: String,
    browser: String,
    device: String,
    timestamp: { type: Date, required: true }
  },
  metadata: { type: Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const OptimizationLogSchema = new Schema<IOptimizationLog>({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['automatic', 'manual', 'scheduled'] },
  action: { type: String, required: true, enum: ['cache_clear', 'db_optimization', 'memory_cleanup', 'query_optimization', 'asset_compression', 'cdn_update'] },
  target: { type: String, required: true },
  description: { type: String, required: true },
  impact: { type: String, required: true, enum: ['low', 'medium', 'high'] },
  status: { type: String, required: true, enum: ['pending', 'running', 'completed', 'failed'] },
  results: {
    beforeMetrics: { type: Schema.Types.Mixed, default: {} },
    afterMetrics: { type: Schema.Types.Mixed, default: {} },
    improvement: { type: Number, default: 0 },
    duration: { type: Number, default: 0 }
  },
  executedBy: { type: String, required: true },
  executedAt: { type: Date, required: true },
  completedAt: Date,
  error: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PerformanceConfigSchema = new Schema<IPerformanceConfig>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, enum: ['caching', 'database', 'api', 'frontend', 'monitoring'] },
  settings: { type: Schema.Types.Mixed, default: {} },
  isEnabled: { type: Boolean, default: true },
  priority: { type: Number, default: 1 },
  schedule: {
    type: { type: String, enum: ['interval', 'cron', 'manual'] },
    value: String
  },
  conditions: [{
    threshold: { type: Number, required: true },
    operator: { type: String, required: true, enum: ['gt', 'lt', 'eq', 'gte', 'lte'] },
    metric: { type: String, required: true }
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for PerformanceMetric
PerformanceMetricSchema.index({ type: 1, category: 1 });
PerformanceMetricSchema.index({ status: 1 });
PerformanceMetricSchema.index({ 'context.timestamp': -1 });
PerformanceMetricSchema.index({ 'context.userId': 1 });
PerformanceMetricSchema.index({ metric: 1, value: 1 });

// Indexes for OptimizationLog
OptimizationLogSchema.index({ type: 1, action: 1 });
OptimizationLogSchema.index({ status: 1 });
OptimizationLogSchema.index({ executedAt: -1 });
OptimizationLogSchema.index({ executedBy: 1 });
OptimizationLogSchema.index({ impact: 1 });

// Indexes for PerformanceConfig
PerformanceConfigSchema.index({ category: 1 });
PerformanceConfigSchema.index({ isEnabled: 1 });
PerformanceConfigSchema.index({ priority: 1 });
PerformanceConfigSchema.index({ name: 1 });

// TTL indexes for automatic cleanup
PerformanceMetricSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days
OptimizationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 days

// Instance methods
PerformanceMetricSchema.methods.isAboveThreshold = function(): boolean {
  return this.value > this.threshold;
};

PerformanceMetricSchema.methods.getStatusColor = function(): string {
  switch (this.status) {
    case 'normal': return 'green';
    case 'warning': return 'yellow';
    case 'critical': return 'red';
    case 'optimized': return 'blue';
    default: return 'gray';
  }
};

OptimizationLogSchema.methods.calculateImprovement = function(): number {
  if (this.results.beforeMetrics && this.results.afterMetrics) {
    const beforeValues = Object.values(this.results.beforeMetrics) as number[];
    const afterValues = Object.values(this.results.afterMetrics) as number[];
    const beforeAvg = beforeValues.reduce((a: number, b: number) => a + b, 0) / beforeValues.length;
    const afterAvg = afterValues.reduce((a: number, b: number) => a + b, 0) / afterValues.length;
    return ((beforeAvg - afterAvg) / beforeAvg) * 100;
  }
  return 0;
};

// Static methods
PerformanceMetricSchema.statics.getMetricsByType = function(type: string, limit = 100) {
  return this.find({ type, isActive: true })
    .sort({ 'context.timestamp': -1 })
    .limit(limit);
};

PerformanceMetricSchema.statics.getCriticalMetrics = function() {
  return this.find({ status: 'critical', isActive: true })
    .sort({ 'context.timestamp': -1 });
};

OptimizationLogSchema.statics.getRecentOptimizations = function(limit = 50) {
  return this.find({ isActive: true })
    .sort({ executedAt: -1 })
    .limit(limit);
};

OptimizationLogSchema.statics.getOptimizationStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        avgImprovement: { $avg: '$results.improvement' },
        totalDuration: { $sum: '$results.duration' }
      }
    }
  ]);
};

PerformanceConfigSchema.statics.getActiveConfigs = function() {
  return this.find({ isEnabled: true, isActive: true })
    .sort({ priority: 1 });
};

export const PerformanceMetric = mongoose.model<IPerformanceMetric>('PerformanceMetric', PerformanceMetricSchema);
export const OptimizationLog = mongoose.model<IOptimizationLog>('OptimizationLog', OptimizationLogSchema);
export const PerformanceConfig = mongoose.model<IPerformanceConfig>('PerformanceConfig', PerformanceConfigSchema);
