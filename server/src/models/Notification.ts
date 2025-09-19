import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'request' | 'approval' | 'reminder' | 'announcement';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'academic' | 'administrative' | 'social' | 'technical' | 'security' | 'general';
  read: boolean;
  archived: boolean;
  actionUrl?: string;
  actionText?: string;
  icon?: string;
  expiresAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata?: Record<string, any>;
  relatedEntity?: {
    type: 'user' | 'note' | 'announcement' | 'request' | 'club' | 'event';
    id: string;
  };
  recipients?: string[]; // For group notifications
  sender?: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: { 
    type: String, 
    required: true,
    index: true
  },
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  message: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  type: { 
    type: String, 
    enum: ['info', 'success', 'warning', 'error', 'request', 'approval', 'reminder', 'announcement'],
    default: 'info',
    index: true
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  category: { 
    type: String, 
    enum: ['academic', 'administrative', 'social', 'technical', 'security', 'general'],
    default: 'general',
    index: true
  },
  read: { 
    type: Boolean, 
    default: false,
    index: true
  },
  archived: { 
    type: Boolean, 
    default: false,
    index: true
  },
  actionUrl: { 
    type: String,
    trim: true
  },
  actionText: { 
    type: String,
    trim: true,
    maxlength: 50
  },
  icon: { 
    type: String,
    trim: true
  },
  expiresAt: { 
    type: Date,
    index: true
  },
  sentAt: { 
    type: Date,
    default: Date.now
  },
  deliveredAt: { 
    type: Date
  },
  readAt: { 
    type: Date
  },
  metadata: { 
    type: Schema.Types.Mixed
  },
  relatedEntity: {
    type: {
      type: String,
      enum: ['user', 'note', 'announcement', 'request', 'club', 'event']
    },
    id: String
  },
  recipients: [{ 
    type: String 
  }],
  sender: {
    id: String,
    name: String,
    role: String
  }
}, { 
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, priority: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, category: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for expired notifications

// Pre-save middleware to set deliveredAt
notificationSchema.pre('save', function(next) {
  if (this.isNew && !this.deliveredAt) {
    this.deliveredAt = new Date();
  }
  next();
});

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Instance method to archive
notificationSchema.methods.archive = function() {
  this.archived = true;
  return this.save();
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(userId: string) {
  return this.countDocuments({ 
    userId, 
    read: false, 
    archived: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

// Static method to get notifications with pagination
notificationSchema.statics.getNotifications = function(userId: string, options: {
  page?: number;
  limit?: number;
  read?: boolean;
  type?: string;
  category?: string;
  priority?: string;
  includeArchived?: boolean;
} = {}) {
  const {
    page = 1,
    limit = 20,
    read,
    type,
    category,
    priority,
    includeArchived = false
  } = options;

  const query: any = { userId };
  
  if (read !== undefined) query.read = read;
  if (type) query.type = type;
  if (category) query.category = category;
  if (priority) query.priority = priority;
  if (!includeArchived) query.archived = false;
  
  // Exclude expired notifications
  query.$or = [
    { expiresAt: { $exists: false } },
    { expiresAt: { $gt: new Date() } }
  ];

  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

export const Notification = mongoose.model<INotification>("Notification", notificationSchema);
