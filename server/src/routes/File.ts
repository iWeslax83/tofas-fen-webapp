import express from 'express';
import multer from 'multer';
import { body, query, param, validationResult } from 'express-validator';
import { FileService } from '../services/FileService';
import { requireAuth, requireRole } from '../middleware/auth';
import { User } from '../models/User';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10 // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedMimes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/x-tar',
      // Audio/Video
      'audio/mpeg', 'audio/wav', 'video/mp4', 'video/avi', 'video/mov'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Desteklenmeyen dosya türü'));
    }
  }
});

// Initialize directories on startup
FileService.initializeDirectories();

// Validation middleware
const validateFileCreate = [
  body('folderId').optional().isString(),
  body('tags').optional().isArray(),
  body('description').optional().isString().trim(),
  body('category').optional().isIn(['academic', 'administrative', 'personal', 'shared', 'temporary']),
  body('isPublic').optional().isBoolean(),
  body('allowedRoles').optional().isArray()
];

const validateFolderCreate = [
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().trim().isLength({ max: 500 }),
  body('parentFolder').optional().isString(),
  body('category').optional().isIn(['academic', 'administrative', 'personal', 'shared', 'temporary']),
  body('isPublic').optional().isBoolean(),
  body('allowedRoles').optional().isArray(),
  body('settings.allowUpload').optional().isBoolean(),
  body('settings.allowDownload').optional().isBoolean(),
  body('settings.allowSharing').optional().isBoolean(),
  body('settings.maxFileSize').optional().isNumeric(),
  body('settings.allowedTypes').optional().isArray(),
  body('settings.autoArchive').optional().isBoolean(),
  body('settings.archiveAfterDays').optional().isNumeric()
];

const validateFileUpdate = [
  body('description').optional().isString().trim(),
  body('tags').optional().isArray(),
  body('category').optional().isIn(['academic', 'administrative', 'personal', 'shared', 'temporary']),
  body('isPublic').optional().isBoolean(),
  body('allowedRoles').optional().isArray()
];

const validateFolderUpdate = [
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().isString().trim().isLength({ max: 500 }),
  body('category').optional().isIn(['academic', 'administrative', 'personal', 'shared', 'temporary']),
  body('isPublic').optional().isBoolean(),
  body('allowedRoles').optional().isArray(),
  body('settings').optional().isObject()
];

const validateShare = [
  body('userId').isString(),
  body('permission').isIn(['read', 'write', 'admin'])
];

// File routes
// GET /api/files - Get user's files with pagination and filters
router.get('/', requireAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isIn(['academic', 'administrative', 'personal', 'shared', 'temporary']),
  query('type').optional().isIn(['document', 'image', 'video', 'audio', 'archive', 'other']),
  query('tags').optional().isString(),
  query('sizeMin').optional().isNumeric(),
  query('sizeMax').optional().isNumeric(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('search').optional().isString().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const filters: any = {};
    if (req.query.category) filters.category = req.query.category;
    if (req.query.type) filters.type = req.query.type;
    if (req.query.tags) filters.tags = (req.query.tags as string).split(',');
    if (req.query.sizeMin) filters.sizeMin = parseInt(req.query.sizeMin as string);
    if (req.query.sizeMax) filters.sizeMax = parseInt(req.query.sizeMax as string);
    if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
    if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);
    if (req.query.search) filters.search = req.query.search;

    const result = await FileService.getFilesByUser(user.id, filters, page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Dosyalar alınırken hata oluştu' 
    });
  }
});

// POST /api/files - Upload new file
router.post('/', requireAuth, upload.single('file'), validateFileCreate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dosya yüklenmedi' 
      });
    }

    const user = (req as any).user;
    const uploadData = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer,
      folderId: req.body.folderId,
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      description: req.body.description,
      category: req.body.category,
      isPublic: req.body.isPublic === 'true',
      allowedRoles: req.body.allowedRoles ? JSON.parse(req.body.allowedRoles) : []
    };

    const file = await FileService.uploadFile(uploadData, user.id);
    
    res.status(201).json({
      success: true,
      data: file
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Dosya yüklenirken hata oluştu' 
    });
  }
});

// GET /api/files/:id - Get file by ID
router.get('/:id', requireAuth, [
  param('id').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    const file = await FileService.getFileById(req.params.id, user.id);
    
    if (!file) {
      return res.status(404).json({ 
        success: false, 
        error: 'Dosya bulunamadı' 
      });
    }

    res.json({
      success: true,
      data: file
    });
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Dosya alınırken hata oluştu' 
    });
  }
});

// GET /api/files/:id/download - Download file
router.get('/:id/download', requireAuth, [
  param('id').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    const { file, filePath } = await FileService.downloadFile(req.params.id, user.id);
    
    res.download(filePath, file.originalName, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ 
          success: false, 
          error: 'Dosya indirilirken hata oluştu' 
        });
      }
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Dosya indirilirken hata oluştu' 
    });
  }
});

// PUT /api/files/:id - Update file
router.put('/:id', requireAuth, [
  param('id').isString()
], validateFileUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    const file = await FileService.updateFile(req.params.id, user.id, req.body);
    
    res.json({
      success: true,
      data: file
    });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Dosya güncellenirken hata oluştu' 
    });
  }
});

