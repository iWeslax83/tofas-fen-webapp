import { Request } from 'express';
import { File, Folder, IFile, IFolder } from '../models/File';
import { User } from '../models/User';
import { NotificationService } from './NotificationService';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

export interface FileUploadData {
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  folderId?: string;
  tags?: string[];
  description?: string;
  category?: string;
  isPublic?: boolean;
  allowedRoles?: string[];
}

export interface FolderCreateData {
  name: string;
  description?: string;
  parentFolder?: string;
  category?: string;
  isPublic?: boolean;
  allowedRoles?: string[];
  settings?: {
    allowUpload?: boolean;
    allowDownload?: boolean;
    allowSharing?: boolean;
    maxFileSize?: number;
    allowedTypes?: string[];
    autoArchive?: boolean;
    archiveAfterDays?: number;
  };
}

export interface FileFilters {
  category?: string;
  type?: string;
  tags?: string[];
  sizeMin?: number;
  sizeMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface FolderFilters {
  category?: string;
  parentFolder?: string;
  search?: string;
}

export class FileService {
  private static readonly UPLOAD_DIR = 'uploads';
  private static readonly THUMBNAIL_DIR = 'thumbnails';
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private static readonly ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ];

  // Initialize upload directories
  static async initializeDirectories(): Promise<void> {
    const dirs = [this.UPLOAD_DIR, this.THUMBNAIL_DIR];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  // Generate unique file ID
  static generateFileId(): string {
    return `file_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  // Generate unique folder ID
  static generateFolderId(): string {
    return `folder_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  // Calculate file checksum
  static calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  // Determine file type from MIME type
  static getFileType(mimeType: string): string {
    if (this.ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
    if (this.ALLOWED_DOCUMENT_TYPES.includes(mimeType)) return 'document';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'archive';
    return 'other';
  }

  // Create thumbnail for image files
  static async createThumbnail(buffer: Buffer, filename: string): Promise<string | null> {
    try {
      const thumbnailPath = path.join(this.THUMBNAIL_DIR, `thumb_${filename}`);
      
      await sharp(buffer as any)
        .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      
      return thumbnailPath;
    } catch (error) {
      console.error('Thumbnail creation failed:', error);
      return null;
    }
  }

  // Upload file
  static async uploadFile(uploadData: FileUploadData, userId: string): Promise<IFile> {
    const { originalName, mimeType, size, buffer, folderId, tags, description, category, isPublic, allowedRoles } = uploadData;

    // Validate file size
    if (size > this.MAX_FILE_SIZE) {
      throw new Error('Dosya boyutu çok büyük');
    }

    // Validate file type
    const fileType = this.getFileType(mimeType);
    if (fileType === 'other') {
      throw new Error('Desteklenmeyen dosya türü');
    }

    // Check folder permissions if specified
    if (folderId) {
      const folder: any = await Folder.findOne({ id: folderId });
      if (!folder || !folder.hasPermission(userId, 'write')) {
        throw new Error('Klasöre yazma izniniz yok');
      }
    }

    // Generate file ID and filename
    const fileId = this.generateFileId();
    const fileExtension = path.extname(originalName);
    const filename = `${fileId}${fileExtension}`;
    const filePath = path.join(this.UPLOAD_DIR, filename);

    // Save file to disk
    fs.writeFileSync(filePath, buffer);

    // Create thumbnail for images
    let thumbnailUrl: string | undefined;
    if (fileType === 'image') {
      const thumbnailPath = await this.createThumbnail(buffer, filename);
      if (thumbnailPath) {
        thumbnailUrl = `/thumbnails/${path.basename(thumbnailPath)}`;
      }
    }

    // Calculate checksum
    const checksum = this.calculateChecksum(buffer);

    // Create file record
    const file = new File({
      id: fileId,
      filename,
      originalName,
      mimeType,
      size,
      path: filePath,
      url: `/uploads/${filename}`,
      thumbnailUrl,
      folderId,
      parentFolder: folderId,
      tags: tags || [],
      description,
      category: category || 'personal',
      type: fileType,
      isPublic: isPublic || false,
      allowedRoles: allowedRoles || [],
      permissions: {
        owner: userId,
        sharedWith: []
      },
      metadata: {
        checksum,
        lastModified: new Date()
      },
      createdBy: userId
    });

    await file.save();

    // Update folder stats if file is in a folder
    if (folderId) {
      const folder: any = await Folder.findOne({ id: folderId });
      if (folder) {
        await folder.updateStats();
        await folder.save();
      }
    }

    // Send notification to shared users
    if (allowedRoles && allowedRoles.length > 0) {
      await this.notifySharedUsers(file, allowedRoles);
    }

    return file;
  }

  // Get files by user
  static async getFilesByUser(userId: string, filters: FileFilters = {}, page: number = 1, limit: number = 20): Promise<{ files: IFile[], total: number, page: number, totalPages: number }> {
    const query: any = {
      $or: [
        { 'permissions.owner': userId },
        { 'permissions.sharedWith.userId': userId },
        { isPublic: true }
      ],
      status: 'active'
    };

    // Apply filters
    if (filters.category) query.category = filters.category;
    if (filters.type) query.type = filters.type;
    if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };
    if (filters.sizeMin || filters.sizeMax) {
      query.size = {};
      if (filters.sizeMin) query.size.$gte = filters.sizeMin;
      if (filters.sizeMax) query.size.$lte = filters.sizeMax;
    }
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
    }
    if (filters.search) {
      query.$or = [
        { originalName: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { tags: { $in: [new RegExp(filters.search, 'i')] } }
      ];
    }

    const total = await File.countDocuments(query);
    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      files,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Get file by ID
  static async getFileById(fileId: string, userId: string): Promise<IFile | null> {
    const file = await File.findOne({ id: fileId, status: 'active' });
    
    if (!file) return null;
    
    if (!(file as any).hasPermission(userId)) {
      throw new Error('Bu dosyaya erişim izniniz yok');
    }

    // Increment view count
    (file as any).incrementView();
    await (file as any).save();

    return file;
  }

  // Download file
  static async downloadFile(fileId: string, userId: string): Promise<{ file: IFile, filePath: string }> {
    const file = await this.getFileById(fileId, userId);
    
    if (!file) {
      throw new Error('Dosya bulunamadı');
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.path)) {
      throw new Error('Dosya disk üzerinde bulunamadı');
    }

    // Increment download count
    (file as any).incrementDownload();
    await (file as any).save();

    return { file, filePath: file.path };
  }

  // Update file
  static async updateFile(fileId: string, userId: string, updates: any): Promise<IFile> {
    const file = await File.findOne({ id: fileId, status: 'active' });
    
    if (!file) {
      throw new Error('Dosya bulunamadı');
    }

    if (!(file as any).hasPermission(userId, 'write')) {
      throw new Error('Bu dosyayı düzenleme izniniz yok');
    }

    // Update allowed fields
    const allowedFields = ['description', 'tags', 'category', 'isPublic', 'allowedRoles'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        (file as any)[field] = updates[field];
      }
    }

    file.updatedAt = new Date();
    await file.save();

    return file;
  }

  // Delete file
  static async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await File.findOne({ id: fileId, status: 'active' });
    
    if (!file) {
      throw new Error('Dosya bulunamadı');
    }

    if (!(file as any).hasPermission(userId, 'admin')) {
      throw new Error('Bu dosyayı silme izniniz yok');
    }

    // Soft delete
    file.status = 'deleted';
    file.updatedAt = new Date();
    await file.save();

    // TODO: Schedule physical file deletion after a period
  }

