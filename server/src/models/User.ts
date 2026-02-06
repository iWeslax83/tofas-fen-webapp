import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  id: string;
  adSoyad: string;
  tckn?: string; // T.C. Kimlik No - şifre olarak kullanılacak
  sifre?: string; // Deprecated - artık TCKN kullanılacak, geriye dönük uyumluluk için bırakıldı
  rol: 'student' | 'teacher' | 'parent' | 'admin' | 'hizmetli';
  sinif?: string;
  sube?: string;
  oda?: string;
  email?: string;
  emailVerified: boolean;
  parentId?: string;
  pansiyon: boolean;
  childId: string[];
  tokenVersion: number;
  resetToken?: string;
  resetTokenExpiry?: Date;
  forgotPasswordToken?: string;
  forgotPasswordExpires?: Date;
  lastLogin?: Date;
  loginCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true // Primary lookup field
  },
  adSoyad: {
    type: String,
    required: true,
    index: true // For name-based searches
  },
  tckn: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple null values
    index: true,
    validate: {
      validator: function (v: string) {
        if (!v) return true; // TCKN optional for now (will be required later)
        // TCKN validation: 11 digits
        return /^\d{11}$/.test(v);
      },
      message: 'TCKN 11 haneli olmalıdır'
    }
  },
  sifre: {
    type: String,
    // Deprecated - artık TCKN kullanılacak, geriye dönük uyumluluk için bırakıldı
    // Şifre validasyonu kaldırıldı
  },
  rol: {
    type: String,
    enum: ['student', 'teacher', 'parent', 'admin', 'hizmetli'],
    required: true,
    index: true // For role-based queries
  },
  sinif: {
    type: String,
    enum: ['9', '10', '11', '12'],
    index: true // For class-based queries
  },
  sube: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E', 'F'],
    index: true // For section-based queries
  },
  oda: {
    type: String,
    index: true // For room-based queries
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple null values
    index: true, // For email-based lookups
    validate: {
      validator: function (v: string) {
        if (!v) return true; // Email optional
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Geçerli bir email adresi giriniz'
    }
  },
  emailVerified: {
    type: Boolean,
    default: false,
    index: true // For verification status queries
  },
  parentId: {
    type: String,
    index: true // For parent-child relationship queries
  },
  pansiyon: {
    type: Boolean,
    default: false,
    index: true // For dormitory-related queries
  },
  childId: [{
    type: String,
    index: true // For parent-child relationship queries
  }],
  tokenVersion: {
    type: Number,
    default: 0,
    index: true // For token invalidation
  },
  resetToken: String,
  resetTokenExpiry: {
    type: Date,
  },
  forgotPasswordToken: String,
  forgotPasswordExpires: {
    type: Date,
  },
  lastLogin: {
    type: Date,
    index: true // For user activity tracking
  },
  loginCount: {
    type: Number,
    default: 0,
    index: true // For user engagement metrics
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true // For active user queries
  }
}, {
  timestamps: true
});

// Essential compound indexes for common query patterns
UserSchema.index({ rol: 1, isActive: 1 }); // Most common query pattern
UserSchema.index({ rol: 1, sinif: 1, sube: 1 }); // Class and section queries
UserSchema.index({ rol: 1, pansiyon: 1, isActive: 1 }); // Dormitory queries
UserSchema.index({ parentId: 1, isActive: 1 }); // Parent-child relationship queries
UserSchema.index({ email: 1, isActive: 1 }); // Email-based lookups
UserSchema.index({ oda: 1, isActive: 1 }); // Room-based queries
UserSchema.index({ lastLogin: -1, isActive: 1 }); // Recent activity queries
UserSchema.index({ createdAt: -1, isActive: 1 }); // New user queries
UserSchema.index({ tokenVersion: 1, isActive: 1 }); // Token invalidation queries
UserSchema.index({ resetToken: 1, resetTokenExpiry: 1 }); // Password reset queries
UserSchema.index({ forgotPasswordToken: 1, forgotPasswordExpires: 1 }); // Forgot password queries

// Text search index for name searches

// Sparse indexes for optional fields
UserSchema.index({ parentId: 1, rol: 1 }); // For parent-child queries

// Text index for full-text search
UserSchema.index({
  adSoyad: 'text',
  email: 'text'
}, {
  weights: {
    adSoyad: 10, // Name has higher weight
    email: 5
  },
  name: 'user_text_search'
});

// TTL index for automatic cleanup of expired tokens
UserSchema.index({ resetTokenExpiry: 1 }, { expireAfterSeconds: 0 });
UserSchema.index({ forgotPasswordExpires: 1 }, { expireAfterSeconds: 0 });

// Removed partial indexes - they're covered by compound indexes above

// Virtual for full name with proper formatting
UserSchema.virtual('fullName').get(function (this: IUser) {
  return this.adSoyad;
});

// Virtual for display name
UserSchema.virtual('displayName').get(function (this: IUser) {
  if (this.rol === 'student') {
    return `${this.adSoyad} (${this.sinif}${this.sube})`;
  }
  return this.adSoyad;
});

// Virtual for user status
UserSchema.virtual('status').get(function (this: IUser) {
  if (!this.isActive) return 'inactive';
  if (this.rol === 'student' && this.pansiyon) return 'dormitory';
  if (this.rol === 'parent' && this.childId.length > 0) return 'parent';
  return 'active';
});

// Instance methods
UserSchema.methods.incrementLoginCount = function () {
  this.loginCount += 1;
  this.lastLogin = new Date();
  return this.save();
};

UserSchema.methods.isTokenValid = function (version: number) {
  return this.tokenVersion === version;
};

UserSchema.methods.invalidateTokens = function () {
  this.tokenVersion += 1;
  return this.save();
};

// Static methods for common queries
UserSchema.statics.findByRole = function (role: string) {
  return this.find({ rol: role, isActive: true });
};

UserSchema.statics.findStudentsByClass = function (sinif: string, sube?: string) {
  const query: any = { rol: 'student', sinif, isActive: true };
  if (sube) query.sube = sube;
  return this.find(query);
};

UserSchema.statics.findParentsByStudent = function (studentId: string) {
  return this.find({
    childId: studentId,
    rol: 'parent',
    isActive: true
  });
};

UserSchema.statics.findStudentsByParent = function (parentId: string) {
  return this.find({
    parentId,
    rol: 'student',
    isActive: true
  });
};

UserSchema.statics.findDormitoryStudents = function () {
  return this.find({
    rol: 'student',
    pansiyon: true,
    isActive: true
  });
};

// Query middleware for performance optimization - REMOVED
// Bu middleware şifre alanını otomatik çıkarıyordu, login için kaldırıldı

// Aggregation pipeline helpers
UserSchema.statics.getUserStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: '$rol',
        count: { $sum: 1 },
        activeCount: {
          $sum: { $cond: ['$isActive', 1, 0] }
        },
        avgLoginCount: { $avg: '$loginCount' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

UserSchema.statics.getClassDistribution = function () {
  return this.aggregate([
    {
      $match: {
        rol: 'student',
        sinif: { $exists: true }
      }
    },
    {
      $group: {
        _id: { sinif: '$sinif', sube: '$sube' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.sinif': 1, '_id.sube': 1 }
    }
  ]);
};

// Ensure indexes are created
UserSchema.on('index', function (error) {
  if (error) {
    console.error('User index creation error:', error);
  } else {
    console.log('✅ User indexes created successfully');
  }
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
