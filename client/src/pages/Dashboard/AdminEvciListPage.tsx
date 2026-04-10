// src/pages/AdminEvciListPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { EvciService, UserService } from '../../utils/apiService';
import { toast } from 'sonner';
import {
  Home,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  User,
  Filter,
  Shield,
  Download,
  CheckSquare,
  XCircle,
  AlertCircle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Settings2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';

import './AdminEvciListPage.css';

interface EvciTalep {
  _id: string;
  studentId: string;
  studentName?: string;
  startDate: string;
  endDate: string;
  destination: string;
  createdAt: string;
  willGo: boolean;
  parentApproval?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  weekOf?: string;
  status?: string;
}

interface Student {
  id: string;
  adSoyad: string;
  sinif: string;
  sube: string;
  oda?: string;
  pansiyon?: boolean;
}

function getParentApprovalBadge(approval?: string) {
  switch (approval) {
    case 'approved':
      return { text: 'Veli Onayladı', className: 'parent-approved' };
    case 'rejected':
      return { text: 'Veli Reddetti', className: 'parent-rejected' };
    case 'pending':
    default:
      return { text: 'Veli Bekliyor', className: 'parent-pending' };
  }
}

export default function AdminEvciListPage() {
  const { user: authUser } = useAuth(['admin', 'teacher']);
  const [requests, setRequests] = useState<EvciTalep[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newReq, setNewReq] = useState<Partial<EvciTalep>>({ willGo: true });
  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterRoom, setFilterRoom] = useState<string>('All');
  const [filterParentApproval, setFilterParentApproval] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  // Window override
  const [showOverride, setShowOverride] = useState(false);
  const [overrideWeekOf, setOverrideWeekOf] = useState('');
  const [overrideIsOpen, setOverrideIsOpen] = useState(true);
  const [overrideReason, setOverrideReason] = useState('');

  // F-M3/F-M4: previously two useEffects with exhaustive-deps disabled
  // called fetchData at the same time with stale closures. Consolidated into
  // one effect with a stable useCallback that tracks both authUser and page.
  // Validates the server response shape explicitly instead of optimistic
  // `as any` casts.
  const fetchData = useCallback(async (currentPage: number) => {
    try {
      setIsLoading(true);
      const { data: requestsData, error: requestsError } = await EvciService.getEvciRequests(
        currentPage,
        50,
      );

      if (requestsError) {
        if (import.meta.env.DEV) console.error('Error fetching evci requests:', requestsError);
        toast.error('Talepler yüklenirken hata oluştu');
      } else {
        // Runtime shape check — accept either the paginated object
        // { requests, pagination } or a raw array for backwards
        // compatibility, and ignore anything else.
        const resp = requestsData as unknown;
        if (
          resp &&
          typeof resp === 'object' &&
          'requests' in resp &&
          Array.isArray((resp as { requests: unknown }).requests)
        ) {
          const typed = resp as {
            requests: EvciTalep[];
            pagination?: { totalPages?: number; total?: number };
          };
          setRequests(typed.requests);
          setTotalPages(typed.pagination?.totalPages ?? 1);
          setTotalCount(typed.pagination?.total ?? typed.requests.length);
        } else if (Array.isArray(resp)) {
          setRequests(resp as EvciTalep[]);
          setTotalPages(1);
          setTotalCount(resp.length);
        } else {
          setRequests([]);
          setTotalPages(1);
          setTotalCount(0);
        }
      }

      const { data: studentsData, error: studentsError } =
        await UserService.getUsersByRole('student');
      if (studentsError) {
        if (import.meta.env.DEV) console.error('Error fetching students:', studentsError);
      } else {
        setStudents(Array.isArray(studentsData) ? (studentsData as Student[]) : []);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) fetchData(page);
  }, [authUser, page, fetchData]);

  const saveNew = async () => {
    if (
      newReq.studentId &&
      newReq.studentName &&
      newReq.startDate &&
      newReq.endDate &&
      newReq.destination &&
      typeof newReq.willGo === 'boolean'
    ) {
      setIsSubmitting(true);
      try {
        const { error } = await EvciService.createEvciRequest({
          studentId: newReq.studentId,
          willGo: newReq.willGo,
          startDate: newReq.startDate,
          endDate: newReq.endDate,
          destination: newReq.destination,
        });

        if (error) {
          toast.error(error);
        } else {
          toast.success('Evci talebi başarıyla eklendi');
          await fetchData(page);
          setShowForm(false);
          setNewReq({ willGo: true });
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error creating evci request:', error);
        toast.error('Evci talebi oluşturulurken hata oluştu');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      toast.error('Lütfen tüm alanları doldurun');
    }
  };

  // F-M6: memoize row-level handlers so row components (Trash button,
  // checkbox) get a stable function identity and don't re-render on every
  // parent state change (filters, pagination, etc).
  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Bu talebi silmek istediğinize emin misiniz?')) return;
    try {
      const { error } = await EvciService.deleteEvciRequest(id);
      if (error) {
        toast.error(error);
      } else {
        setRequests((reqs) => reqs.filter((r) => r._id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.success('Evci talebi başarıyla silindi');
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error deleting evci request:', error);
      toast.error('Evci talebi silinirken hata oluştu');
    }
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequests.map((r) => r._id)));
    }
  };

  const handleBulkAction = async (status: 'approved' | 'rejected') => {
    if (selectedIds.size === 0) return;
    const label = status === 'approved' ? 'onaylamak' : 'reddetmek';
    if (!window.confirm(`Seçili ${selectedIds.size} talebi ${label} istediğinize emin misiniz?`))
      return;

    try {
      const { error } = (await EvciService.bulkUpdateStatus(
        Array.from(selectedIds),
        status,
      )) as any;
      if (error) {
        toast.error(error);
      } else {
        toast.success(`${selectedIds.size} talep başarıyla güncellendi`);
        setSelectedIds(new Set());
        await fetchData(page);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error bulk updating:', error);
      toast.error('Toplu güncelleme sırasında hata oluştu');
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setShowExportMenu(false);
    try {
      const response = await EvciService.exportEvciRequests(format);
      const blob = new Blob([response.data], {
        type:
          format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evci-talepleri.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} dosyası indirildi`);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error exporting:', error);
      toast.error('Dışa aktarma sırasında hata oluştu');
    }
  };

  const handleAdminAction = async (id: string, action: 'approve' | 'reject') => {
    const label = action === 'approve' ? 'onaylamak' : 'reddetmek';
    if (!window.confirm(`Bu talebi ${label} istediğinize emin misiniz?`)) return;

    try {
      const { error } = await EvciService.adminApproveEvciRequest(id, action);
      if (error) {
        toast.error(error);
      } else {
        toast.success(`Talep ${action === 'approve' ? 'onaylandı' : 'reddedildi'}`);
        await fetchData(page);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error admin action:', error);
      toast.error('İşlem sırasında hata oluştu');
    }
  };

  const handleWindowOverride = async () => {
    if (!overrideWeekOf) {
      toast.error('Hafta başlangıç tarihi seçin');
      return;
    }
    try {
      const { error } = (await EvciService.setWindowOverride(
        overrideWeekOf,
        overrideIsOpen,
        overrideReason,
      )) as any;
      if (error) {
        toast.error(error);
      } else {
        toast.success(`Pencere override ${overrideIsOpen ? 'açık' : 'kapalı'} olarak ayarlandı`);
        setShowOverride(false);
        setOverrideReason('');
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error setting override:', error);
      toast.error('Override ayarlanırken hata oluştu');
    }
  };

  const classes = Array.from(
    new Set(
      requests.map((r) => students.find((s) => s.id === r.studentId)?.sinif || '').filter(Boolean),
    ),
  );

  const rooms = Array.from(
    new Set(
      requests
        .map((r) => {
          const st = students.find((s) => s.id === r.studentId);
          return st?.pansiyon ? String(st.oda) : '';
        })
        .filter(Boolean),
    ),
  );

  const filteredRequests = requests.filter((r) => {
    const st = students.find((s) => s.id === r.studentId);
    if (!st) return false;
    if (filterClass !== 'All' && st.sinif !== filterClass) return false;
    if (filterRoom !== 'All' && String(st.oda) !== filterRoom) return false;
    if (filterParentApproval !== 'All' && (r.parentApproval || 'pending') !== filterParentApproval)
      return false;
    return true;
  });

  const resetForm = () => {
    setNewReq({ willGo: true });
    setShowForm(false);
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${authUser?.rol || 'admin'}` },
    { label: 'Evci Talepleri Yönetimi' },
  ];

  if (isLoading) {
    return (
      <ModernDashboardLayout pageTitle="Evci Talepleri Yönetimi" breadcrumb={breadcrumb}>
        <div className="admin-evci-page">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Veriler yükleniyor...</p>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Evci Talepleri Yönetimi" breadcrumb={breadcrumb}>
      <div className="admin-evci-page">
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-title-section">
              <Home className="page-icon" />
              <h1 className="page-title-main">Evci Talepleri Yönetimi</h1>
            </div>
            <div className="page-header-actions">
              <Link
                to={`/${authUser?.rol || 'admin'}/evci-istatistik`}
                className="btn btn-secondary"
              >
                <BarChart3 size={18} />
                İstatistikler
              </Link>
              <button onClick={() => setShowOverride(!showOverride)} className="btn btn-secondary">
                <Settings2 size={18} />
                Pencere
              </button>
              <div className="export-dropdown">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="btn btn-secondary"
                >
                  <Download size={18} />
                  Dışa Aktar
                </button>
                {showExportMenu && (
                  <div className="export-menu">
                    <button onClick={() => handleExport('excel')} className="export-menu-item">
                      Excel (.xlsx)
                    </button>
                    <button onClick={() => handleExport('pdf')} className="export-menu-item">
                      PDF
                    </button>
                  </div>
                )}
              </div>
              <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
                <Plus size={18} />
                {showForm ? 'Formu Gizle' : 'Evci Ekle'}
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="bulk-action-bar">
            <span className="bulk-count">{selectedIds.size} talep seçili</span>
            <button onClick={() => handleBulkAction('approved')} className="btn btn-approve btn-sm">
              <CheckSquare size={16} />
              Toplu Onayla
            </button>
            <button onClick={() => handleBulkAction('rejected')} className="btn btn-reject btn-sm">
              <XCircle size={16} />
              Toplu Reddet
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="btn btn-secondary btn-sm">
              Seçimi Temizle
            </button>
          </div>
        )}

        {/* Window Override Panel */}
        {showOverride && (
          <div className="override-panel">
            <h3 className="override-title">Talep Penceresi Override</h3>
            <div className="override-form">
              <div className="form-group">
                <label className="form-label">Hafta Başlangıcı (Pazartesi)</label>
                <input
                  type="date"
                  value={overrideWeekOf}
                  onChange={(e) => setOverrideWeekOf(e.target.value)}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Pencere Durumu</label>
                <select
                  value={overrideIsOpen ? 'true' : 'false'}
                  onChange={(e) => setOverrideIsOpen(e.target.value === 'true')}
                  className="form-control"
                >
                  <option value="true">Açık (talep alınabilir)</option>
                  <option value="false">Kapalı (talep alınamaz)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sebep</label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="form-control"
                  placeholder="Örn: Tatil haftası, sınav haftası..."
                  maxLength={500}
                />
              </div>
              <div className="override-actions">
                <button onClick={() => setShowOverride(false)} className="btn btn-secondary">
                  İptal
                </button>
                <button onClick={handleWindowOverride} className="btn btn-primary">
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="filter-section">
          <div className="filter-group">
            <Filter className="filter-icon" />
            <label className="filter-label">Sınıf:</label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="filter-select"
            >
              <option value="All">Tüm Sınıflar</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <Filter className="filter-icon" />
            <label className="filter-label">Oda:</label>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="filter-select"
            >
              <option value="All">Tüm Odalar</option>
              {rooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <Shield className="filter-icon" />
            <label className="filter-label">Veli Onayı:</label>
            <select
              value={filterParentApproval}
              onChange={(e) => setFilterParentApproval(e.target.value)}
              className="filter-select"
            >
              <option value="All">Tümü</option>
              <option value="pending">Beklemede</option>
              <option value="approved">Onaylandı</option>
              <option value="rejected">Reddedildi</option>
            </select>
          </div>
        </div>

        {showForm && (
          <div className="form-container">
            <div className="form-header">
              <h3 className="form-title">Yeni Evci Talebi Ekle</h3>
            </div>
            <div className="admin-form-grid">
              <div className="form-group">
                <label className="form-label">Öğrenci ID</label>
                <input
                  type="text"
                  value={newReq.studentId || ''}
                  onChange={(e) => setNewReq({ ...newReq, studentId: e.target.value })}
                  placeholder="Öğrenci ID"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Öğrenci Adı</label>
                <input
                  type="text"
                  value={newReq.studentName || ''}
                  onChange={(e) => setNewReq({ ...newReq, studentName: e.target.value })}
                  placeholder="Öğrenci Adı"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Başlangıç Tarihi</label>
                <input
                  type="date"
                  value={newReq.startDate || ''}
                  onChange={(e) => setNewReq({ ...newReq, startDate: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Bitiş Tarihi</label>
                <input
                  type="date"
                  value={newReq.endDate || ''}
                  onChange={(e) => setNewReq({ ...newReq, endDate: e.target.value })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gideceği Yer</label>
                <input
                  type="text"
                  value={newReq.destination || ''}
                  onChange={(e) => setNewReq({ ...newReq, destination: e.target.value })}
                  placeholder="Gideceği Yer"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Durum</label>
                <select
                  value={newReq.willGo ? 'true' : 'false'}
                  onChange={(e) => setNewReq({ ...newReq, willGo: e.target.value === 'true' })}
                  className="form-control"
                >
                  <option value="true">Evci GİDECEK</option>
                  <option value="false">Evci GİTMEYECEK</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button onClick={resetForm} className="btn btn-secondary">
                İptal
              </button>
              <button onClick={saveNew} disabled={isSubmitting} className="btn btn-primary">
                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        )}

        <div className="requests-container">
          {filteredRequests.length === 0 ? (
            <div className="empty-state">
              <Home className="empty-icon" />
              <h3>Evci talebi bulunamadı</h3>
              <p>Filtrelenen kriterlere uygun evci talebi bulunamadı.</p>
            </div>
          ) : (
            <>
              {filteredRequests.length > 0 && (
                <div className="select-all-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === filteredRequests.length && filteredRequests.length > 0
                      }
                      onChange={toggleSelectAll}
                    />
                    <span>Tümünü Seç ({filteredRequests.length})</span>
                  </label>
                </div>
              )}
              <div className="requests-grid">
                {filteredRequests.map((r) => {
                  const st = students.find((s) => s.id === r.studentId);
                  const pBadge = getParentApprovalBadge(r.parentApproval);
                  return (
                    <div
                      key={r._id}
                      className={`request-card ${selectedIds.has(r._id) ? 'selected' : ''}`}
                    >
                      <div className="card-header">
                        <label className="card-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r._id)}
                            onChange={() => toggleSelect(r._id)}
                          />
                        </label>
                        <div className="card-icon">
                          <User size={20} />
                        </div>
                        <button
                          onClick={() => handleDelete(r._id)}
                          className="action-button delete-button"
                          title="Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="card-content">
                        <h3 className="card-title">{r.studentName || st?.adSoyad || '-'}</h3>
                        <div className="request-info">
                          <div className="info-item">
                            <User className="info-icon" />
                            <span className="info-label">ID:</span>
                            <span className="info-value">{r.studentId}</span>
                          </div>
                          <div className="info-item">
                            <Calendar className="info-icon" />
                            <span className="info-label">Sınıf:</span>
                            <span className="info-value">
                              {st?.sinif
                                ? `${String(st.sinif)}${st.sube ? String(st.sube) : ''}`
                                : '-'}
                            </span>
                          </div>
                          <div className="info-item">
                            <MapPin className="info-icon" />
                            <span className="info-label">Oda:</span>
                            <span className="info-value">{st?.pansiyon ? st.oda : '-'}</span>
                          </div>
                          <div className="info-item">
                            <Calendar className="info-icon" />
                            <span className="info-label">Başlangıç:</span>
                            <span className="info-value">{r.startDate || '-'}</span>
                          </div>
                          <div className="info-item">
                            <Calendar className="info-icon" />
                            <span className="info-label">Bitiş:</span>
                            <span className="info-value">{r.endDate || '-'}</span>
                          </div>
                          <div className="info-item">
                            <MapPin className="info-icon" />
                            <span className="info-label">Yer:</span>
                            <span className="info-value">{r.destination || '-'}</span>
                          </div>
                          <div className="info-item">
                            <Calendar className="info-icon" />
                            <span className="info-label">Talep Tarihi:</span>
                            <span className="info-value">
                              {new Date(r.createdAt).toLocaleString('tr-TR')}
                            </span>
                          </div>
                          {r.parentApproval === 'rejected' && r.rejectionReason && (
                            <div className="info-item rejection-reason">
                              <AlertCircle className="info-icon" />
                              <span className="info-label">Red Sebebi:</span>
                              <span className="info-value">{r.rejectionReason}</span>
                            </div>
                          )}
                        </div>
                        <div className="status-badge-container">
                          <span className={`status-badge ${r.willGo ? 'going' : 'not-going'}`}>
                            {r.willGo ? 'Evci gidecek' : 'Evci gitmeyecek'}
                          </span>
                          <span className={`parent-approval-badge ${pBadge.className}`}>
                            <Shield size={14} /> {pBadge.text}
                          </span>
                        </div>
                        {(!r.status || r.status === 'pending') && (
                          <div className="admin-card-actions">
                            <button
                              onClick={() => handleAdminAction(r._id, 'approve')}
                              className="btn btn-approve btn-sm"
                              title="Onayla"
                            >
                              <Check size={14} /> Onayla
                            </button>
                            <button
                              onClick={() => handleAdminAction(r._id, 'reject')}
                              className="btn btn-reject btn-sm"
                              title="Reddet"
                            >
                              <X size={14} /> Reddet
                            </button>
                          </div>
                        )}
                        {r.status && r.status !== 'pending' && (
                          <div className={`admin-status-badge ${r.status}`}>
                            {r.status === 'approved' ? 'Admin Onayladı' : 'Admin Reddetti'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={16} /> Önceki
              </button>
              <span className="pagination-info">
                Sayfa {page} / {totalPages} ({totalCount} talep)
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn btn-secondary btn-sm"
              >
                Sonraki <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </ModernDashboardLayout>
  );
}
