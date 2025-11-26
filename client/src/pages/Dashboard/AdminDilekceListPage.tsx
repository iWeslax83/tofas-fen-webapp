import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FileText, Filter, Search, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
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

  const handleStatusUpdate = async (id: string, status: string, reviewNote?: string, response?: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response_data = await axios.put(`/api/dilekce/${id}/status`, {
        status,
        reviewNote,
        response
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response_data.data.success) {
        toast.success('Dilekçe durumu güncellendi');
        loadDilekceler();
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.error || 'İşlem başarısız');
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
      <ModernDashboardLayout pageTitle="Dilekçe Yönetimi" breadcrumb={[{ label: 'Ana Sayfa', path: '/admin' }, { label: 'Dilekçe Yönetimi' }]}>
        <div className="centered-spinner">
          <div className="spinner"></div>
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
      <BackButton />
      
      <div className="dashboard-content" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>Dilekçe Yönetimi</h2>

        {/* Filters */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Konu veya kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', width: '250px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Beklemede</option>
              <option value="in_review">İnceleniyor</option>
              <option value="approved">Onaylandı</option>
              <option value="rejected">Reddedildi</option>
              <option value="completed">Tamamlandı</option>
            </select>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
          >
            <option value="all">Tüm Türler</option>
            <option value="izin">İzin</option>
            <option value="rapor">Rapor</option>
            <option value="nakil">Nakil</option>
            <option value="diger">Diğer</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
          >
            <option value="all">Tüm Öncelikler</option>
            <option value="low">Düşük</option>
            <option value="medium">Orta</option>
            <option value="high">Yüksek</option>
          </select>
        </div>

        {filteredDilekceler.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <FileText className="w-12 h-12" style={{ margin: '0 auto 10px', color: '#9ca3af' }} />
            <p style={{ color: '#6b7280', fontSize: '16px' }}>Dilekçe bulunamadı</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {filteredDilekceler.map(dilekce => (
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
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px' }}>
                      <strong>Gönderen:</strong> {dilekce.userName} ({dilekce.userRole === 'student' ? 'Öğrenci' : dilekce.userRole === 'teacher' ? 'Öğretmen' : 'Veli'})
                    </p>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px' }}>
                      <strong>Tür:</strong> {dilekce.type === 'izin' ? 'İzin' : dilekce.type === 'rapor' ? 'Rapor' : dilekce.type === 'nakil' ? 'Nakil' : 'Diğer'}
                      {dilekce.category && ` - ${dilekce.category}`}
                    </p>
                    <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', marginBottom: '10px', maxHeight: '100px', overflow: 'auto' }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '120px' }}>
                        <button
                          onClick={() => {
                            const note = window.prompt('İnceleme notu (opsiyonel):');
                            handleStatusUpdate(dilekce._id, 'in_review', note || undefined);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#f59e0b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          İncelemeye Al
                        </button>
                        <button
                          onClick={() => {
                            const note = window.prompt('Onay notu (opsiyonel):');
                            handleStatusUpdate(dilekce._id, 'approved', note);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          Onayla
                        </button>
                        <button
                          onClick={() => {
                            const note = window.prompt('Red nedeni (opsiyonel):');
                            handleStatusUpdate(dilekce._id, 'rejected', note);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          Reddet
                        </button>
                      </div>
                    )}
                    {dilekce.status === 'in_review' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '120px' }}>
                        <button
                          onClick={() => {
                            const response = window.prompt('Yanıt (opsiyonel):');
                            handleStatusUpdate(dilekce._id, 'completed', undefined, response);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          Tamamla
                        </button>
                        <button
                          onClick={() => {
                            const note = window.prompt('Red nedeni (opsiyonel):');
                            handleStatusUpdate(dilekce._id, 'rejected', note);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          Reddet
                        </button>
                      </div>
                    )}
                    {dilekce.status === 'approved' && (
                      <button
                        onClick={() => {
                          const response = window.prompt('Yanıt:');
                          if (response) {
                            handleStatusUpdate(dilekce._id, 'completed', undefined, response);
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        Tamamla
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

export default AdminDilekceListPage;

