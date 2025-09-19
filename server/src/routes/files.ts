import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  }
});

// File interface
interface IFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  folderId?: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  tags: string[];
  description?: string;
}

// Folder interface
interface IFolder {
  id: string;
  name: string;
  parentId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  path: string;
}

// In-memory storage for demo (replace with database in production)
let files: IFile[] = [];
let folders: IFolder[] = [];

// Helper function to get file stats
const getFileStats = () => {
  const totalFiles = files.length;
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalFolders = folders.length;
  
  const fileTypes = files.reduce((acc, file) => {
    const ext = path.extname(file.originalName).toLowerCase();
    acc[ext] = (acc[ext] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalFiles,
    totalSize,
    totalFolders,
    fileTypes,
    storageUsed: totalSize,
    storageAvailable: 100 * 1024 * 1024 * 1024 - totalSize, // 100GB - used
  };
};

// GET /api/files - Get files with pagination and filters
router.get('/', 
  requireAuth,
  async (req: any, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      type,
      folderId
    } = req.query;

    let filteredFiles = [...files];

    // Filter by user
    filteredFiles = filteredFiles.filter(file => file.uploadedBy === req.user.id);

    // Filter by type
    if (type) {
      filteredFiles = filteredFiles.filter(file => {
        const ext = path.extname(file.originalName).toLowerCase();
        return ext === type.toLowerCase();
      });
    }

    // Filter by folder
    if (folderId) {
      filteredFiles = filteredFiles.filter(file => file.folderId === folderId);
    }

    // Sort files
    filteredFiles.sort((a, b) => {
      const aValue = a[sortBy as keyof IFile];
      const bValue = b[sortBy as keyof IFile];
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedFiles = filteredFiles.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        files: paginatedFiles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredFiles.length,
          totalPages: Math.ceil(filteredFiles.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({
      success: false,
      error: 'Dosyalar yüklenirken hata oluştu'
    });
  }
});

// GET /api/files/folders - Get folders
router.get('/folders', 
  requireAuth,
  async (req: any, res) => {
  try {
    const { parentFolder } = req.query;
    
    let filteredFolders = folders.filter(folder => folder.createdBy === req.user.id);
    
    if (parentFolder) {
      filteredFolders = filteredFolders.filter(folder => folder.parentId === parentFolder);
    } else {
      filteredFolders = filteredFolders.filter(folder => !folder.parentId);
    }

    res.json({
      success: true,
      data: filteredFolders
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({
      success: false,
      error: 'Klasörler yüklenirken hata oluştu'
    });
  }
});

// GET /api/files/folders/tree - Get folder tree
router.get('/folders/tree', requireAuth, async (req: any, res) => {
  try {
    const userFolders = folders.filter(folder => folder.createdBy === req.user.id);
    
    const buildTree = (parentId?: string): any[] => {
      return userFolders
        .filter(folder => folder.parentId === parentId)
        .map(folder => ({
          ...folder,
          children: buildTree(folder.id)
        }));
    };

    const tree = buildTree();

    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('Error fetching folder tree:', error);
    res.status(500).json({
      success: false,
      error: 'Klasör ağacı yüklenirken hata oluştu'
    });
  }
});

// GET /api/files/stats - Get file statistics
router.get('/stats', requireAuth, async (req: any, res) => {
  try {
    const userFiles = files.filter(file => file.uploadedBy === req.user.id);
    const userFolders = folders.filter(folder => folder.createdBy === req.user.id);
    
    const stats = {
      totalFiles: userFiles.length,
      totalFolders: userFolders.length,
      totalSize: userFiles.reduce((sum, file) => sum + file.size, 0),
      fileTypes: userFiles.reduce((acc, file) => {
        const ext = path.extname(file.originalName).toLowerCase();
        acc[ext] = (acc[ext] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentFiles: userFiles
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'İstatistikler yüklenirken hata oluştu'
    });
  }
});

// GET /api/files/search - Search files and folders
router.get('/search', 
  requireAuth,
  async (req: any, res) => {
  try {
    const { q, type = 'all' } = req.query;
    const searchQuery = q.toLowerCase();

    let searchResults = {
      files: [] as IFile[],
      folders: [] as IFolder[]
    };

    if (type === 'all' || type === 'files') {
      searchResults.files = files.filter(file => 
        file.uploadedBy === req.user.id &&
        (file.originalName.toLowerCase().includes(searchQuery) ||
         file.description?.toLowerCase().includes(searchQuery) ||
         file.tags.some(tag => tag.toLowerCase().includes(searchQuery)))
      );
    }

    if (type === 'all' || type === 'folders') {
      searchResults.folders = folders.filter(folder => 
        folder.createdBy === req.user.id &&
        folder.name.toLowerCase().includes(searchQuery)
      );
    }

    res.json({
      success: true,
      data: searchResults
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({
      success: false,
      error: 'Arama yapılırken hata oluştu'
    });
  }
});

// POST /api/files/upload - Upload file
router.post('/upload', 
  requireAuth, 
  upload.single('file'),
  async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Dosya seçilmedi'
      });
    }

    const { folderId, description, tags = [], isPublic = false } = req.body;

    const file: IFile = {
      id: uuidv4(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      folderId: folderId || undefined,
      uploadedBy: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic,
      tags: Array.isArray(tags) ? tags : [],
      description
    };

    files.push(file);

    res.status(201).json({
      success: true,
      data: file
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: 'Dosya yüklenirken hata oluştu'
    });
  }
});

// POST /api/files/folders - Create folder
router.post('/folders', 
  requireAuth,
  async (req: any, res) => {
  try {
    const { name, parentId, isPublic = false } = req.body;

    // Check if folder with same name exists in same parent
    const existingFolder = folders.find(folder => 
      folder.name === name && 
      folder.parentId === parentId && 
      folder.createdBy === req.user.id
    );

    if (existingFolder) {
      return res.status(400).json({
        success: false,
        error: 'Bu isimde bir klasör zaten mevcut'
      });
    }

    const folder: IFolder = {
      id: uuidv4(),
      name,
      parentId: parentId || undefined,
      createdBy: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic,
      path: parentId ? `${folders.find(f => f.id === parentId)?.path || ''}/${name}` : name
    };

    folders.push(folder);

    res.status(201).json({
      success: true,
      data: folder
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({
      success: false,
      error: 'Klasör oluşturulurken hata oluştu'
    });
  }
});

// GET /api/files/:id - Get file by ID
router.get('/:id', 
  requireAuth,
  async (req: any, res) => {
  try {
    const { id } = req.params;
    const file = files.find(f => f.id === id && f.uploadedBy === req.user.id);

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
    console.error('Error fetching file:', error);
    res.status(500).json({
      success: false,
      error: 'Dosya yüklenirken hata oluştu'
    });
  }
});

// GET /api/files/:id/download - Download file
router.get('/:id/download', 
  requireAuth,
  async (req: any, res) => {
  try {
    const { id } = req.params;
    const file = files.find(f => f.id === id && (f.uploadedBy === req.user.id || f.isPublic));

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'Dosya bulunamadı'
      });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({
        success: false,
        error: 'Dosya bulunamadı'
      });
    }

    res.download(file.path, file.originalName);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: 'Dosya indirilirken hata oluştu'
    });
  }
});

// PUT /api/files/:id - Update file
router.put('/:id', 
  requireAuth,
  async (req: any, res) => {
  try {
    const { id } = req.params;
    const { description, tags, isPublic } = req.body;

    const fileIndex = files.findIndex(f => f.id === id && f.uploadedBy === req.user.id);

    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Dosya bulunamadı'
      });
    }

    files[fileIndex] = {
      ...files[fileIndex],
      description: description !== undefined ? description : files[fileIndex].description,
      tags: tags !== undefined ? tags : files[fileIndex].tags,
      isPublic: isPublic !== undefined ? isPublic : files[fileIndex].isPublic,
      updatedAt: new Date()
    };

    res.json({
      success: true,
      data: files[fileIndex]
    });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({
      success: false,
      error: 'Dosya güncellenirken hata oluştu'
    });
  }
});

