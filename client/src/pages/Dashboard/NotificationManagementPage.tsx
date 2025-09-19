import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Filter, 
  Search, 
  Send, 
  Users, 
  Eye, 
  EyeOff, 
  Archive,
  Trash2,
  Edit,
  Copy,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
  X,
  RefreshCw
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { SecureAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';
import './NotificationManagementPage.css';

interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'request' | 'approval' | 'reminder' | 'announcement';
  category: 'academic' | 'administrative' | 'social' | 'technical' | 'security' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  icon?: string;
  actionText?: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  sentToday: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

const NotificationManagementPage: React.FC = () => {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    priority: '',
    read: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // New notification form state
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error' | 'request' | 'approval' | 'reminder' | 'announcement',
    category: 'general' as 'academic' | 'administrative' | 'social' | 'technical' | 'security' | 'general',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    actionUrl: '',
    actionText: '',
    icon: '',
    expiresAt: '',
    sendEmail: false,
    recipients: {
      type: 'all' as 'all' | 'role' | 'specific',
      roles: [] as string[],
      userIds: [] as string[]
    }
  });

  // Template form state
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error' | 'request' | 'approval' | 'reminder' | 'announcement',
    category: 'general' as 'academic' | 'administrative' | 'social' | 'technical' | 'security' | 'general',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    icon: '',
    actionText: ''
  });

  useEffect(() => {
    fetchData();
  }, [filters, pagination.page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch notifications
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.read) params.append('read', filters.read);

      const [notificationsRes, statsRes, templatesRes] = await Promise.all([
        SecureAPI.get(`/api/notifications/admin?${params}`),
        SecureAPI.get('/api/notifications/stats'),
        SecureAPI.get('/api/notifications/templates')
      ]);

      setNotifications((notificationsRes as any).data?.data || []);
      setStats((statsRes as any).data?.data || null);
      setTemplates((templatesRes as any).data?.data || []);
      
      const paginationData = (notificationsRes as any).data?.pagination;
      if (paginationData) {
        setPagination(prev => ({
          ...prev,
          total: paginationData.total,
          totalPages: paginationData.totalPages
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotification = async () => {
    try {
      const notificationData = {
        ...newNotification,
        expiresAt: newNotification.expiresAt ? new Date(newNotification.expiresAt) : undefined,
        sender: {
          id: user?.id,
          name: user?.adSoyad || 'Bilinmeyen',
          role: user?.rol || 'admin'
        }
      };

      let response;
      if (newNotification.recipients.type === 'all') {
        response = await SecureAPI.post('/api/notifications/bulk', {
          ...notificationData,
          userIds: 'all'
        });
      } else if (newNotification.recipients.type === 'role') {
        response = await SecureAPI.post('/api/notifications/role-based', {
          ...notificationData,
          roles: newNotification.recipients.roles
        });
      } else {
        response = await SecureAPI.post('/api/notifications/bulk', {
          ...notificationData,
          userIds: newNotification.recipients.userIds
        });
      }

      if ((response as any).data?.success) {
        toast.success('Bildirim başarıyla gönderildi');
        setShowCreateModal(false);
        setNewNotification({
        title: '',
        message: '',
        type: 'info',
          category: 'general',
        priority: 'medium',
        actionUrl: '',
        actionText: '',
        icon: '',
        expiresAt: '',
        sendEmail: false,
          recipients: {
            type: 'all',
            roles: [],
            userIds: []
          }
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error('Bildirim gönderilirken hata oluştu');
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await SecureAPI.post('/api/notifications/templates', newTemplate);
      
      if ((response as any).data?.success) {
        toast.success('Şablon başarıyla oluşturuldu');
        setShowTemplateModal(false);
        setNewTemplate({
          name: '',
          title: '',
          message: '',
          type: 'info',
          category: 'general',
          priority: 'medium',
          icon: '',
          actionText: ''
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Şablon oluşturulurken hata oluştu');
    }
  };

  const handleUseTemplate = (template: NotificationTemplate) => {
    setNewNotification(prev => ({
      ...prev,
      title: template.title,
      message: template.message,
      type: template.type,
      category: template.category,
      priority: template.priority,
      icon: template.icon || '',
      actionText: template.actionText || ''
    }));
    setShowCreateModal(true);
  };

  const handleBulkAction = async (action: 'read' | 'unread' | 'archive' | 'delete') => {
    if (selectedNotifications.length === 0) return;

    try {
      let endpoint = '';
      let data = { notificationIds: selectedNotifications };

      switch (action) {
        case 'read':
          endpoint = '/api/notifications/bulk-read';
          break;
        case 'unread':
          endpoint = '/api/notifications/bulk-unread';
          break;
        case 'archive':
          endpoint = '/api/notifications/bulk-archive';
          break;
        case 'delete':
          endpoint = '/api/notifications/bulk-delete';
          break;
      }

      const response = await SecureAPI.patch(endpoint, data);
      
      if ((response as any).data?.success) {
        toast.success(`${selectedNotifications.length} bildirim işlendi`);
      setSelectedNotifications([]);
        fetchData();
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Toplu işlem sırasında hata oluştu');
    }
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      info: <Info className="w-4 h-4" />,
      success: <CheckCircle className="w-4 h-4" />,
      warning: <AlertCircle className="w-4 h-4" />,
      error: <XCircle className="w-4 h-4" />,
      request: <Bell className="w-4 h-4" />,
      approval: <Users className="w-4 h-4" />,
      reminder: <Clock className="w-4 h-4" />,
      announcement: <Bell className="w-4 h-4" />
    };
    return icons[type as keyof typeof icons] || <Info className="w-4 h-4" />;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-yellow-100 text-yellow-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'admin'}` },
    { label: 'Bildirim Yönetimi' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Bildirim Yönetimi"
      breadcrumb={breadcrumb}
    >
      <div className="notification-management">
        <BackButton />
        
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <div className="header-left">
              <div className="header-icon">
                <Bell className="icon" />
              </div>
              <div className="header-text">
            <h1>Bildirim Yönetimi</h1>
                <p>Bildirimleri oluşturun, yönetin ve takip edin</p>
          </div>
        </div>
            <div className="header-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowTemplateModal(true)}
              >
                <Plus className="icon" />
                Şablon Oluştur
              </button>
          <button
            className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
          >
                <Plus className="icon" />
            Yeni Bildirim
          </button>
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <Bell className="icon" />
              </div>
              <div className="stat-content">
                <h3>{stats.total}</h3>
                <p>Toplam Bildirim</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Eye className="icon" />
              </div>
              <div className="stat-content">
                <h3>{stats.unread}</h3>
                <p>Okunmamış</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Send className="icon" />
              </div>
              <div className="stat-content">
                <h3>{stats.sentToday}</h3>
                <p>Bugün Gönderilen</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filters-section">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Tür</label>
            <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            >
                <option value="">Tümü</option>
              <option value="info">Bilgi</option>
              <option value="success">Başarı</option>
              <option value="warning">Uyarı</option>
              <option value="error">Hata</option>
              <option value="request">İstek</option>
              <option value="approval">Onay</option>
              <option value="reminder">Hatırlatma</option>
              <option value="announcement">Duyuru</option>
            </select>
            </div>
            <div className="filter-group">
              <label>Kategori</label>
            <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Tümü</option>
              <option value="academic">Akademik</option>
              <option value="administrative">İdari</option>
              <option value="social">Sosyal</option>
              <option value="technical">Teknik</option>
              <option value="security">Güvenlik</option>
              <option value="general">Genel</option>
            </select>
          </div>
            <div className="filter-group">
              <label>Öncelik</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="">Tümü</option>
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
                <option value="urgent">Acil</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Durum</label>
              <select
                value={filters.read}
                onChange={(e) => setFilters(prev => ({ ...prev, read: e.target.value }))}
              >
                <option value="">Tümü</option>
                <option value="false">Okunmamış</option>
                <option value="true">Okunmuş</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Arama</label>
              <div className="search-input">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Başlık veya mesaj ara..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedNotifications.length > 0 && (
          <div className="bulk-actions">
            <div className="bulk-info">
              <span>{selectedNotifications.length} bildirim seçildi</span>
            </div>
            <div className="bulk-buttons">
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => handleBulkAction('read')}
              >
                <Eye className="icon" />
                Okundu İşaretle
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => handleBulkAction('unread')}
              >
                <EyeOff className="icon" />
                Okunmamış İşaretle
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => handleBulkAction('archive')}
              >
                <Archive className="icon" />
                Arşivle
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleBulkAction('delete')}
              >
                <Trash2 className="icon" />
                Sil
              </button>
        </div>
      </div>
        )}

      {/* Notifications List */}
      <div className="notifications-section">
        <div className="section-header">
            <h2>Bildirimler</h2>
            <div className="section-actions">
            <button
                className="btn btn-sm btn-secondary"
                onClick={fetchData}
                disabled={loading}
            >
                <RefreshCw className="icon" />
                Yenile
            </button>
            </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Yükleniyor...</p>
          </div>
        ) : (
            <div className="notifications-list">
              {notifications.map((notification) => (
                <div
                key={notification._id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                >
                  <div className="notification-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNotifications(prev => [...prev, notification._id]);
                        } else {
                          setSelectedNotifications(prev => prev.filter(id => id !== notification._id));
                        }
                      }}
                    />
                  </div>
                  
                  <div className="notification-content">
                    <div className="notification-header">
                      <div className="notification-title">
                        {getTypeIcon(notification.type)}
                        <span>{notification.title}</span>
                        {!notification.read && <div className="unread-dot" />}
                      </div>
                      <div className="notification-meta">
                        <span className={`priority-badge ${getPriorityColor(notification.priority)}`}>
                          {notification.priority}
                        </span>
                        <span className="category-badge">
                          {notification.category}
                        </span>
                        <span className="date">
                          {new Date(notification.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="notification-message">
                      {notification.message}
                </div>
                
                  {notification.actionUrl && (
                      <div className="notification-action">
                    <a 
                      href={notification.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="action-link"
                    >
                      {notification.actionText || 'Görüntüle'}
                    </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Templates Section */}
        <div className="templates-section">
          <div className="section-header">
            <h2>Şablonlar</h2>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => setShowTemplateModal(true)}
            >
              <Plus className="icon" />
              Yeni Şablon
            </button>
                </div>
                
          <div className="templates-grid">
            {templates.map((template) => (
              <div key={template.id} className="template-card">
                <div className="template-header">
                  <div className="template-title">
                    {getTypeIcon(template.type)}
                    <span>{template.name}</span>
                  </div>
                  <div className="template-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleUseTemplate(template)}
                    >
                      <Copy className="icon" />
                      Kullan
                    </button>
                  </div>
                </div>
                <div className="template-content">
                  <h4>{template.title}</h4>
                  <p>{template.message}</p>
                </div>
                <div className="template-meta">
                  <span className={`priority-badge ${getPriorityColor(template.priority)}`}>
                    {template.priority}
                  </span>
                  <span className="category-badge">
                    {template.category}
                    </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Notification Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Yeni Bildirim Oluştur</h3>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <X className="icon" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Başlık *</label>
                  <input
                    type="text"
                    value={newNotification.title}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Bildirim başlığı"
                  />
                </div>
                
                <div className="form-group">
                  <label>Mesaj *</label>
                  <textarea
                    value={newNotification.message}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Bildirim mesajı"
                    rows={4}
                  />
                </div>
                
                <div className="form-group">
                  <label>Tür</label>
                  <select
                    value={newNotification.type}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, type: e.target.value as any }))}
                  >
                    <option value="info">Bilgi</option>
                    <option value="success">Başarı</option>
                    <option value="warning">Uyarı</option>
                    <option value="error">Hata</option>
                    <option value="request">İstek</option>
                    <option value="approval">Onay</option>
                    <option value="reminder">Hatırlatma</option>
                    <option value="announcement">Duyuru</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Kategori</label>
                  <select
                    value={newNotification.category}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, category: e.target.value as any }))}
                  >
                    <option value="general">Genel</option>
                    <option value="academic">Akademik</option>
                    <option value="administrative">İdari</option>
                    <option value="social">Sosyal</option>
                    <option value="technical">Teknik</option>
                    <option value="security">Güvenlik</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Öncelik</label>
                  <select
                    value={newNotification.priority}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, priority: e.target.value as any }))}
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                    <option value="urgent">Acil</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Alıcılar</label>
                  <select
                    value={newNotification.recipients.type}
                    onChange={(e) => setNewNotification(prev => ({ 
                      ...prev, 
                      recipients: { ...prev.recipients, type: e.target.value as any }
                    }))}
                  >
                    <option value="all">Tüm Kullanıcılar</option>
                    <option value="role">Rol Bazlı</option>
                    <option value="specific">Belirli Kullanıcılar</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Eylem URL'si</label>
                  <input
                    type="url"
                    value={newNotification.actionUrl}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, actionUrl: e.target.value }))}
                    placeholder="https://example.com"
                  />
                </div>
                
                <div className="form-group">
                  <label>Eylem Metni</label>
                  <input
                    type="text"
                    value={newNotification.actionText}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, actionText: e.target.value }))}
                    placeholder="Görüntüle"
                  />
                </div>
                
                <div className="form-group">
                  <label>Son Geçerlilik Tarihi</label>
                  <input
                    type="datetime-local"
                    value={newNotification.expiresAt}
                    onChange={(e) => setNewNotification(prev => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>
                
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={newNotification.sendEmail}
                      onChange={(e) => setNewNotification(prev => ({ ...prev, sendEmail: e.target.checked }))}
                    />
                    E-posta olarak da gönder
                  </label>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                İptal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateNotification}
                disabled={!newNotification.title || !newNotification.message}
              >
                <Send className="icon" />
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showTemplateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Yeni Şablon Oluştur</h3>
              <button
                className="modal-close"
                onClick={() => setShowTemplateModal(false)}
              >
                <X className="icon" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Şablon Adı *</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Şablon adı"
                  />
                </div>
                
                <div className="form-group">
                  <label>Başlık *</label>
                  <input
                    type="text"
                    value={newTemplate.title}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Bildirim başlığı"
                  />
                </div>
                
                <div className="form-group">
                  <label>Mesaj *</label>
                  <textarea
                    value={newTemplate.message}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Bildirim mesajı"
                    rows={4}
                  />
                </div>
                
                <div className="form-group">
                  <label>Tür</label>
                  <select
                    value={newTemplate.type}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, type: e.target.value as any }))}
                  >
                    <option value="info">Bilgi</option>
                    <option value="success">Başarı</option>
                    <option value="warning">Uyarı</option>
                    <option value="error">Hata</option>
                    <option value="request">İstek</option>
                    <option value="approval">Onay</option>
                    <option value="reminder">Hatırlatma</option>
                    <option value="announcement">Duyuru</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Kategori</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value as any }))}
                  >
                    <option value="general">Genel</option>
                    <option value="academic">Akademik</option>
                    <option value="administrative">İdari</option>
                    <option value="social">Sosyal</option>
                    <option value="technical">Teknik</option>
                    <option value="security">Güvenlik</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Öncelik</label>
                  <select
                    value={newTemplate.priority}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, priority: e.target.value as any }))}
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                    <option value="urgent">Acil</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Eylem Metni</label>
                  <input
                    type="text"
                    value={newTemplate.actionText}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, actionText: e.target.value }))}
                    placeholder="Görüntüle"
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowTemplateModal(false)}
              >
                İptal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateTemplate}
                disabled={!newTemplate.name || !newTemplate.title || !newTemplate.message}
              >
                <Plus className="icon" />
                Oluştur
              </button>
            </div>
          </div>
      </div>
      )}
    </ModernDashboardLayout>
  );
};

export default NotificationManagementPage;