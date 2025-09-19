import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  id: string;
  title: string;
  description: string;
  type: 'academic' | 'user' | 'club' | 'system' | 'dormitory' | 'teacher' | 'student' | 'custom';
  category: string;
  template: string;
  parameters: Record<string, any>;
  filters: Record<string, any>;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'manual';
    nextRun?: Date;
    recipients: string[];
    emailTemplate?: string;
  };
  data: {
    raw: any[];
    aggregated: any;
    charts: {
      type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'scatter';
      data: any;
      options: any;
    }[];
    tables: {
      headers: string[];
      rows: any[][];
      summary?: any;
    }[];
  };
  status: 'draft' | 'generated' | 'scheduled' | 'archived';
  generatedBy: string;
  generatedAt: Date;
  expiresAt?: Date;
  isPublic: boolean;
  allowedRoles: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
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
  template: { type: String, required: true },
  parameters: { type: Object, default: {} },
  filters: { type: Object, default: {} },
  schedule: {
    frequency: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'manual']
    },
    nextRun: Date,
    recipients: [String],
    emailTemplate: String
  },
  data: {
    raw: { type: [Schema.Types.Mixed], default: [] },
    aggregated: { type: Schema.Types.Mixed, default: {} },
    charts: [{
      type: { 
        type: String, 
        enum: ['line', 'bar', 'pie', 'doughnut', 'radar', 'scatter']
      },
      data: Schema.Types.Mixed,
      options: Schema.Types.Mixed
    }],
    tables: [{
      headers: [String],
      rows: [[Schema.Types.Mixed]],
      summary: Schema.Types.Mixed
    }]
  },
  status: { 
    type: String, 
    required: true,
    enum: ['draft', 'generated', 'scheduled', 'archived'],
    default: 'draft',
    index: true
  },
  generatedBy: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  expiresAt: Date,
  isPublic: { type: Boolean, default: false },
  allowedRoles: { type: [String], default: ['admin'] },
  isActive: { type: Boolean, default: true }
}, { 
  timestamps: true 
});

// Compound indexes for efficient querying
reportSchema.index({ type: 1, category: 1, status: 1 });
reportSchema.index({ generatedBy: 1, createdAt: 1 });
reportSchema.index({ status: 1, isActive: 1 });
reportSchema.index({ allowedRoles: 1, isPublic: 1 });

// TTL index for automatic cleanup of expired reports (keep for 1 year)
reportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Text index for search functionality
reportSchema.index({ 
  title: 'text', 
  description: 'text' 
}, {
  weights: {
    title: 10,
    description: 5
  },
  name: 'report_text_search'
});

export const Report = mongoose.model<IReport>('Report', reportSchema);