  // Share file
  static async shareFile(fileId: string, userId: string, shareData: { userId: string, permission: 'read' | 'write' | 'admin' }): Promise<IFile> {
    const file = await File.findOne({ id: fileId, status: 'active' });
    
    if (!file) {
      throw new Error('Dosya bulunamadı');
    }

    if (!(file as any).hasPermission(userId, 'admin')) {
      throw new Error('Bu dosyayı paylaşma izniniz yok');
    }

    // Check if user exists
    const targetUser = await User.findOne({ id: shareData.userId });
    if (!targetUser) {
      throw new Error('Kullanıcı bulunamadı');
    }

    // Check if already shared
    const existingShare = file.permissions.sharedWith.find(
      share => share.userId === shareData.userId
    );

    if (existingShare) {
      existingShare.permission = shareData.permission;
      existingShare.sharedAt = new Date();
      existingShare.sharedBy = userId;
    } else {
      file.permissions.sharedWith.push({
        userId: shareData.userId,
        permission: shareData.permission,
        sharedAt: new Date(),
        sharedBy: userId
      });
    }

    await file.save();

    // Send notification
    await NotificationService.createNotification({
      title: 'Dosya Paylaşıldı',
      message: `${file.originalName} dosyası sizinle paylaşıldı`,
      type: 'announcement',
      priority: 'medium',
      recipients: [shareData.userId],
      sender: { id: userId, name: 'Files', role: 'system' },
      actionUrl: `/files/${fileId}`
    } as any);

    return file;
  }

