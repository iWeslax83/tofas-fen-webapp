import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalytics extends Document {
  id: string;
  type: 'academic' | 'user' | 'club' | 'system' | 'dormitory' | 'teacher' | 'student' | 'custom';
  category: string;
  metric: string;
  value: number | string | object;
  unit?: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all-time';
  date: Date;
  filters?: Record<string, any>;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const analyticsSchema = new Schema<IAnalytics>({
  id: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    required: true,
    enum: ['academic', 'user', 'club', 'system', 'dormitory', 'teacher', 'student', 'custom'],
    index: true
  },
  category: { 
    type: String, 
    required: true,
    index: true
  },
  metric: { 
    type: String, 
    required: true,
    index: true
  },
  value: { 
    type: Schema.Types.Mixed, 
    required: true 
  },
  unit: String,
  period: { 
    type: String, 
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'all-time'],
    index: true
  },
  date: { 
    type: Date, 
    required: true,
    index: true
  },
  filters: { type: Object, default: {} },
  metadata: { type: Object, default: {} },
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true 
});

// Compound indexes for efficient querying
analyticsSchema.index({ type: 1, category: 1, metric: 1 });
analyticsSchema.index({ type: 1, period: 1, date: 1 });
analyticsSchema.index({ category: 1, period: 1, date: 1 });

// TTL index for automatic cleanup of old analytics data (keep for 2 years)
analyticsSchema.index({ date: 1 }, { expireAfterSeconds: 63072000 });

export const Analytics = mongoose.model<IAnalytics>('Analytics', analyticsSchema);