// DELETE /api/files/:id - Delete file
router.delete('/:id', requireAuth, [
  param('id').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    await FileService.deleteFile(req.params.id, user.id);
    
    res.json({
      success: true,
      message: 'Dosya başarıyla silindi'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Dosya silinirken hata oluştu' 
    });
  }
});

// POST /api/files/:id/share - Share file
router.post('/:id/share', requireAuth, [
  param('id').isString()
], validateShare, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    const file = await FileService.shareFile(req.params.id, user.id, {
      userId: req.body.userId,
      permission: req.body.permission
    });
    
    res.json({
      success: true,
      data: file
    });
  } catch (error) {
    console.error('Error sharing file:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Dosya paylaşılırken hata oluştu' 
    });
  }
});

// Folder routes
// GET /api/folders - Get user's folders
router.get('/folders', requireAuth, [
  query('category').optional().isIn(['academic', 'administrative', 'personal', 'shared', 'temporary']),
  query('parentFolder').optional().isString(),
  query('search').optional().isString().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    const filters: any = {};
    if (req.query.category) filters.category = req.query.category;
    if (req.query.parentFolder) filters.parentFolder = req.query.parentFolder;
    if (req.query.search) filters.search = req.query.search;

    const folders = await FileService.getFoldersByUser(user.id, filters);
    
    res.json({
      success: true,
      data: folders
    });
  } catch (error) {
    console.error('Error getting folders:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Klasörler alınırken hata oluştu' 
    });
  }
});

// POST /api/folders - Create new folder
router.post('/folders', requireAuth, validateFolderCreate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    const folder = await FileService.createFolder(req.body, user.id);
    
    res.status(201).json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Klasör oluşturulurken hata oluştu' 
    });
  }
});

// GET /api/folders/:id - Get folder by ID
router.get('/folders/:id', requireAuth, [
  param('id').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    const folder = await FileService.getFolderContents(req.params.id, user.id);
    
    res.json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('Error getting folder:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Klasör alınırken hata oluştu' 
    });
  }
});

// PUT /api/folders/:id - Update folder
router.put('/folders/:id', requireAuth, [
  param('id').isString()
], validateFolderUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    const folder = await FileService.updateFolder(req.params.id, user.id, req.body);
    
    res.json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Klasör güncellenirken hata oluştu' 
    });
  }
});

// DELETE /api/folders/:id - Delete folder
router.delete('/folders/:id', requireAuth, [
  param('id').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    await FileService.deleteFolder(req.params.id, user.id);
    
    res.json({
      success: true,
      message: 'Klasör başarıyla silindi'
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Klasör silinirken hata oluştu' 
    });
  }
});

// POST /api/folders/:id/share - Share folder
router.post('/folders/:id/share', requireAuth, [
  param('id').isString()
], validateShare, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    const folder = await FileService.shareFolder(req.params.id, user.id, {
      userId: req.body.userId,
      permission: req.body.permission
    });
    
    res.json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('Error sharing folder:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Klasör paylaşılırken hata oluştu' 
    });
  }
});

// GET /api/folders/tree - Get folder tree
router.get('/folders/tree', requireAuth, [
  query('rootFolderId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    const tree = await FileService.getFolderTree(user.id, req.query.rootFolderId as string);
    
    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('Error getting folder tree:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Klasör ağacı alınırken hata oluştu' 
    });
  }
});

// Search routes
// GET /api/search - Search files and folders
router.get('/search', requireAuth, [
  query('q').isString().trim().isLength({ min: 1 }),
  query('type').optional().isIn(['all', 'files', 'folders'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    const results = await FileService.search(
      user.id, 
      req.query.q as string, 
      (req.query.type as 'all' | 'files' | 'folders') || 'all'
    );
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Arama yapılırken hata oluştu' 
    });
  }
});

// Statistics routes
// GET /api/stats - Get file statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const stats = await FileService.getFileStats(user.id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'İstatistikler alınırken hata oluştu' 
    });
  }
});

// Bulk operations
// POST /api/bulk/delete - Bulk delete files
router.post('/bulk/delete', requireAuth, [
  body('fileIds').isArray({ min: 1 }),
  body('fileIds.*').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    const { fileIds } = req.body;
    const results = [];

    for (const fileId of fileIds) {
      try {
        await FileService.deleteFile(fileId, user.id);
        results.push({ fileId, success: true });
      } catch (error) {
        results.push({ fileId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error bulk deleting files:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Toplu silme işlemi sırasında hata oluştu' 
    });
  }
});

// POST /api/bulk/move - Bulk move files
router.post('/bulk/move', requireAuth, [
  body('fileIds').isArray({ min: 1 }),
  body('fileIds.*').isString(),
  body('folderId').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    const { fileIds, folderId } = req.body;
    const results = [];

    for (const fileId of fileIds) {
      try {
        const file = await FileService.updateFile(fileId, user.id, { folderId });
        results.push({ fileId, success: true, data: file });
      } catch (error) {
        results.push({ fileId, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error bulk moving files:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Toplu taşıma işlemi sırasında hata oluştu' 
    });
  }
});

export default router;
