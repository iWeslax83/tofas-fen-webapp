import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, 
  File, 
  Upload, 
  Download, 
  Trash2, 
  Share2, 
  Search, 
  Filter, 
  Grid, 
  List, 
  MoreVertical,
  FolderPlus,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Eye,
  ChevronRight,
  X,
  AlertCircle
} from 'lucide-react';
import { SecureAPI } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import './FileManagementPage.css';

interface IFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  folderId?: string;
  tags: string[];
  description?: string;
  category: string;
  type: string;
  status: string;
  isPublic: boolean;
  allowedRoles: string[];
  permissions: {
    owner: string;
    sharedWith: Array<{
      userId: string;
      permission: string;
      sharedAt: string;
      sharedBy: string;
    }>;
  };
  downloads: number;
  views: number;
  lastAccessed?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface IFolder {
  id: string;
  name: string;
  description?: string;
  parentFolder?: string;
  path: string;
  category: string;
  isPublic: boolean;
  allowedRoles: string[];
  permissions: {
    owner: string;
    sharedWith: Array<{
      userId: string;
      permission: string;
      sharedAt: string;
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
    lastActivity: string;
  };
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface FileStats {
  totalFiles: number;
  totalSize: number;
  totalDownloads: number;
  totalViews: number;
  byType: Record<string, { count: number; size: number }>;
  byCategory: Record<string, { count: number; size: number }>;
}

const FileManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<IFile[]>([]);
  const [folders, setFolders] = useState<IFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderTree, setFolderTree] = useState<{ id: string; name: string; children?: { id: string; name: string }[] }[]>([]);
  const [, setStats] = useState<FileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    sizeMin: '',
    sizeMax: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showFileDetailsModal, setShowFileDetailsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<IFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy] = useState('createdAt');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch files
      const filesResponse = await SecureAPI.get(`/api/files?page=${page}&limit=20&sortBy=${sortBy}&sortOrder=${sortOrder}`);

      if ((filesResponse as { data: { success: boolean; data: { files: IFile[]; totalPages: number } } }).data.success) {
        const responseData = (filesResponse as { data: { success: boolean; data: { files: IFile[]; totalPages: number } } }).data.data;
        setFiles(responseData.files);
        setTotalPages(responseData.totalPages);
      }

      // Fetch folders
      const foldersResponse = await SecureAPI.get(`/api/files/folders?parentFolder=${currentFolder || ''}`);

      if ((foldersResponse as { data: { success: boolean; data: IFolder[] } }).data.success) {
        setFolders((foldersResponse as { data: { success: boolean; data: IFolder[] } }).data.data);
      }

      // Fetch folder tree
      const treeResponse = await SecureAPI.get('/api/files/folders/tree');
      if ((treeResponse as { data: { success: boolean; data: { id: string; name: string; children?: { id: string; name: string }[] }[] } }).data.success) {
        setFolderTree((treeResponse as { data: { success: boolean; data: { id: string; name: string; children?: { id: string; name: string }[] }[] } }).data.data);
      }

      // Fetch stats
      const statsResponse = await SecureAPI.get('/api/files/stats');
      if ((statsResponse as { data: { success: boolean; data: FileStats } }).data.success) {
        setStats((statsResponse as { data: { success: boolean; data: FileStats } }).data.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [page, currentFolder, sortBy, sortOrder]);

  // Search files and folders
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      fetchData();
      return;
    }

    try {
      setLoading(true);
      const response = await SecureAPI.get(`/api/files/search?q=${encodeURIComponent(searchQuery)}&type=all`);

      if ((response as { data: { success: boolean; data: { files: IFile[]; folders: IFolder[] } } }).data.success) {
        const responseData = (response as { data: { success: boolean; data: { files: IFile[]; folders: IFolder[] } } }).data.data;
        setFiles(responseData.files);
        setFolders(responseData.folders);
      }
    } catch (err) {
      console.error('Error searching:', err);
      setError('Arama yapılırken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, fetchData]);

  // Upload file
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        if (currentFolder) {
          formData.append('folderId', currentFolder);
        }

        const response = await SecureAPI.post('/api/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              ((progressEvent.loaded * 100) / (progressEvent.total || 100))
            );
            setUploadProgress(progress);
          },
        });

        if ((response as { data: { success: boolean } }).data.success) {
          // Refresh data
          fetchData();
        }
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Dosya yüklenirken hata oluştu');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setShowUploadModal(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Create folder
  const handleCreateFolder = async (folderData: {
    name: string;
    description?: string;
    category?: string;
    isPublic?: boolean;
  }) => {
    try {
      const response = await SecureAPI.post('/api/files/folders', {
        ...folderData,
        parentFolder: currentFolder
      });

      if ((response as { data: { success: boolean } }).data.success) {
        fetchData();
        setShowCreateFolderModal(false);
      }
    } catch (err) {
      console.error('Error creating folder:', err);
      setError('Klasör oluşturulurken hata oluştu');
    }
  };

  // Download file
  const handleDownload = async (file: IFile) => {
    try {
      const response = await SecureAPI.get(`/api/files/${file.id}/download`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([(response as { data: string }).data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Dosya indirilirken hata oluştu');
    }
  };

  // Delete file/folder
  const handleDelete = async (id: string, type: 'file' | 'folder') => {
    if (!confirm(`${type === 'file' ? 'Dosyayı' : 'Klasörü'} silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const endpoint = type === 'file' ? `/api/files/${id}` : `/api/files/folders/${id}`;
      const response = await SecureAPI.delete(endpoint);

      if ((response as { data: { success: boolean } }).data.success) {
        fetchData();
        setSelectedItems(selectedItems.filter(item => item !== id));
      }
    } catch (err) {
      console.error('Error deleting:', err);
      setError(`${type === 'file' ? 'Dosya' : 'Klasör'} silinirken hata oluştu`);
    }
  };

  // Share file/folder
  const handleShare = async (shareData: {
    userId: string;
    permission: 'read' | 'write' | 'admin';
  }) => {
    if (!selectedFile) return;

    try {
      const response = await SecureAPI.post(`/api/files/${selectedFile.id}/share`, shareData);

      if ((response as { data: { success: boolean } }).data.success) {
        setShowShareModal(false);
        setSelectedFile(null);
      }
    } catch (err) {
      console.error('Error sharing:', err);
      setError('Paylaşım yapılırken hata oluştu');
    }
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;

    if (!confirm(`${selectedItems.length} öğeyi silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const response = await SecureAPI.post('/api/files/bulk/delete', {
        fileIds: selectedItems
      });

      if ((response as { data: { success: boolean } }).data.success) {
        fetchData();
        setSelectedItems([]);
      }
    } catch (err) {
      console.error('Error bulk deleting:', err);
      setError('Toplu silme işlemi sırasında hata oluştu');
    }
  };

  // Navigate to folder
  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolder(folderId);
    setPage(1);
  };

  // Get file icon
  const getFileIcon = (file: IFile) => {
    switch (file.type) {
      case 'document':
        return <FileText className="w-6 h-6" />;
      case 'image':
        return <Image className="w-6 h-6" />;
      case 'video':
        return <Video className="w-6 h-6" />;
      case 'audio':
        return <Music className="w-6 h-6" />;
      case 'archive':
        return <Archive className="w-6 h-6" />;
      default:
        return <File className="w-6 h-6" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Effects
  useEffect(() => {
    fetchData();
  }, [page, currentFolder, sortBy, sortOrder, fetchData]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery) {
        handleSearch();
      } else {
        fetchData();
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, handleSearch, fetchData]);

  useEffect(() => {
    fetchData();
  }, [filters, fetchData]);

  if (loading && files.length === 0) {
    return (
      <div className="file-management-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Dosyalar yükleniyor...</p>
        </div>
      </div>
    );
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Dosya Yönetimi' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Dosya Yönetimi"
      breadcrumb={breadcrumb}
    >
      <div className="file-management-page">
        {/* Header */}
        <div className="file-header">
          <div className="header-left">
            <h1>Dosya Yönetimi</h1>
            <div className="breadcrumb">
              <span 
                className="breadcrumb-item" 
                onClick={() => navigateToFolder(null)}
              >
                Ana Klasör
              </span>
              {currentFolder && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="breadcrumb-item">Klasör</span>
              </>
            )}
          </div>
        </div>

        <div className="header-right">
          <div className="view-controls">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setShowCreateFolderModal(true)}
          >
            <FolderPlus className="w-4 h-4" />
            Yeni Klasör
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload className="w-4 h-4" />
            Dosya Yükle
          </button>
        </div>
      </div>


      {/* Search and Filters */}
      <div className="search-filters-container">
        <div className="search-container">
          <Search className="w-4 h-4" />
          <input
            type="text"
            placeholder="Dosya veya klasör ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-container">
          <button
            className={`filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            Filtreler
          </button>

          {selectedItems.length > 0 && (
            <div className="bulk-actions">
              <span>{selectedItems.length} öğe seçildi</span>
              <button
                className="btn btn-danger"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4" />
                Toplu Sil
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="filters-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="filter-row">
              <div className="filter-group">
                <label>Kategori</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <option value="">Tümü</option>
                  <option value="academic">Akademik</option>
                  <option value="administrative">İdari</option>
                  <option value="personal">Kişisel</option>
                  <option value="shared">Paylaşılan</option>
                  <option value="temporary">Geçici</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Tür</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                >
                  <option value="">Tümü</option>
                  <option value="document">Belge</option>
                  <option value="image">Resim</option>
                  <option value="video">Video</option>
                  <option value="audio">Ses</option>
                  <option value="archive">Arşiv</option>
                  <option value="other">Diğer</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Boyut (MB)</label>
                <div className="size-range">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.sizeMin}
                    onChange={(e) => setFilters({ ...filters, sizeMin: e.target.value })}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.sizeMax}
                    onChange={(e) => setFilters({ ...filters, sizeMax: e.target.value })}
                  />
                </div>
              </div>

              <div className="filter-group">
                <label>Tarih</label>
                <div className="date-range">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  />
                  <span>-</span>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="file-content">
        {/* Sidebar - Folder Tree */}
        <div className="file-sidebar">
          <h3>Klasörler</h3>
          <div className="folder-tree">
            <div
              className={`folder-item ${!currentFolder ? 'active' : ''}`}
              onClick={() => navigateToFolder(null)}
            >
              <Folder className="w-4 h-4" />
              <span>Ana Klasör</span>
            </div>
            {folderTree.map((folder) => (
              <div key={folder.id} className="folder-item">
                <Folder className="w-4 h-4" />
                <span>{folder.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="file-main">
          {error && (
            <div className="error-message">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Files and Folders Grid/List */}
          <div className={`file-grid ${viewMode}`}>
            {/* Folders */}
            {folders.map((folder) => (
              <motion.div
                key={folder.id}
                className="file-item folder"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => navigateToFolder(folder.id)}
              >
                <div className="file-icon">
                  <Folder className="w-8 h-8" />
                </div>
                <div className="file-info">
                  <h4>{folder.name}</h4>
                  <p>{folder.description || 'Açıklama yok'}</p>
                  <span className="file-meta">
                    {folder.stats.totalFiles} dosya • {formatFileSize(folder.stats.totalSize)}
                  </span>
                </div>
                <div className="file-actions">
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle folder actions
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Files */}
            {files.map((file) => (
              <motion.div
                key={file.id}
                className={`file-item file ${selectedItems.includes(file.id) ? 'selected' : ''}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  if (selectedItems.includes(file.id)) {
                    setSelectedItems(selectedItems.filter(id => id !== file.id));
                  } else {
                    setSelectedItems([...selectedItems, file.id]);
                  }
                }}
              >
                <div className="file-icon">
                  {file.thumbnailUrl ? (
                    <img src={file.thumbnailUrl} alt={file.originalName} />
                  ) : (
                    getFileIcon(file)
                  )}
                </div>
                <div className="file-info">
                  <h4>{file.originalName}</h4>
                  <p>{file.description || 'Açıklama yok'}</p>
                  <span className="file-meta">
                    {formatFileSize(file.size)} • {file.downloads} indirme • {file.views} görüntüleme
                  </span>
                </div>
                <div className="file-actions">
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(file);
                      setShowFileDetailsModal(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(file);
                      setShowShareModal(true);
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file.id, 'file');
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Önceki
              </button>
              <span className="page-info">
                Sayfa {page} / {totalPages}
              </span>
              <button
                className="pagination-btn"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Sonraki
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Upload Modal */}
        {showUploadModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Dosya Yükle</h3>
                <button
                  className="close-btn"
                  onClick={() => setShowUploadModal(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="modal-body">
                <div className="upload-area">
                  <Upload className="w-12 h-12" />
                  <p>Dosyaları buraya sürükleyin veya seçin</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="file-input"
                  />
                </div>
                {uploading && (
                  <div className="upload-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <span>{uploadProgress}%</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Create Folder Modal */}
        {showCreateFolderModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateFolderModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Yeni Klasör</h3>
                <button
                  className="close-btn"
                  onClick={() => setShowCreateFolderModal(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleCreateFolder({
                    name: formData.get('name') as string,
                    description: formData.get('description') as string,
                    category: formData.get('category') as string,
                    isPublic: formData.get('isPublic') === 'true'
                  });
                }}>
                  <div className="form-group">
                    <label>Klasör Adı</label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="Klasör adını girin"
                    />
                  </div>
                  <div className="form-group">
                    <label>Açıklama</label>
                    <textarea
                      name="description"
                      placeholder="Klasör açıklaması (isteğe bağlı)"
                    />
                  </div>
                  <div className="form-group">
                    <label>Kategori</label>
                    <select name="category">
                      <option value="personal">Kişisel</option>
                      <option value="academic">Akademik</option>
                      <option value="administrative">İdari</option>
                      <option value="shared">Paylaşılan</option>
                      <option value="temporary">Geçici</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      <input type="checkbox" name="isPublic" value="true" />
                      Herkese açık
                    </label>
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowCreateFolderModal(false)}
                    >
                      İptal
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Oluştur
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* File Details Modal */}
        {showFileDetailsModal && selectedFile && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFileDetailsModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Dosya Detayları</h3>
                <button
                  className="close-btn"
                  onClick={() => setShowFileDetailsModal(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="modal-body">
                <div className="file-details">
                  <div className="file-preview">
                    {selectedFile.thumbnailUrl ? (
                      <img src={selectedFile.thumbnailUrl} alt={selectedFile.originalName} />
                    ) : (
                      <div className="file-icon-large">
                        {getFileIcon(selectedFile)}
                      </div>
                    )}
                  </div>
                  <div className="file-info-details">
                    <h4>{selectedFile.originalName}</h4>
                    <p>{selectedFile.description || 'Açıklama yok'}</p>
                    <div className="file-stats">
                      <div className="stat">
                        <span>Boyut:</span>
                        <span>{formatFileSize(selectedFile.size)}</span>
                      </div>
                      <div className="stat">
                        <span>İndirme:</span>
                        <span>{selectedFile.downloads}</span>
                      </div>
                      <div className="stat">
                        <span>Görüntüleme:</span>
                        <span>{selectedFile.views}</span>
                      </div>
                      <div className="stat">
                        <span>Oluşturulma:</span>
                        <span>{new Date(selectedFile.createdAt).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                    <div className="file-tags">
                      {selectedFile.tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleDownload(selectedFile)}
                  >
                    <Download className="w-4 h-4" />
                    İndir
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowFileDetailsModal(false)}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Share Modal */}
        {showShareModal && selectedFile && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Dosya Paylaş</h3>
                <button
                  className="close-btn"
                  onClick={() => setShowShareModal(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleShare({
                    userId: formData.get('userId') as string,
                    permission: formData.get('permission') as 'read' | 'write' | 'admin'
                  });
                }}>
                  <div className="form-group">
                    <label>Kullanıcı ID</label>
                    <input
                      type="text"
                      name="userId"
                      required
                      placeholder="Kullanıcı ID'sini girin"
                    />
                  </div>
                  <div className="form-group">
                    <label>İzin</label>
                    <select name="permission">
                      <option value="read">Okuma</option>
                      <option value="write">Yazma</option>
                      <option value="admin">Yönetici</option>
                    </select>
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowShareModal(false)}
                    >
                      İptal
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Paylaş
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </ModernDashboardLayout>
  );
};

export default FileManagementPage;