  // Create folder
  static async createFolder(folderData: FolderCreateData, userId: string): Promise<IFolder> {
    const { name, description, parentFolder, category, isPublic, allowedRoles, settings } = folderData;

    // Check parent folder permissions if specified
    if (parentFolder) {
      const parent: any = await Folder.findOne({ id: parentFolder });
      if (!parent || !parent.hasPermission(userId, 'write')) {
        throw new Error('Üst klasöre yazma izniniz yok');
      }
    }

    // Generate folder path
    let folderPath = name;
    if (parentFolder) {
      const parent = await Folder.findOne({ id: parentFolder });
      if (parent) {
        folderPath = `${parent.path}/${name}`;
      }
    }

    // Check if folder with same name exists in parent
    const existingFolder = await Folder.findOne({
      parentFolder,
      name,
      isActive: true
    });

    if (existingFolder) {
      throw new Error('Bu isimde bir klasör zaten mevcut');
    }

    const folder = new Folder({
      id: this.generateFolderId(),
      name,
      description,
      parentFolder,
      path: folderPath,
      category: category || 'personal',
      isPublic: isPublic || false,
      allowedRoles: allowedRoles || [],
      permissions: {
        owner: userId,
        sharedWith: []
      },
      settings: {
        allowUpload: settings?.allowUpload ?? true,
        allowDownload: settings?.allowDownload ?? true,
        allowSharing: settings?.allowSharing ?? true,
        maxFileSize: settings?.maxFileSize ?? 50 * 1024 * 1024,
        allowedTypes: settings?.allowedTypes ?? [],
        autoArchive: settings?.autoArchive ?? false,
        archiveAfterDays: settings?.archiveAfterDays ?? 365
      },
      createdBy: userId
    });

    await folder.save();

    return folder;
  }

  // Get folders by user
  static async getFoldersByUser(userId: string, filters: FolderFilters = {}): Promise<IFolder[]> {
    const query: any = {
      $or: [
        { 'permissions.owner': userId },
        { 'permissions.sharedWith.userId': userId },
        { isPublic: true }
      ],
      isActive: true
    };

    if (filters.category) query.category = filters.category;
    if (filters.parentFolder) query.parentFolder = filters.parentFolder;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    return Folder.find(query).sort({ name: 1 });
  }

  // Get folder contents
  static async getFolderContents(folderId: string, userId: string): Promise<{ files: IFile[], folders: IFolder[] }> {
    const folder: any = await Folder.findOne({ id: folderId, isActive: true });
    
    if (!folder) {
      throw new Error('Klasör bulunamadı');
    }

    if (!folder.hasPermission(userId)) {
      throw new Error('Bu klasöre erişim izniniz yok');
    }

    return (File as any).getFolderContents(folderId, userId);
  }

  // Get folder tree
  static async getFolderTree(userId: string, rootFolderId?: string): Promise<any[]> {
    return (Folder as any).getFolderTree(userId, rootFolderId);
  }

  // Update folder
  static async updateFolder(folderId: string, userId: string, updates: any): Promise<IFolder> {
    const folder = await Folder.findOne({ id: folderId, isActive: true });
    
    if (!folder) {
      throw new Error('Klasör bulunamadı');
    }

    if (!(folder as any).hasPermission(userId, 'write')) {
      throw new Error('Bu klasörü düzenleme izniniz yok');
    }

    // Update allowed fields
    const allowedFields = ['name', 'description', 'category', 'isPublic', 'allowedRoles', 'settings'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        (folder as any)[field] = updates[field];
      }
    }

    folder.updatedAt = new Date();
    await folder.save();

