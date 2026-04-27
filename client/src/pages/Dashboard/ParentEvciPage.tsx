import { useEffect, useState } from 'react';
import {
  Home,
  Calendar,
  MapPin,
  User,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield,
  Clock,
} from 'lucide-react';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { EvciService } from '../../utils/apiService';
import { toast } from 'sonner';

import './ParentEvciPage.css';

interface EvciTalep {
  _id: string;
  studentId: string;
  studentName: string;
  startDate: string;
  endDate: string;
  destination: string;
  willGo: boolean;
  status: 'pending' | 'approved' | 'rejected';
  parentApproval: 'pending' | 'approved' | 'rejected';
  parentApprovalAt?: string;
  weekOf?: string;
  createdAt: string;
  updatedAt: string;
}

interface Student {
  id: string;
  adSoyad: string;
  sinif?: string;
  sube?: string;
  oda?: string;
  pansiyon?: boolean;
}

export default function ParentEvciPage() {
  const { user: authUser } = useAuthGuard(['parent']);

  const [children, setChildren] = useState<Student[]>([]);
  const [requests, setRequests] = useState<EvciTalep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string>('all');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = async () => {
    if (!authUser) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await EvciService.getEvciRequestsByParent(authUser.id);
      if (apiError) {
        setError('Veriler yüklenirken bir hata oluştu: ' + apiError);
        return;
      }

      const response = data as { requests: EvciTalep[]; children: Student[] };
      setChildren(response.children || []);
      setRequests(response.requests || []);

      if (response.children?.length > 0 && selectedChild === 'all') {
        // Default: tüm çocuklar
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Veriler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [authUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Modal escape key handler and body scroll lock
  useEffect(() => {
    if (!rejectModalOpen) return;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRejectModalOpen(false);
        setRejectingId(null);
        setRejectReason('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [rejectModalOpen]);

  const handleRefresh = async () => {
    await fetchData();
    toast.success('Veriler yenilendi');
  };

  const handleApprove = async (id: string) => {
    try {
      const { error: apiError } = await EvciService.approveEvciRequest(id);
      if (apiError) {
        toast.error('Onaylama hatası: ' + apiError);
        return;
      }
      // Local state güncelle
      setRequests((prev) =>
        prev.map((r) =>
          r._id === id
            ? {
                ...r,
                parentApproval: 'approved' as const,
                parentApprovalAt: new Date().toISOString(),
              }
            : r,
        ),
      );
      toast.success('Evci talebi onaylandı');
    } catch (err) {
      console.error('Error approving request:', err);
      toast.error('Onaylama sırasında bir hata oluştu');
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectingId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectingId) return;

    try {
      const { error: apiError } = await EvciService.rejectEvciRequest(
        rejectingId,
        rejectReason || undefined,
      );
      if (apiError) {
        toast.error('Reddetme hatası: ' + apiError);
        return;
      }
      setRequests((prev) =>
        prev.map((r) =>
          r._id === rejectingId
            ? {
                ...r,
                parentApproval: 'rejected' as const,
                parentApprovalAt: new Date().toISOString(),
              }
            : r,
        ),
      );
      toast.success('Evci talebi reddedildi');
      setRejectModalOpen(false);
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast.error('Reddetme sırasında bir hata oluştu');
    }
  };

  const filteredRequests =
    selectedChild === 'all' ? requests : requests.filter((r) => r.studentId === selectedChild);

  const formatDate = (dateString: string) => {
    // startDate/endDate may contain day names like "Perşembe 16:00" (not ISO dates)
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) {
      return dateString; // Zaten okunabilir format (ör. "Perşembe 16:00")
    }
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return parsed.toLocaleString('tr-TR', options);
  };

  const getParentApprovalBadge = (approval: string) => {
    switch (approval) {
      case 'approved':
        return { text: 'Onaylandı', className: 'parent-approved', icon: <CheckCircle size={14} /> };
      case 'rejected':
        return { text: 'Reddedildi', className: 'parent-rejected', icon: <XCircle size={14} /> };
      case 'pending':
      default:
        return { text: 'Onay Bekliyor', className: 'parent-pending', icon: <Clock size={14} /> };
    }
  };

  const breadcrumb = [{ label: 'Ana Sayfa', path: '/parent' }, { label: 'Evci Çıkış İşlemleri' }];

  if (isLoading) {
    return (
      <ModernDashboardLayout pageTitle="Evci Çıkış İşlemleri" breadcrumb={breadcrumb}>
        <div className="parent-evci-page">
          <div className="loading-container">
            <RefreshCw className="loading-icon spin" />
            <p>Yükleniyor...</p>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  if (error) {
    return (
      <ModernDashboardLayout pageTitle="Evci Çıkış İşlemleri" breadcrumb={breadcrumb}>
        <div className="parent-evci-page">
          <div className="error-container">
            <AlertCircle className="error-icon" />
            <h2>Hata Oluştu</h2>
            <p>{error}</p>
            <button onClick={handleRefresh} className="btn btn-primary">
              Tekrar Dene
            </button>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Evci Çıkış İşlemleri" breadcrumb={breadcrumb}>
      <div className="parent-evci-page">
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-title-section">
              <Home className="page-icon" />
              <h1 className="page-title-main">Evci Çıkış İşlemleri</h1>
            </div>
            <button
              onClick={handleRefresh}
              className="btn btn-primary"
              disabled={isLoading}
              aria-label="Yenile"
            >
              <RefreshCw className={`icon ${isLoading ? 'spin' : ''}`} />
              <span>Yenile</span>
            </button>
          </div>
        </div>

        <div className="content-card">
          <div className="card-actions">
            <div className="child-selector">
              <label htmlFor="childSelect" className="selector-label">
                Öğrenci Seçin:
              </label>
              <select
                id="childSelect"
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="select-input"
                disabled={isLoading}
              >
                <option value="all">Tüm Çocuklar</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.adSoyad} {child.sinif ? `(${child.sinif}${child.sube || ''})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card-content">
            {filteredRequests.length === 0 ? (
              <div className="empty-state">
                <Home className="empty-icon" />
                <h3>Henüz evci çıkış talebi bulunmuyor</h3>
                <p>Öğrencinize ait evci çıkış talepleri burada görünecektir.</p>
              </div>
            ) : (
              <div className="parent-evci-requests-grid">
                {filteredRequests.map((request) => {
                  const badge = getParentApprovalBadge(request.parentApproval);
                  return (
                    <div key={request._id} className="request-card">
                      <div className="request-header">
                        <h3 className="request-title">
                          {request.willGo ? request.destination || 'Evci' : 'Evciye Gitmeyecek'}
                        </h3>
                        <div className="request-badges">
                          <span
                            className={`status-badge ${request.willGo ? 'going' : 'not-going'}`}
                          >
                            {request.willGo ? 'Gidecek' : 'Gitmeyecek'}
                          </span>
                          <span className={`parent-approval-badge ${badge.className}`}>
                            {badge.icon} {badge.text}
                          </span>
                        </div>
                      </div>

                      <div className="request-details">
                        <div className="detail-row">
                          <User className="detail-icon" />
                          <div>
                            <span className="detail-label">Öğrenci:</span>
                            <span className="detail-value">{request.studentName}</span>
                          </div>
                        </div>

                        {request.willGo && (
                          <>
                            <div className="detail-row">
                              <Calendar className="detail-icon" />
                              <div>
                                <span className="detail-label">Tarih:</span>
                                <span className="detail-value">
                                  {formatDate(request.startDate)} - {formatDate(request.endDate)}
                                </span>
                              </div>
                            </div>

                            <div className="detail-row">
                              <MapPin className="detail-icon" />
                              <div>
                                <span className="detail-label">Yer:</span>
                                <span className="detail-value">{request.destination}</span>
                              </div>
                            </div>
                          </>
                        )}

                        <div className="detail-row">
                          <Clock className="detail-icon" />
                          <div>
                            <span className="detail-label">Oluşturulma:</span>
                            <span className="detail-value">{formatDate(request.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {request.parentApproval === 'pending' && (
                        <div className="approval-actions">
                          <button
                            onClick={() => handleApprove(request._id)}
                            className="btn btn-approve"
                          >
                            <CheckCircle size={18} />
                            Onayla
                          </button>
                          <button
                            onClick={() => handleRejectClick(request._id)}
                            className="btn btn-reject"
                          >
                            <XCircle size={18} />
                            Reddet
                          </button>
                        </div>
                      )}

                      {request.parentApproval !== 'pending' && request.parentApprovalAt && (
                        <div className="request-footer">
                          <span className="approval-date">
                            <Shield size={14} />
                            {request.parentApproval === 'approved' ? 'Onay' : 'Red'} tarihi:{' '}
                            {formatDate(request.parentApprovalAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* Reject Reason Modal */}
        {rejectModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">Red Sebebi</h3>
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="modal-close"
                  aria-label="Kapat"
                >
                  <XCircle size={20} />
                </button>
              </div>
              <div className="modal-body">
                <p className="reject-modal-desc">
                  Evci talebini neden reddettiğinizi belirtebilirsiniz (isteğe bağlı):
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="form-control reject-textarea"
                  rows={3}
                  placeholder="Red sebebi (isteğe bağlı)"
                />
                <div className="form-actions reject-modal-actions">
                  <button onClick={() => setRejectModalOpen(false)} className="btn btn-secondary">
                    İptal
                  </button>
                  <button onClick={confirmReject} className="btn btn-reject">
                    <XCircle size={16} />
                    Reddet
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}
