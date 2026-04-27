import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileText, X, Plus, Calendar, Tag, Trash2, Mail } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import './DilekcePage.css';
import { apiClient } from '../../utils/api';
import { extractError } from '../../utils/apiResponseHandler';

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

const DilekcePage: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const [dilekceler, setDilekceler] = useState<Dilekce[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [type, setType] = useState<'izin' | 'rapor' | 'nakil' | 'diger'>('izin');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    if (!user || !['student', 'teacher', 'parent'].includes(user.rol || '')) {
      navigate('/login');
      return;
    }

    loadDilekceler();
  }, [user, navigate]);

  const loadDilekceler = async () => {
    try {
      setLoading(true);

      // Veliler için hem kendi hem çocuklarının dilekçelerini çek
      const includeChildren = user?.rol === 'parent' ? '?includeChildren=true' : '';

      const response = await apiClient.get(`/api/dilekce${includeChildren}`);

      if (response.data.success) {
        setDilekceler(response.data.dilekceler || []);
      }
    } catch (error: any) {
      console.error('Error loading dilekce:', error);
      toast.error('Dilekçeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (attachments.length + files.length > 5) {
        toast.error('Maksimum 5 dosya yükleyebilirsiniz');
        return;
      }
      setAttachments((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject || !content) {
      toast.error('Lütfen konu ve içerik alanlarını doldurun');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('subject', subject);
      formData.append('content', content);
      formData.append('priority', priority);
      if (category) formData.append('category', category);

      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await apiClient.post('/api/dilekce', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success('Dilekçe oluşturuldu');
        setShowForm(false);
        setType('izin');
        setSubject('');
        setContent('');
        setPriority('medium');
        setCategory('');
        setAttachments([]);
        loadDilekceler();
      }
    } catch (error: any) {
      console.error('Error submitting dilekce:', error);
      const message = extractError(error) || 'Dilekçe oluşturulamadı';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu dilekçeyi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/api/dilekce/${id}`);

      if (response.data.success) {
        toast.success('Dilekçe silindi');
        loadDilekceler();
      }
    } catch (error: any) {
      console.error('Error deleting dilekce:', error);
      const message = extractError(error) || 'Dilekçe silinemedi';
      toast.error(message);
    }
  };

  const getStatusBadge = (dilekce: Dilekce) => {
    const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: '#dbeafe', color: '#1e40af', label: 'Beklemede' },
      in_review: { bg: '#fef3c7', color: '#92400e', label: 'İnceleniyor' },
      approved: { bg: '#d1fae5', color: '#065f46', label: 'Onaylandı' },
      rejected: { bg: '#f3f4f6', color: '#6b7280', label: 'Reddedildi' },
      completed: { bg: '#d1fae5', color: '#065f46', label: 'Tamamlandı' },
    };

    const config = statusConfig[dilekce.status] || statusConfig.pending;
    return (
      <span
        className="badge"
        style={{
          backgroundColor: config.bg,
          color: config.color,
        }}
      >
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { bg: string; color: string; label: string }> = {
      low: { bg: '#f3f4f6', color: '#6b7280', label: 'Düşük' },
      medium: { bg: '#fef3c7', color: '#92400e', label: 'Orta' },
      high: { bg: '#fef3c7', color: '#92400e', label: 'Yüksek' },
    };

    const config = priorityConfig[priority] || priorityConfig.medium;
    return (
      <span
        className="badge"
        style={{
          backgroundColor: config.bg,
          color: config.color,
        }}
      >
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <ModernDashboardLayout
        pageTitle="Dilekçe"
        breadcrumb={[{ label: 'Ana Sayfa', path: `/${user?.rol}` }, { label: 'Dilekçe' }]}
      >
        <div className="dilekce-page">
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
      pageTitle="Dilekçe"
      breadcrumb={[{ label: 'Ana Sayfa', path: `/${user?.rol}` }, { label: 'Dilekçe' }]}
    >
      <div className="dilekce-page">
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-title-section">
              <FileText className="page-icon" />
              <h1 className="page-title-main">Dilekçelerim</h1>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="btn btn-primary"
                style={{ fontSize: '1.125rem', padding: '10px 20px', minHeight: '50px' }}
              >
                <Plus className="w-4 h-4" />
                Yeni Dilekçe Oluştur
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <div className="form-container">
            <div className="form-header">
              <h3 className="form-title">Yeni Dilekçe Başvurusu</h3>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Dilekçe Türü *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    required
                    className="form-control"
                  >
                    <option value="izin">İzin</option>
                    <option value="rapor">Rapor</option>
                    <option value="nakil">Nakil</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Öncelik</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="form-control"
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Kategori (Opsiyonel)</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Örn: Sağlık, Spor, Aile vb."
                    className="form-control"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Konu *</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    maxLength={200}
                    placeholder="Dilekçenizin kısa özet konusu"
                    className="form-control"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">İçerik *</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    maxLength={5000}
                    placeholder="Dilekçenizin detaylı içeriğini buraya yazınız..."
                    className="form-control form-textarea"
                  />
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginTop: '5px',
                      textAlign: 'right',
                    }}
                  >
                    {content.length} / 5000 karakter
                  </p>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Ek Dosyalar (Opsiyonel, Max 5 dosya, 10MB)</label>
                  <div className="file-input-wrapper">
                    <label className="file-input-label">
                      <Mail className="w-5 h-5" />
                      Dosya Seçin veya Sürükleyin
                      <input
                        type="file"
                        onChange={handleFileChange}
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="file-input"
                      />
                    </label>
                  </div>
                  {attachments.length > 0 && (
                    <div className="file-list">
                      {attachments.map((file, index) => (
                        <div key={index} className="file-item">
                          <FileText className="w-4 h-4" />
                          <span>{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="file-remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setType('izin');
                    setSubject('');
                    setContent('');
                    setPriority('medium');
                    setCategory('');
                    setAttachments([]);
                  }}
                  className="btn btn-secondary"
                >
                  İptal
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Gönderiliyor...' : 'Dilekçe Gönder'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="requests-container">
          {dilekceler.length === 0 ? (
            <div className="empty-state">
              <FileText className="empty-icon" />
              <h3>Henüz bir dilekçeniz yok</h3>
              <p>Yeni bir dilekçe başvurusu oluşturmak için yukarıdaki butonu kullanabilirsiniz.</p>
            </div>
          ) : (
            <div className="requests-grid">
              {dilekceler.map((dilekce) => (
                <div key={dilekce._id} className="request-card">
                  <div className="card-header">
                    <div className="card-header-left">
                      <h3 className="card-title">
                        {dilekce.subject}
                        {getPriorityBadge(dilekce.priority)}
                      </h3>
                    </div>
                    <div className="card-header-right">{getStatusBadge(dilekce)}</div>
                  </div>

                  <div className="card-content">
                    <div className="request-owner">
                      <span className="owner-label">Gönderen:</span>
                      <span className="owner-value">
                        {dilekce.userName}
                        {dilekce.userRole === 'student'
                          ? ' (Öğrenci)'
                          : dilekce.userRole === 'parent'
                            ? ' (Veli)'
                            : dilekce.userRole === 'teacher'
                              ? ' (Öğretmen)'
                              : ''}
                      </span>
                    </div>

                    <div className="request-owner">
                      <Tag className="info-icon" />
                      <span className="info-label">Tür:</span>
                      <span className="info-value">
                        {dilekce.type === 'izin'
                          ? 'İzin'
                          : dilekce.type === 'rapor'
                            ? 'Rapor'
                            : dilekce.type === 'nakil'
                              ? 'Nakil'
                              : 'Diğer'}
                        {dilekce.category && ` - ${dilekce.category}`}
                      </span>
                    </div>
                    <div className="request-owner">
                      <Calendar className="info-icon" />
                      <span className="info-label">Tarih:</span>
                      <span className="info-value">
                        {new Date(dilekce.createdAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="content-box">{dilekce.content}</div>

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
                            <FileText className="w-3 h-3" />
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
                  </div>

                  <div className="card-footer">
                    <div className="card-date">
                      Son Güncelleme: {new Date(dilekce.updatedAt).toLocaleDateString('tr-TR')}
                    </div>
                    {dilekce.status === 'pending' && (
                      <div className="action-buttons">
                        <button
                          onClick={() => handleDelete(dilekce._id)}
                          className="btn btn-danger"
                        >
                          <Trash2 className="w-4 h-4" />
                          Başvuruyu İptal Et
                        </button>
                      </div>
                    )}
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

export default DilekcePage;