// DELETE /api/files/:id - Delete file
router.delete('/:id', 
  requireAuth,
  async (req: any, res) => {
  try {
    const { id } = req.params;
    const fileIndex = files.findIndex(f => f.id === id && f.uploadedBy === req.user.id);

    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Dosya bulunamadı'
      });
    }

    const file = files[fileIndex];

    // Delete physical file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Remove from array
    files.splice(fileIndex, 1);

    res.json({
      success: true,
      message: 'Dosya silindi'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Dosya silinirken hata oluştu'
    });
  }
});

// DELETE /api/files/folders/:id - Delete folder
router.delete('/folders/:id', 
  requireAuth,
  async (req: any, res) => {
  try {
    const { id } = req.params;
    const folderIndex = folders.findIndex(f => f.id === id && f.createdBy === req.user.id);

    if (folderIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Klasör bulunamadı'
      });
    }

    // Check if folder has children
    const hasChildren = folders.some(f => f.parentId === id);
    if (hasChildren) {
      return res.status(400).json({
        success: false,
        error: 'Klasör içinde alt klasörler bulunuyor'
      });
    }

    // Check if folder has files
    const hasFiles = files.some(f => f.folderId === id);
    if (hasFiles) {
      return res.status(400).json({
        success: false,
        error: 'Klasör içinde dosyalar bulunuyor'
      });
    }

    // Remove folder
    folders.splice(folderIndex, 1);

    res.json({
      success: true,
      message: 'Klasör silindi'
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({
      success: false,
      error: 'Klasör silinirken hata oluştu'
    });
  }
});

// POST /api/files/bulk/delete - Bulk delete files
router.post('/bulk/delete', 
  requireAuth,
  async (req: any, res) => {
  try {
    const { fileIds } = req.body;
    const deletedFiles = [];
    const errors = [];

    for (const fileId of fileIds) {
      const fileIndex = files.findIndex(f => f.id === fileId && f.uploadedBy === req.user.id);
      
      if (fileIndex === -1) {
        errors.push(`File ${fileId} not found`);
        continue;
      }

      const file = files[fileIndex];

      // Delete physical file
      if (fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error(`Error deleting physical file ${file.path}:`, unlinkError);
        }
      }

      // Remove from array
      files.splice(fileIndex, 1);
      deletedFiles.push(fileId);
    }

    res.json({
      success: true,
      data: {
        deletedFiles,
        errors,
        deletedCount: deletedFiles.length
      },
      message: `${deletedFiles.length} dosya silindi`
    });
  } catch (error) {
    console.error('Error bulk deleting files:', error);
    res.status(500).json({
      success: false,
      error: 'Dosyalar silinirken hata oluştu'
    });
  }
});

// POST /api/files/:id/share - Share file
router.post('/:id/share', 
  requireAuth,
  async (req: any, res) => {
  try {
    const { id } = req.params;
    const { userId, permission } = req.body;

    const fileIndex = files.findIndex(f => f.id === id && f.uploadedBy === req.user.id);

    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Dosya bulunamadı'
      });
    }

    // In a real application, you would store sharing permissions in a separate table
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Dosya paylaşıldı'
    });
  } catch (error) {
    console.error('Error sharing file:', error);
    res.status(500).json({
      success: false,
      error: 'Dosya paylaşılırken hata oluştu'
    });
  }
});

export default router;
