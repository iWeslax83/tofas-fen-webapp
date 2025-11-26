import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FileText, Upload, X, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';
import axios from 'axios';

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
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/dilekce', {
        headers: { Authorization: `Bearer ${token}` }
      });

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
      setAttachments(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject || !content) {
      toast.error('Lütfen konu ve içerik alanlarını doldurun');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('type', type);
      formData.append('subject', subject);
      formData.append('content', content);
      formData.append('priority', priority);
      if (category) formData.append('category', category);
      
      attachments.forEach((file, index) => {
        formData.append('attachments', file);
      });

      const response = await axios.post('/api/dilekce', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
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
      toast.error(error.response?.data?.error || 'Dilekçe oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu dilekçeyi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.delete(`/api/dilekce/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('Dilekçe silindi');
        loadDilekceler();
      }
    } catch (error: any) {
      console.error('Error deleting dilekce:', error);
      toast.error(error.response?.data?.error || 'Dilekçe silinemedi');
    }
  };

  const getStatusBadge = (dilekce: Dilekce) => {
    const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: '#dbeafe', color: '#1e40af', label: 'Beklemede' },
      in_review: { bg: '#fef3c7', color: '#92400e', label: 'İnceleniyor' },
      approved: { bg: '#d1fae5', color: '#065f46', label: 'Onaylandı' },
      rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Reddedildi' },
      completed: { bg: '#d1fae5', color: '#065f46', label: 'Tamamlandı' }
    };

    const config = statusConfig[dilekce.status] || statusConfig.pending;
    return (
      <span style={{
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
      high: { bg: '#fee2e2', color: '#991b1b', label: 'Yüksek' }
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
      <ModernDashboardLayout pageTitle="Dilekçe" breadcrumb={[{ label: 'Ana Sayfa', path: `/${user?.rol}` }, { label: 'Dilekçe' }]}>
        <div className="centered-spinner">
          <div className="spinner"></div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout
      pageTitle="Dilekçe"
      breadcrumb={[
        { label: 'Ana Sayfa', path: `/${user?.rol}` },
        { label: 'Dilekçe' }
      ]}
    >
      <BackButton />
      
      <div className="dashboard-content" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Dilekçelerim</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FileText className="w-4 h-4" />
              Yeni Dilekçe
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Yeni Dilekçe</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Dilekçe Türü *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="izin">İzin</option>
                  <option value="rapor">Rapor</option>
                  <option value="nakil">Nakil</option>
                  <option value="diger">Diğer</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Öncelik</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                >
                  <option value="low">Düşük</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yüksek</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Kategori (Opsiyonel)</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Kategori"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Konu *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={200}
                placeholder="Dilekçe konusu"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>İçerik *</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                maxLength={5000}
                placeholder="Dilekçe içeriği"
                rows={8}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>
                {content.length} / 5000 karakter
              </p>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
                Ek Dosyalar (Opsiyonel, Max 5 dosya, 10MB)
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                style={{ marginBottom: '10px' }}
              />
              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <FileText className="w-4 h-4" />
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  fontWeight: '500'
                }}
              >
                {submitting ? 'Gönderiliyor...' : 'Dilekçe Gönder'}
              </button>
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
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                İptal
              </button>
            </div>
          </form>
        )}

        {dilekceler.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <FileText className="w-12 h-12" style={{ margin: '0 auto 10px', color: '#9ca3af' }} />
            <p style={{ color: '#6b7280', fontSize: '16px' }}>Henüz dilekçeniz yok</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {dilekceler.map(dilekce => (
              <div
                key={dilekce._id}
                style={{
                  padding: '20px',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>{dilekce.subject}</h3>
                      {getPriorityBadge(dilekce.priority)}
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        <strong>Tür:</strong> {dilekce.type === 'izin' ? 'İzin' : dilekce.type === 'rapor' ? 'Rapor' : dilekce.type === 'nakil' ? 'Nakil' : 'Diğer'}
                      </span>
                      {dilekce.category && (
                        <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '15px' }}>
                          <strong>Kategori:</strong> {dilekce.category}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', marginBottom: '10px' }}>
                      {dilekce.content}
                    </p>
                    {dilekce.attachments && dilekce.attachments.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '5px' }}>Ek Dosyalar:</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {dilekce.attachments.map((file, index) => (
                            <a
                              key={index}
                              href={file}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 8px',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '4px',
                                fontSize: '12px',
                                color: '#3b82f6',
                                textDecoration: 'none'
                              }}
                            >
                              <FileText className="w-3 h-3" />
                              Dosya {index + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '10px' }}>
                      {new Date(dilekce.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '10px' }}>
                    {getStatusBadge(dilekce)}
                    {dilekce.status === 'pending' && (
                      <button
                        onClick={() => handleDelete(dilekce._id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>

                {dilekce.reviewNote && (
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      <strong>İnceleme Notu:</strong> {dilekce.reviewNote}
                    </p>
                  </div>
                )}

                {dilekce.response && (
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
                    <p style={{ fontSize: '12px', color: '#0369a1', margin: 0 }}>
                      <strong>Yanıt:</strong> {dilekce.response}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
};

export default DilekcePage;

