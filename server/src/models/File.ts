import mongoose, { Schema, Document } from 'mongoose';

// File interface
export interface IFile extends Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  thumbnailUrl?: string;
  folderId?: string;
  parentFolder?: string;
  tags: string[];
  description?: string;
  category: 'academic' | 'administrative' | 'personal' | 'shared' | 'temporary';
  type: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other';
  status: 'active' | 'archived' | 'deleted' | 'processing';
  isPublic: boolean;
  allowedRoles: string[];
  permissions: {
    owner: string;
    sharedWith: Array<{
      userId: string;
      permission: 'read' | 'write' | 'admin';
      sharedAt: Date;
      sharedBy: string;
    }>;
  };
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
    encoding?: string;
    checksum: string;
    lastModified: Date;
  };
  version: number;
  versions: Array<{
    version: number;
    filename: string;
    path: string;
    size: number;
    uploadedAt: Date;
    uploadedBy: string;
    changes: string;
  }>;
  downloads: number;
  views: number;
  lastAccessed?: Date;
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Folder interface
export interface IFolder extends Document {
  id: string;
  name: string;
  description?: string;
  parentFolder?: string;
  path: string;
  category: 'academic' | 'administrative' | 'personal' | 'shared' | 'temporary';
  isPublic: boolean;
  allowedRoles: string[];
  permissions: {
    owner: string;
    sharedWith: Array<{
      userId: string;
      permission: 'read' | 'write' | 'admin';
      sharedAt: Date;
      sharedBy: string;
    }>;
  };
  settings: {
    allowUpload: boolean;
    allowDownload: boolean;
    allowSharing: boolean;
    maxFileSize: number;
    allowedTypes: string[];
    autoArchive: boolean;
    archiveAfterDays: number;
  };
  stats: {
    totalFiles: number;
    totalSize: number;
    lastActivity: Date;
  };
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// File Schema
const FileSchema = new Schema<IFile>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  filename: {
    type: String,
    required: true,
    index: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true,
    index: true
  },
  size: {
    type: Number,
    required: true,
    index: true
  },
  path: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  folderId: {
    type: String,
    ref: 'Folder',
    index: true
  },
  parentFolder: {
    type: String,
    index: true
  },
  tags: [{
    type: String,
    index: true
  }],
  description: String,
  category: {
    type: String,
    enum: ['academic', 'administrative', 'personal', 'shared', 'temporary'],
    default: 'personal',
    index: true
  },
  type: {
    type: String,
    enum: ['document', 'image', 'video', 'audio', 'archive', 'other'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted', 'processing'],
    default: 'active',
    index: true
  },
  isPublic: {
    type: Boolean,
    default: false,
    index: true
  },
  allowedRoles: [{
    type: String,
    enum: ['student', 'teacher', 'parent', 'admin', 'hizmetli'],
    index: true
  }],
  permissions: {
    owner: {
      type: String,
      required: true,
      index: true
    },
    sharedWith: [{
      userId: {
        type: String,
        required: true,
        index: true
      },
      permission: {
        type: String,
        enum: ['read', 'write', 'admin'],
        default: 'read'
      },
      sharedAt: {
        type: Date,
        default: Date.now
      },
      sharedBy: {
        type: String,
        required: true
      }
    }]
  },
  metadata: {
    width: Number,
    height: Number,
    duration: Number,
    pages: Number,
    encoding: String,
    checksum: {
      type: String,
      required: true
    },
    lastModified: {
      type: Date,
      default: Date.now
    }
  },
  version: {
    type: Number,
    default: 1
  },
  versions: [{
    version: {
      type: Number,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: String,
      required: true
    },
    changes: String
  }],
  downloads: {
    type: Number,
    default: 0,
    index: true
  },
  views: {
    type: Number,
    default: 0,
    index: true
  },
  lastAccessed: {
    type: Date,
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  createdBy: {
    type: String,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Folder Schema
const FolderSchema = new Schema<IFolder>({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  description: String,
  parentFolder: {
    type: String,
    ref: 'Folder',
    index: true
  },
  path: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['academic', 'administrative', 'personal', 'shared', 'temporary'],
    default: 'personal',
    index: true
  },
  isPublic: {
    type: Boolean,
    default: false,
    index: true
  },
  allowedRoles: [{
    type: String,
    enum: ['student', 'teacher', 'parent', 'admin', 'hizmetli'],
    index: true
  }],
  permissions: {
    owner: {
      type: String,
      required: true,
      index: true
    },
    sharedWith: [{
      userId: {
        type: String,
        required: true,
        index: true
      },
      permission: {
        type: String,
        enum: ['read', 'write', 'admin'],
        default: 'read'
      },
      sharedAt: {
        type: Date,
        default: Date.now
      },
      sharedBy: {
        type: String,
        required: true
      }
    }]
  },
  settings: {
    allowUpload: {
      type: Boolean,
      default: true
    },
    allowDownload: {
      type: Boolean,
      default: true
    },
    allowSharing: {
      type: Boolean,
      default: true
    },
    maxFileSize: {
      type: Number,
      default: 50 * 1024 * 1024 // 50MB
    },
    allowedTypes: [String],
    autoArchive: {
      type: Boolean,
      default: false
    },
    archiveAfterDays: {
      type: Number,
      default: 365
    }
  },
  stats: {
    totalFiles: {
      type: Number,
      default: 0
    },
    totalSize: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: String,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
FileSchema.index({ folderId: 1, createdAt: -1 });
FileSchema.index({ createdBy: 1, category: 1 });
FileSchema.index({ 'permissions.sharedWith.userId': 1 });
FileSchema.index({ tags: 1, status: 1 });
FileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

FolderSchema.index({ parentFolder: 1, name: 1 });
FolderSchema.index({ createdBy: 1, category: 1 });
FolderSchema.index({ 'permissions.sharedWith.userId': 1 });
FolderSchema.index({ path: 1 });

// Instance methods
FileSchema.methods = {
  // Check if user has permission to access file
  hasPermission(userId: string, permission: 'read' | 'write' | 'admin' = 'read'): boolean {
    if (this.permissions.owner === userId) return true;
    
    const sharedPermission = this.permissions.sharedWith.find(
      share => share.userId === userId
    );
    
    if (!sharedPermission) return false;
    
    const permissionLevels = { read: 1, write: 2, admin: 3 };
    const requiredLevel = permissionLevels[permission];
    const userLevel = permissionLevels[sharedPermission.permission];
    
    return userLevel >= requiredLevel;
  },

  // Increment download count
  incrementDownload(): void {
    this.downloads += 1;
    this.lastAccessed = new Date();
  },

  // Increment view count
  incrementView(): void {
    this.views += 1;
    this.lastAccessed = new Date();
  },

  // Create new version
  createVersion(uploadedBy: string, changes: string): void {
    this.versions.push({
      version: this.version + 1,
      filename: this.filename,
      path: this.path,
      size: this.size,
      uploadedAt: new Date(),
      uploadedBy,
      changes
    });
    this.version += 1;
  }
};

FolderSchema.methods = {
  // Check if user has permission to access folder
  hasPermission(userId: string, permission: 'read' | 'write' | 'admin' = 'read'): boolean {
    if (this.permissions.owner === userId) return true;
    
    const sharedPermission = this.permissions.sharedWith.find(
      share => share.userId === userId
    );
    
    if (!sharedPermission) return false;
    
    const permissionLevels = { read: 1, write: 2, admin: 3 };
    const requiredLevel = permissionLevels[permission];
    const userLevel = permissionLevels[sharedPermission.permission];
    
    return userLevel >= requiredLevel;
  },

  // Update folder statistics
  async updateStats(): Promise<void> {
    const File = mongoose.model('File');
    const files = await File.find({ folderId: this.id, status: 'active' });
    
    this.stats.totalFiles = files.length;
    this.stats.totalSize = files.reduce((sum, file) => sum + file.size, 0);
    this.stats.lastActivity = new Date();
  }
};

// Static methods
FileSchema.statics = {
  // Get files by user with permissions
  async getFilesByUser(userId: string, filters: any = {}): Promise<IFile[]> {
    const query = {
      $or: [
        { 'permissions.owner': userId },
        { 'permissions.sharedWith.userId': userId },
        { isPublic: true }
      ],
      status: 'active',
      ...filters
    };
    
    return this.find(query).sort({ createdAt: -1 });
  },

  // Get folder contents
  async getFolderContents(folderId: string, userId: string): Promise<{ files: IFile[], folders: IFolder[] }> {
    const Folder = mongoose.model('Folder');
    
    const files = await this.find({ folderId, status: 'active' }).sort({ name: 1 });
    const folders = await Folder.find({ parentFolder: folderId, isActive: true }).sort({ name: 1 });
    
    // Filter by permissions
    const accessibleFiles = files.filter(file => file.hasPermission(userId));
    const accessibleFolders = folders.filter(folder => folder.hasPermission(userId));
    
    return { files: accessibleFiles, folders: accessibleFolders };
  }
};

FolderSchema.statics = {
  // Get folders by user with permissions
  async getFoldersByUser(userId: string, filters: any = {}): Promise<IFolder[]> {
    const query = {
      $or: [
        { 'permissions.owner': userId },
        { 'permissions.sharedWith.userId': userId },
        { isPublic: true }
      ],
      isActive: true,
      ...filters
    };
    
    return this.find(query).sort({ name: 1 });
  },

  // Get folder tree
  async getFolderTree(userId: string, rootFolderId?: string): Promise<any[]> {
    const buildTree = async (parentId?: string): Promise<any[]> => {
      const folders = await this.find({
        parentFolder: parentId,
        $or: [
          { 'permissions.owner': userId },
          { 'permissions.sharedWith.userId': userId },
          { isPublic: true }
        ],
        isActive: true
      }).sort({ name: 1 });
      
      const tree = [];
      for (const folder of folders) {
        const children = await buildTree(folder.id);
        tree.push({
          ...folder.toObject(),
          children
        });
      }
      
      return tree;
    };
    
    return buildTree(rootFolderId);
  }
};

export const File = mongoose.model<IFile>('File', FileSchema);
export const Folder = mongoose.model<IFolder>('Folder', FolderSchema);
