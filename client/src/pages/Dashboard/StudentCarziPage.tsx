import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ShoppingBag, Calendar, Clock, MapPin, FileText, CheckCircle, XCircle, Clock as ClockIcon } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';
import axios from 'axios';

interface CarziRequest {
  _id: string;
  studentId: string;
  studentName?: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  parentApproval: 'pending' | 'approved' | 'rejected';
  parentApprovedBy?: string;
  parentApprovedAt?: string;
  adminNote?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const StudentCarziPage: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<CarziRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!user || user.rol !== 'student') {
      navigate('/login');
      return;
    }

    // Check if student is in dormitory
    if (!user.pansiyon) {
      toast.error('Sadece pansiyon öğrencileri çarşı izni talep edebilir');
      navigate(`/${user.rol}`);
      return;
    }

    loadRequests();
  }, [user, navigate]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/carzi-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setRequests(response.data.requests || []);
      }
    } catch (error: any) {
      console.error('Error loading requests:', error);
      toast.error('İzin talepleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !startTime || !endTime) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    // Validate time
    if (startTime >= endTime) {
      toast.error('Bitiş saati başlangıç saatinden sonra olmalıdır');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post('/api/carzi-requests', {
        date,
        startTime,
        endTime,
        reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('Çarşı izni talebi oluşturuldu');
        setShowForm(false);
        setDate('');
        setStartTime('');
        setEndTime('');
        setReason('');
        loadRequests();
      }
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.response?.data?.error || 'İzin talebi oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu izin talebini silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.delete(`/api/carzi-requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('İzin talebi silindi');
        loadRequests();
      }
    } catch (error: any) {
      console.error('Error deleting request:', error);
      toast.error(error.response?.data?.error || 'İzin talebi silinemedi');
    }
  };

  const getStatusBadge = (request: CarziRequest) => {
    if (request.status === 'approved') {
      return <span style={{ padding: '4px 12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>Onaylandı</span>;
    } else if (request.status === 'rejected') {
      return <span style={{ padding: '4px 12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>Reddedildi</span>;
    } else if (request.parentApproval === 'pending') {
      return <span style={{ padding: '4px 12px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>Veli Onayı Bekleniyor</span>;
    } else if (request.parentApproval === 'rejected') {
      return <span style={{ padding: '4px 12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>Veli Reddetti</span>;
    } else {
      return <span style={{ padding: '4px 12px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>Beklemede</span>;
    }
  };

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Çarşı İzni" breadcrumb={[{ label: 'Ana Sayfa', path: '/student' }, { label: 'Çarşı İzni' }]}>
        <div className="centered-spinner">
          <div className="spinner"></div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout
      pageTitle="Çarşı İzni"
      breadcrumb={[
        { label: 'Ana Sayfa', path: '/student' },
        { label: 'Çarşı İzni' }
      ]}
    >
      <BackButton />
      
      <div className="dashboard-content" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Çarşı İzni Talepleri</h2>
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
              <ShoppingBag className="w-4 h-4" />
              Yeni İzin Talebi
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Yeni Çarşı İzni Talebi</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Tarih</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Başlangıç Saati</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Bitiş Saati</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>İzin Nedeni (Opsiyonel)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="İzin nedeninizi açıklayın"
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
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
                {submitting ? 'Gönderiliyor...' : 'Talep Oluştur'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setDate('');
                  setStartTime('');
                  setEndTime('');
                  setReason('');
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

        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <ShoppingBag className="w-12 h-12" style={{ margin: '0 auto 10px', color: '#9ca3af' }} />
            <p style={{ color: '#6b7280', fontSize: '16px' }}>Henüz çarşı izni talebiniz yok</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {requests.map(request => (
              <div
                key={request._id}
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
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <span style={{ fontWeight: '600', fontSize: '16px' }}>{new Date(request.date).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                      <ClockIcon className="w-4 h-4 text-gray-500" />
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>
                        {request.startTime} - {request.endTime}
                      </span>
                    </div>
                    {request.reason && (
                      <div style={{ display: 'flex', alignItems: 'start', gap: '10px', marginTop: '10px' }}>
                        <FileText className="w-4 h-4 text-gray-500" style={{ marginTop: '2px' }} />
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>{request.reason}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '10px' }}>
                    {getStatusBadge(request)}
                    {request.status === 'pending' && (
                      <button
                        onClick={() => handleDelete(request._id)}
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

                {request.adminNote && (
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      <strong>Yönetici Notu:</strong> {request.adminNote}
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

export default StudentCarziPage;

