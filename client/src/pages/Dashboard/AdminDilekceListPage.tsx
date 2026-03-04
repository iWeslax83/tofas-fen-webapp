import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FileText, Filter, Search, User, Mail, Calendar, Tag } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import './AdminDilekceListPage.css';

import { apiClient } from '../../utils/api';

interface Dilekce {
  _id: string;
  userId: string;
  userName: string;
  userRole: string;
  type: 'izin' | 'rapor' | 'nakil' | 'diger';
  subject: string;
  content: string;
  attachments?: string[];
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';
  priority: 'low' | 'medium' | 'high';
  category?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  response?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const AdminDilekceListPage: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const [dilekceler, setDilekceler] = useState<Dilekce[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user || user.rol !== 'admin') {
      navigate('/login');
      return;
    }

    loadDilekceler();
  }, [user, navigate]);

  const loadDilekceler = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/dilekce');

      if (response.data.success) {
        setDilekceler(response.data.dilekceler || []);
      }
    } catch (error: unknown) {
      console.error('Error loading dilekce:', error);
      toast.error('Dilekçeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string, reviewNote?: string, response?: string) => {
    try {
      const response_data = await apiClient.put(`/api/dilekce/${id}/status`, {
        status,
        reviewNote,
        response
      });

      if (response_data.data.success) {
        toast.success('Dilekçe durumu güncellendi');
        loadDilekceler();
      }
    } catch (error: unknown) {
      console.error('Error updating status:', error);
      const msg = (error as any)?.response?.data?.error || 'İşlem başarısız';
      toast.error(msg);
    }
  };

  const filteredDilekceler = dilekceler.filter(dilekce => {
    if (filterStatus !== 'all' && dilekce.status !== filterStatus) return false;
    if (filterType !== 'all' && dilekce.type !== filterType) return false;
    if (filterPriority !== 'all' && dilekce.priority !== filterPriority) return false;
    if (searchTerm && !dilekce.subject.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !dilekce.userName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (dilekce: Dilekce) => {
    const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: '#dbeafe', color: '#1e40af', label: 'Beklemede' },
      in_review: { bg: '#fef3c7', color: '#92400e', label: 'İnceleniyor' },
      approved: { bg: '#d1fae5', color: '#065f46', label: 'Onaylandı' },
      rejected: { bg: '#f3f4f6', color: '#6b7280', label: 'Reddedildi' },
      completed: { bg: '#d1fae5', color: '#065f46', label: 'Tamamlandı' }
    };

    const config = statusConfig[dilekce.status] || statusConfig.pending;
    return (
      <span className="badge" style={{
        padding: '4px 12px',
        backgroundColor: config.bg,
        color: config.color,
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { bg: string; color: string; label: string }> = {
      low: { bg: '#f3f4f6', color: '#6b7280', label: 'Düşük' },
      medium: { bg: '#fef3c7', color: '#92400e', label: 'Orta' },
      high: { bg: '#fef3c7', color: '#92400e', label: 'Yüksek' }
    };

    const config = priorityConfig[priority] || priorityConfig.medium;
    return (
      <span style={{
        padding: '4px 8px',
        backgroundColor: config.bg,
        color: config.color,
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: '500'
      }}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Dilekçe Yönetimi" breadcrumb={[{ label: 'Ana Sayfa', path: '/admin' }, { label: 'Dilekçe Yönetimi' }]}>
        <div className="admin-dilekce-page">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Dilekçeler yükleniyor...</p>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout
      pageTitle="Dilekçe Yönetimi"
      breadcrumb={[
        { label: 'Ana Sayfa', path: '/admin' },
        { label: 'Dilekçe Yönetimi' }
      ]}
    >
      <div className="admin-dilekce-page">
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-title-section">
              <FileText className="page-icon" />
              <h1 className="page-title-main">Dilekçe Yönetimi</h1>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-section">
          <div className="filter-group">
            <Search className="filter-icon" />
            <input
              type="text"
              placeholder="Konu veya kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="filter-input"
              style={{ width: '250px' }}
            />
          </div>

          <div className="filter-group">
            <Filter className="filter-icon" />
            <label className="filter-label">Durum:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Beklemede</option>
              <option value="in_review">İnceleniyor</option>
              <option value="approved">Onaylandı</option>
              <option value="rejected">Reddedildi</option>
              <option value="completed">Tamamlandı</option>
            </select>
          </div>

          <div className="filter-group">
            <Filter className="filter-icon" />
            <label className="filter-label">Tür:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tüm Türler</option>
              <option value="izin">İzin</option>
              <option value="rapor">Rapor</option>
              <option value="nakil">Nakil</option>
              <option value="diger">Diğer</option>
            </select>
          </div>

          <div className="filter-group">
            <Filter className="filter-icon" />
            <label className="filter-label">Öncelik:</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tüm Öncelikler</option>
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
            </select>
          </div>
        </div>

        <div className="requests-container">
          {filteredDilekceler.length === 0 ? (
            <div className="empty-state">
              <FileText className="empty-icon" />
              <h3>Dilekçe bulunamadı</h3>
              <p>Filtrelenen kriterlere uygun dilekçe başvurusu bulunamadı.</p>
            </div>
          ) : (
            <div className="requests-grid">
              {filteredDilekceler.map(dilekce => (
                <div key={dilekce._id} className="request-card">
                  <div className="card-header">
                    <div className="card-header-left">
                      <h3 className="card-title">
                        {dilekce.subject}
                        {getPriorityBadge(dilekce.priority)}
                      </h3>
                    </div>
                    <div className="card-header-right">
                      {getStatusBadge(dilekce)}
                    </div>
                  </div>

                  <div className="card-content">
                    <div className="request-info">
                      <div className="info-item">
                        <User className="info-icon" />
                        <span className="info-label">Gönderen:</span>
                        <span className="info-value">
                          {dilekce.userName} ({dilekce.userRole === 'student' ? 'Öğrenci' : dilekce.userRole === 'teacher' ? 'Öğretmen' : 'Veli'})
                        </span>
                      </div>
                      <div className="info-item">
                        <Tag className="info-icon" />
                        <span className="info-label">Tür:</span>
                        <span className="info-value">
                          {dilekce.type === 'izin' ? 'İzin' : dilekce.type === 'rapor' ? 'Rapor' : dilekce.type === 'nakil' ? 'Nakil' : 'Diğer'}
                          {dilekce.category && ` - ${dilekce.category}`}
                        </span>
                      </div>
                      <div className="info-item">
                        <Calendar className="info-icon" />
                        <span className="info-label">Tarih:</span>
                        <span className="info-value">
                          {new Date(dilekce.createdAt).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="content-box">
                      {dilekce.content}
                    </div>

                    {dilekce.attachments && dilekce.attachments.length > 0 && (
                      <div className="attachment-list">
                        {dilekce.attachments.map((file, index) => (
                          <a
                            key={index}
                            href={file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="attachment-link"
                          >
                            <Mail className="w-3 h-3" />
                            Dosya {index + 1}
                          </a>
                        ))}
                      </div>
                    )}

                    {dilekce.reviewNote && (
                      <div className="note-box">
                        <strong>İnceleme Notu:</strong> {dilekce.reviewNote}
                      </div>
                    )}

                    {dilekce.response && (
                      <div className="response-box">
                        <strong>Yanıt:</strong> {dilekce.response}
                      </div>
                    )}

                    <div className="action-buttons">
                      {dilekce.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              const note = window.prompt('İnceleme notu (opsiyonel):');
                              handleStatusUpdate(dilekce._id, 'in_review', note || undefined);
                            }}
                            className="btn btn-warning"
                          >
                            İncelemeye Al
                          </button>
                          <button
                            onClick={() => {
                              const note = window.prompt('Onay notu (opsiyonel):');
                              handleStatusUpdate(dilekce._id, 'approved', note || undefined);
                            }}
                            className="btn btn-success"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => {
                              const note = window.prompt('Red nedeni (opsiyonel):');
                              handleStatusUpdate(dilekce._id, 'rejected', note || undefined);
                            }}
                            className="btn btn-danger"
                          >
                            Reddet
                          </button>
                        </>
                      )}
                      {dilekce.status === 'in_review' && (
                        <>
                          <button
                            onClick={() => {
                              const response = window.prompt('Yanıt (opsiyonel):');
                              handleStatusUpdate(dilekce._id, 'completed', undefined, response || undefined);
                            }}
                            className="btn btn-success"
                          >
                            Tamamla
                          </button>
                          <button
                            onClick={() => {
                              const note = window.prompt('Red nedeni (opsiyonel):');
                              handleStatusUpdate(dilekce._id, 'rejected', note || undefined);
                            }}
                            className="btn btn-danger"
                          >
                            Reddet
                          </button>
                        </>
                      )}
                      {dilekce.status === 'approved' && (
                        <button
                          onClick={() => {
                            const response = window.prompt('Yanıt:');
                            if (response) {
                              handleStatusUpdate(dilekce._id, 'completed', undefined, response || undefined);
                            }
                          }}
                          className="btn btn-success"
                        >
                          Tamamla
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModernDashboardLayout>
  );
};

export default AdminDilekceListPage;