    return folder;
  }

  // Delete folder
  static async deleteFolder(folderId: string, userId: string): Promise<void> {
    const folder = await Folder.findOne({ id: folderId, isActive: true });
    
    if (!folder) {
      throw new Error('Klasör bulunamadı');
    }

    if (!(folder as any).hasPermission(userId, 'admin')) {
      throw new Error('Bu klasörü silme izniniz yok');
    }

    // Check if folder has contents
    const contents = await this.getFolderContents(folderId, userId);
    if (contents.files.length > 0 || contents.folders.length > 0) {
      throw new Error('Klasör boş değil. Önce içeriğini silin.');
    }

    // Soft delete
    folder.isActive = false;
    folder.updatedAt = new Date();
    await folder.save();
  }

  // Share folder
  static async shareFolder(folderId: string, userId: string, shareData: { userId: string, permission: 'read' | 'write' | 'admin' }): Promise<IFolder> {
    const folder = await Folder.findOne({ id: folderId, isActive: true });
    
    if (!folder) {
      throw new Error('Klasör bulunamadı');
    }

    if (!(folder as any).hasPermission(userId, 'admin')) {
      throw new Error('Bu klasörü paylaşma izniniz yok');
    }

    // Check if user exists
    const targetUser = await User.findOne({ id: shareData.userId });
    if (!targetUser) {
      throw new Error('Kullanıcı bulunamadı');
    }

    // Check if already shared
    const existingShare = folder.permissions.sharedWith.find(
      share => share.userId === shareData.userId
    );

    if (existingShare) {
      existingShare.permission = shareData.permission;
      existingShare.sharedAt = new Date();
      existingShare.sharedBy = userId;
    } else {
      folder.permissions.sharedWith.push({
        userId: shareData.userId,
        permission: shareData.permission,
        sharedAt: new Date(),
        sharedBy: userId
      });
    }

    await folder.save();

    // Send notification
    await NotificationService.createNotification({
      title: 'Klasör Paylaşıldı',
      message: `${folder.name} klasörü sizinle paylaşıldı`,
      type: 'announcement',
      priority: 'medium',
      recipients: [shareData.userId],
      sender: { id: userId, name: 'Files', role: 'system' },
      actionUrl: `/folders/${folderId}`
    } as any);

    return folder;
  }

  // Get file statistics
  static async getFileStats(userId: string): Promise<any> {
    const stats = await File.aggregate([
      {
        $match: {
          $or: [
            { 'permissions.owner': userId },
            { 'permissions.sharedWith.userId': userId },
            { isPublic: true }
          ],
          status: 'active'
        }
      },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
          totalDownloads: { $sum: '$downloads' },
          totalViews: { $sum: '$views' },
          byType: {
            $push: {
              type: '$type',
              size: '$size'
            }
          },
          byCategory: {
            $push: {
              category: '$category',
              size: '$size'
            }
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        totalDownloads: 0,
        totalViews: 0,
        byType: {},
        byCategory: {}
      };
    }

    const stat = stats[0];
    
    // Process by type
    const byType: any = {};
    stat.byType.forEach((item: any) => {
      if (!byType[item.type]) {
        byType[item.type] = { count: 0, size: 0 };
      }
      byType[item.type].count++;
      byType[item.type].size += item.size;
    });

    // Process by category
    const byCategory: any = {};
    stat.byCategory.forEach((item: any) => {
      if (!byCategory[item.category]) {
        byCategory[item.category] = { count: 0, size: 0 };
      }
      byCategory[item.category].count++;
      byCategory[item.category].size += item.size;
    });

    return {
      totalFiles: stat.totalFiles,
      totalSize: stat.totalSize,
      totalDownloads: stat.totalDownloads,
      totalViews: stat.totalViews,
      byType,
      byCategory
    };
  }

  // Search files and folders
  static async search(userId: string, query: string, type: 'all' | 'files' | 'folders' = 'all'): Promise<{ files: IFile[], folders: IFolder[] }> {
    const searchRegex = new RegExp(query, 'i');
    const results = { files: [], folders: [] };

    if (type === 'all' || type === 'files') {
      const files: any[] = await File.find({
        $and: [
          {
            $or: [
              { 'permissions.owner': userId },
              { 'permissions.sharedWith.userId': userId },
              { isPublic: true }
            ]
          },
          {
            $or: [
              { originalName: searchRegex },
              { description: searchRegex },
              { tags: searchRegex }
            ]
          },
          { status: 'active' }
        ]
      }).sort({ createdAt: -1 });

      results.files = files.filter((file: any) => file.hasPermission(userId));
    }

    if (type === 'all' || type === 'folders') {
      const folders: any[] = await Folder.find({
        $and: [
          {
            $or: [
              { 'permissions.owner': userId },
              { 'permissions.sharedWith.userId': userId },
              { isPublic: true }
            ]
          },
          {
            $or: [
              { name: searchRegex },
              { description: searchRegex }
            ]
          },
          { isActive: true }
        ]
      }).sort({ name: 1 });

      results.folders = folders.filter((folder: any) => folder.hasPermission(userId));
    }

    return results;
  }

  // Notify shared users
  private static async notifySharedUsers(file: IFile, allowedRoles: string[]): Promise<void> {
    try {
      const users = await User.find({ rol: { $in: allowedRoles } });
      
      for (const user of users) {
        if (user.id !== file.createdBy) {
          await NotificationService.createNotification({
            title: 'Yeni Dosya',
            message: `${file.originalName} dosyası yüklendi`,
            type: 'announcement',
            priority: 'low',
            recipients: [user.id],
            sender: { id: file.createdBy, name: 'Files', role: 'system' },
            actionUrl: `/files/${file.id}`
          } as any);
        }
      }
    } catch (error) {
      console.error('Error notifying shared users:', error);
    }
  }
}
