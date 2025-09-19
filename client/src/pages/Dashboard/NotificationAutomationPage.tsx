import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  Play,
  Pause,
  Bell,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
  Clock,
  Users,
  Zap,
  X
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { SecureAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';
import './NotificationAutomationPage.css';

interface AutomationRule {
  id: string;
  name: string;
  event: string;
  conditions: Record<string, unknown>;
  notification: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'request' | 'approval' | 'reminder' | 'announcement';
    category: 'academic' | 'administrative' | 'social' | 'technical' | 'security' | 'general';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    icon?: string;
    actionUrl?: string;
    actionText?: string;
  };
  recipients: {
    type: 'all' | 'role' | 'specific' | 'event_related';
    roles?: string[];
    userIds?: string[];
  };
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const NotificationAutomationPage: React.FC = () => {
  const { user } = useAuthContext();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [stats, setStats] = useState({
    totalRules: 0,
    enabledRules: 0,
    disabledRules: 0,
    recentTriggers: 0
  });

  const [newRule, setNewRule] = useState<{
    name: string;
    event: string;
    conditions: Record<string, unknown>;
    notification: {
      title: string;
      message: string;
      type: 'info' | 'success' | 'warning' | 'error' | 'request' | 'approval' | 'reminder' | 'announcement';
      category: 'academic' | 'administrative' | 'social' | 'technical' | 'security' | 'general';
      priority: 'low' | 'medium' | 'high' | 'urgent';
      icon: string;
      actionUrl: string;
      actionText: string;
    };
    recipients: {
      type: 'all' | 'role' | 'specific' | 'event_related';
      roles: string[];
      userIds: string[];
    };
  }>({
    name: '',
    event: '',
    conditions: {},
    notification: {
      title: '',
      message: '',
      type: 'info',
      category: 'general',
      priority: 'medium',
      icon: '',
      actionUrl: '',
      actionText: ''
    },
    recipients: {
      type: 'all',
      roles: [],
      userIds: []
    }
  });

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const response = await SecureAPI.get('/api/notifications/automation/rules');
      setRules((response as { data: { data: AutomationRule[] } }).data?.data || []);
      
      // Calculate stats
      const totalRules = rules.length;
      const enabledRules = rules.filter(rule => rule.enabled).length;
      setStats({
        totalRules,
        enabledRules,
        disabledRules: totalRules - enabledRules,
        recentTriggers: 0 // This would come from the API
      });
    } catch (error) {
      console.error('Error fetching automation rules:', error);
      toast.error('Otomasyon kuralları yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [rules]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleCreateRule = async () => {
    try {
      const response = await SecureAPI.post('/api/notifications/automation/rules', newRule);
      
      if ((response as { data: { success: boolean } }).data?.success) {
        toast.success('Otomasyon kuralı başarıyla oluşturuldu');
        setShowCreateModal(false);
        setNewRule({
          name: '',
          event: '',
          conditions: {},
          notification: {
            title: '',
            message: '',
            type: 'info',
            category: 'general',
            priority: 'medium',
            icon: '',
            actionUrl: '',
            actionText: ''
          },
          recipients: {
            type: 'all',
            roles: [],
            userIds: []
          }
        });
        fetchRules();
      }
    } catch (error) {
      console.error('Error creating automation rule:', error);
      toast.error('Otomasyon kuralı oluşturulurken hata oluştu');
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    try {
      const response = await SecureAPI.put(`/api/notifications/automation/rules/${editingRule.id}`, editingRule);
      
      if ((response as { data: { success: boolean } }).data?.success) {
        toast.success('Otomasyon kuralı başarıyla güncellendi');
        setShowEditModal(false);
        setEditingRule(null);
        fetchRules();
      }
    } catch (error) {
      console.error('Error updating automation rule:', error);
      toast.error('Otomasyon kuralı güncellenirken hata oluştu');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Bu otomasyon kuralını silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await SecureAPI.delete(`/api/notifications/automation/rules/${id}`);
      
      if ((response as { data: { success: boolean } }).data?.success) {
        toast.success('Otomasyon kuralı başarıyla silindi');
        fetchRules();
      }
    } catch (error) {
      console.error('Error deleting automation rule:', error);
      toast.error('Otomasyon kuralı silinirken hata oluştu');
    }
  };

  const handleToggleRule = async (id: string, enabled: boolean) => {
    try {
      const response = await SecureAPI.patch(`/api/notifications/automation/rules/${id}/toggle`, { enabled });
      
      if ((response as { data: { success: boolean } }).data?.success) {
        toast.success(`Otomasyon kuralı ${enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`);
        fetchRules();
      }
    } catch (error) {
      console.error('Error toggling automation rule:', error);
      toast.error('Otomasyon kuralı durumu değiştirilirken hata oluştu');
    }
  };

  const handleEditRule = (rule: AutomationRule) => {
    setEditingRule(rule);
    setShowEditModal(true);
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

  const getEventDescription = (event: string) => {
    const descriptions = {
      'homework.created': 'Yeni ödev eklendiğinde',
      'homework.due_soon': 'Ödev teslim tarihi yaklaştığında',
      'grade.updated': 'Not güncellendiğinde',
      'announcement.created': 'Yeni duyuru yayınlandığında',
      'club.membership_approved': 'Kulüp katılım onaylandığında',
      'system.maintenance': 'Sistem bakımı yapılacağında'
    };
    return descriptions[event as keyof typeof descriptions] || event;
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'admin'}` },
    { label: 'Bildirim Yönetimi', path: `/${user?.rol || 'admin'}/bildirimler` },
    { label: 'Otomasyon Kuralları' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Bildirim Otomasyonu"
      breadcrumb={breadcrumb}
    >
      <div className="notification-automation">
        <BackButton />
        
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <div className="header-left">
              <div className="header-icon">
                <Zap className="icon" />
              </div>
              <div className="header-text">
                <h1>Bildirim Otomasyonu</h1>
                <p>Otomatik bildirim kurallarını yönetin</p>
              </div>
            </div>
            <div className="header-actions">
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="icon" />
                Yeni Kural
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Settings className="icon" />
            </div>
            <div className="stat-content">
              <h3>{stats.totalRules}</h3>
              <p>Toplam Kural</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Play className="icon" />
            </div>
            <div className="stat-content">
              <h3>{stats.enabledRules}</h3>
              <p>Aktif Kural</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Pause className="icon" />
            </div>
            <div className="stat-content">
              <h3>{stats.disabledRules}</h3>
              <p>Pasif Kural</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Bell className="icon" />
            </div>
            <div className="stat-content">
              <h3>{stats.recentTriggers}</h3>
              <p>Son 24 Saat</p>
            </div>
          </div>
        </div>

        {/* Rules List */}
        <div className="rules-section">
          <div className="section-header">
            <h2>Otomasyon Kuralları</h2>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <p>Yükleniyor...</p>
            </div>
          ) : (
            <div className="rules-list">
              {rules.map((rule) => (
                <div key={rule.id} className={`rule-card ${rule.enabled ? 'enabled' : 'disabled'}`}>
                  <div className="rule-header">
                    <div className="rule-title">
                      <h3>{rule.name}</h3>
                      <span className="event-badge">
                        {getEventDescription(rule.event)}
                      </span>
                    </div>
                    <div className="rule-actions">
                      <button
                        className={`toggle-btn ${rule.enabled ? 'enabled' : 'disabled'}`}
                        onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                        title={rule.enabled ? 'Devre Dışı Bırak' : 'Etkinleştir'}
                      >
                        {rule.enabled ? <ToggleRight className="icon" /> : <ToggleLeft className="icon" />}
                      </button>
                      <button
                        className="edit-btn"
                        onClick={() => handleEditRule(rule)}
                        title="Düzenle"
                      >
                        <Edit className="icon" />
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteRule(rule.id)}
                        title="Sil"
                      >
                        <Trash2 className="icon" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="rule-content">
                    <div className="notification-preview">
                      <div className="preview-header">
                        {getTypeIcon(rule.notification.type)}
                        <span className="preview-title">{rule.notification.title}</span>
                        <span className={`priority-badge ${getPriorityColor(rule.notification.priority)}`}>
                          {rule.notification.priority}
                        </span>
                      </div>
                      <p className="preview-message">{rule.notification.message}</p>
                    </div>
                    
                    <div className="rule-meta">
                      <div className="meta-item">
                        <span className="meta-label">Tür:</span>
                        <span className="meta-value">{rule.notification.type}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Kategori:</span>
                        <span className="meta-value">{rule.notification.category}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Alıcılar:</span>
                        <span className="meta-value">
                          {rule.recipients.type === 'all' && 'Tüm Kullanıcılar'}
                          {rule.recipients.type === 'role' && `Roller: ${rule.recipients.roles?.join(', ')}`}
                          {rule.recipients.type === 'specific' && `Belirli Kullanıcılar (${rule.recipients.userIds?.length || 0})`}
                          {rule.recipients.type === 'event_related' && 'Olayla İlgili Kullanıcılar'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Yeni Otomasyon Kuralı</h3>
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
                  <label>Kural Adı *</label>
                  <input
                    type="text"
                    value={newRule.name}
                    onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Kural adı"
                  />
                </div>
                
                <div className="form-group">
                  <label>Olay *</label>
                  <select
                    value={newRule.event}
                    onChange={(e) => setNewRule(prev => ({ ...prev, event: e.target.value }))}
                  >
                    <option value="">Olay seçin</option>
                    <option value="homework.created">Yeni Ödev Eklendi</option>
                    <option value="homework.due_soon">Ödev Teslim Tarihi Yaklaşıyor</option>
                    <option value="grade.updated">Not Güncellendi</option>
                    <option value="announcement.created">Yeni Duyuru Yayınlandı</option>
                    <option value="club.membership_approved">Kulüp Katılım Onaylandı</option>
                    <option value="system.maintenance">Sistem Bakımı</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Bildirim Başlığı *</label>
                  <input
                    type="text"
                    value={newRule.notification.title}
                    onChange={(e) => setNewRule(prev => ({ 
                      ...prev, 
                      notification: { ...prev.notification, title: e.target.value }
                    }))}
                    placeholder="Bildirim başlığı"
                  />
                </div>
                
                <div className="form-group">
                  <label>Bildirim Mesajı *</label>
                  <textarea
                    value={newRule.notification.message}
                    onChange={(e) => setNewRule(prev => ({ 
                      ...prev, 
                      notification: { ...prev.notification, message: e.target.value }
                    }))}
                    placeholder="Bildirim mesajı"
                    rows={3}
                  />
                </div>
                
                <div className="form-group">
                  <label>Tür</label>
                  <select
                    value={newRule.notification.type}
                    onChange={(e) => setNewRule(prev => ({ 
                      ...prev, 
                      notification: { 
                        ...prev.notification, 
                        type: e.target.value as 'info' | 'success' | 'warning' | 'error' | 'request' | 'approval' | 'reminder' | 'announcement'
                      }
                    }))}
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
                    value={newRule.notification.category}
                    onChange={(e) => setNewRule(prev => ({ 
                      ...prev, 
                      notification: { 
                        ...prev.notification, 
                        category: e.target.value as 'academic' | 'administrative' | 'social' | 'technical' | 'security' | 'general'
                      }
                    }))}
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
                    value={newRule.notification.priority}
                    onChange={(e) => setNewRule(prev => ({ 
                      ...prev, 
                      notification: { 
                        ...prev.notification, 
                        priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'
                      }
                    }))}
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                    <option value="urgent">Acil</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Alıcı Türü</label>
                  <select
                    value={newRule.recipients.type}
                    onChange={(e) => setNewRule(prev => ({ 
                      ...prev, 
                      recipients: { 
                        ...prev.recipients, 
                        type: e.target.value as 'all' | 'role' | 'specific' | 'event_related'
                      }
                    }))}
                  >
                    <option value="all">Tüm Kullanıcılar</option>
                    <option value="role">Rol Bazlı</option>
                    <option value="specific">Belirli Kullanıcılar</option>
                    <option value="event_related">Olayla İlgili Kullanıcılar</option>
                  </select>
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
                onClick={handleCreateRule}
                disabled={!newRule.name || !newRule.event || !newRule.notification.title || !newRule.notification.message}
              >
                <Plus className="icon" />
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {showEditModal && editingRule && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Otomasyon Kuralını Düzenle</h3>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                <X className="icon" />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Kural Adı *</label>
                  <input
                    type="text"
                    value={editingRule.name}
                    onChange={(e) => setEditingRule(prev => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="Kural adı"
                  />
                </div>
                
                <div className="form-group">
                  <label>Olay *</label>
                  <select
                    value={editingRule.event}
                    onChange={(e) => setEditingRule(prev => prev ? { ...prev, event: e.target.value } : null)}
                  >
                    <option value="homework.created">Yeni Ödev Eklendi</option>
                    <option value="homework.due_soon">Ödev Teslim Tarihi Yaklaşıyor</option>
                    <option value="grade.updated">Not Güncellendi</option>
                    <option value="announcement.created">Yeni Duyuru Yayınlandı</option>
                    <option value="club.membership_approved">Kulüp Katılım Onaylandı</option>
                    <option value="system.maintenance">Sistem Bakımı</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Bildirim Başlığı *</label>
                  <input
                    type="text"
                    value={editingRule.notification.title}
                    onChange={(e) => setEditingRule(prev => prev ? { 
                      ...prev, 
                      notification: { ...prev.notification, title: e.target.value }
                    } : null)}
                    placeholder="Bildirim başlığı"
                  />
                </div>
                
                <div className="form-group">
                  <label>Bildirim Mesajı *</label>
                  <textarea
                    value={editingRule.notification.message}
                    onChange={(e) => setEditingRule(prev => prev ? { 
                      ...prev, 
                      notification: { ...prev.notification, message: e.target.value }
                    } : null)}
                    placeholder="Bildirim mesajı"
                    rows={3}
                  />
                </div>
                
                <div className="form-group">
                  <label>Tür</label>
                  <select
                    value={editingRule.notification.type}
                    onChange={(e) => setEditingRule(prev => prev ? { 
                      ...prev, 
                      notification: { ...prev.notification, type: e.target.value as 'info' | 'success' | 'warning' | 'error' | 'request' | 'approval' | 'reminder' | 'announcement' }
                    } : null)}
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
                    value={editingRule.notification.category}
                    onChange={(e) => setEditingRule(prev => prev ? { 
                      ...prev, 
                      notification: { ...prev.notification, category: e.target.value as 'academic' | 'administrative' | 'social' | 'technical' | 'security' | 'general' }
                    } : null)}
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
                    value={editingRule.notification.priority}
                    onChange={(e) => setEditingRule(prev => prev ? { 
                      ...prev, 
                      notification: { ...prev.notification, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' }
                    } : null)}
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                    <option value="urgent">Acil</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Alıcı Türü</label>
                  <select
                    value={editingRule.recipients.type}
                    onChange={(e) => setEditingRule(prev => prev ? { 
                      ...prev, 
                      recipients: { ...prev.recipients, type: e.target.value as 'all' | 'role' | 'specific' | 'event_related' }
                    } : null)}
                  >
                    <option value="all">Tüm Kullanıcılar</option>
                    <option value="role">Rol Bazlı</option>
                    <option value="specific">Belirli Kullanıcılar</option>
                    <option value="event_related">Olayla İlgili Kullanıcılar</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
              >
                İptal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdateRule}
                disabled={!editingRule.name || !editingRule.event || !editingRule.notification.title || !editingRule.notification.message}
              >
                <Edit className="icon" />
                Güncelle
              </button>
            </div>
          </div>
        </div>
      )}
    </ModernDashboardLayout>
  );
};

export default NotificationAutomationPage;
