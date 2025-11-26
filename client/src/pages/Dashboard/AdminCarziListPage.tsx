import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ShoppingBag, Calendar, Clock, CheckCircle, XCircle, Filter, Search } from 'lucide-react';
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

const AdminCarziListPage: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<CarziRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterParentApproval, setFilterParentApproval] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user || !['admin', 'teacher'].includes(user.rol || '')) {
      navigate('/login');
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

  const handleApprove = async (id: string, approved: boolean, adminNote?: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(`/api/carzi-requests/${id}/approve`, {
        approved,
        adminNote
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success(approved ? 'İzin talebi onaylandı' : 'İzin talebi reddedildi');
        loadRequests();
      }
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.response?.data?.error || 'İşlem başarısız');
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filterStatus !== 'all' && request.status !== filterStatus) return false;
    if (filterParentApproval !== 'all' && request.parentApproval !== filterParentApproval) return false;
    if (searchTerm && !request.studentName?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Çarşı İzni Yönetimi" breadcrumb={[{ label: 'Ana Sayfa', path: `/${user?.rol}` }, { label: 'Çarşı İzni Yönetimi' }]}>
        <div className="centered-spinner">
          <div className="spinner"></div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout
      pageTitle="Çarşı İzni Yönetimi"
      breadcrumb={[
        { label: 'Ana Sayfa', path: `/${user?.rol}` },
        { label: 'Çarşı İzni Yönetimi' }
      ]}
    >
      <BackButton />
      
      <div className="dashboard-content" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>Çarşı İzni Talepleri</h2>

        {/* Filters */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Öğrenci ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', width: '200px' }}
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
              <option value="approved">Onaylandı</option>
              <option value="rejected">Reddedildi</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={filterParentApproval}
              onChange={(e) => setFilterParentApproval(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
              <option value="all">Tüm Veli Onayları</option>
              <option value="pending">Veli Onayı Bekleniyor</option>
              <option value="approved">Veli Onayladı</option>
              <option value="rejected">Veli Reddetti</option>
            </select>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <ShoppingBag className="w-12 h-12" style={{ margin: '0 auto 10px', color: '#9ca3af' }} />
            <p style={{ color: '#6b7280', fontSize: '16px' }}>İzin talebi bulunamadı</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {filteredRequests.map(request => (
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
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>
                      {request.studentName || request.studentId}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', color: '#6b7280' }}>
                        <Calendar className="w-4 h-4" />
                        {new Date(request.date).toLocaleDateString('tr-TR')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', color: '#6b7280' }}>
                        <Clock className="w-4 h-4" />
                        {request.startTime} - {request.endTime}
                      </div>
                    </div>
                    {request.reason && (
                      <p style={{ fontSize: '14px', color: '#374151', marginTop: '10px' }}>
                        <strong>Neden:</strong> {request.reason}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: request.parentApproval === 'approved' ? '#d1fae5' : request.parentApproval === 'rejected' ? '#fee2e2' : '#fef3c7',
                        color: request.parentApproval === 'approved' ? '#065f46' : request.parentApproval === 'rejected' ? '#991b1b' : '#92400e',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Veli: {request.parentApproval === 'approved' ? 'Onayladı' : request.parentApproval === 'rejected' ? 'Reddetti' : 'Beklemede'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '10px' }}>
                    <span style={{
                      padding: '4px 12px',
                      backgroundColor: request.status === 'approved' ? '#d1fae5' : request.status === 'rejected' ? '#fee2e2' : '#dbeafe',
                      color: request.status === 'approved' ? '#065f46' : request.status === 'rejected' ? '#991b1b' : '#1e40af',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {request.status === 'approved' ? 'Onaylandı' : request.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                    </span>
                    {request.status === 'pending' && request.parentApproval === 'approved' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            const note = window.prompt('Onay notu (opsiyonel):');
                            handleApprove(request._id, true, note || undefined);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Onayla
                        </button>
                        <button
                          onClick={() => {
                            const note = window.prompt('Red nedeni (opsiyonel):');
                            handleApprove(request._id, false, note || undefined);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <XCircle className="w-4 h-4" />
                          Reddet
                        </button>
                      </div>
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

export default AdminCarziListPage;

