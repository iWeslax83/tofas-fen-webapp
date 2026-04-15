import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import {
  ArrowLeft,
  Home,
  Calendar,
  MapPin,
  Clock,
  Edit,
  Trash2,
  Plus,
  Shield,
  Timer,
  AlertCircle,
  Copy,
} from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';

import { EvciService } from '../../utils/apiService';
import { toast } from 'sonner';
import './StudentEvciPage.css';

interface EvciTalep {
  _id?: string;
  studentId: string;
  studentName: string;
  startDate: string;
  endDate: string;
  destination: string;
  willGo: boolean;
  createdAt: string;
  parentApproval?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  weekOf?: string;
}

interface SubmissionWindow {
  isOpen: boolean;
  reason?: string;
  windowStart: string;
  windowEnd: string;
  nextWindowStart: string;
  serverTime: string;
  weekOf: string;
}

type FormErrors = Partial<Pick<EvciTalep, 'startDate' | 'endDate' | 'destination'>>;

function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0sn';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}g`);
  if (hours > 0) parts.push(`${hours}s`);
  if (minutes > 0) parts.push(`${minutes}dk`);
  return parts.join(' ');
}

const DAYS_OF_WEEK = [
  { value: 'Pazartesi', label: 'Pazartesi' },
  { value: 'Salı', label: 'Salı' },
  { value: 'Çarşamba', label: 'Çarşamba' },
  { value: 'Perşembe', label: 'Perşembe' },
  { value: 'Cuma', label: 'Cuma' },
  { value: 'Cumartesi', label: 'Cumartesi' },
  { value: 'Pazar', label: 'Pazar' },
];

function getParentApprovalBadge(approval?: string) {
  switch (approval) {
    case 'approved':
      return { text: 'Veli Onayladı', className: 'parent-approved' };
    case 'rejected':
      return { text: 'Veli Reddetti', className: 'parent-rejected' };
    case 'pending':
    default:
      return { text: 'Veli Onayı Bekleniyor', className: 'parent-pending' };
  }
}

const StudentEvciPage = () => {
  const { user: authUser } = useAuthGuard(['student']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [requests, setRequests] = useState<EvciTalep[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<EvciTalep & { startTime?: string; endTime?: string }>>({
    willGo: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [submissionWindow, setSubmissionWindow] = useState<SubmissionWindow | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  // Zaman penceresi bilgisini yükle
  const fetchSubmissionWindow = useCallback(async () => {
    try {
      const { data } = await EvciService.getSubmissionWindow();
      if (data && typeof data === 'object') {
        const sw = data as SubmissionWindow;
        // Validate that required date fields are present and parseable
        if (sw.windowEnd && sw.nextWindowStart && !isNaN(new Date(sw.windowEnd).getTime())) {
          setSubmissionWindow(sw);
        }
      }
    } catch (err) {
      console.error('Error fetching submission window:', err);
    }
  }, []);

  // Kullanıcının mevcut taleplerini API'den yükle
  useEffect(() => {
    const fetchRequests = async () => {
      if (!authUser) return;

      try {
        setLoading(true);
        const { data, error } = await EvciService.getEvciRequestsByStudent(authUser.id);
        if (error) {
          setError('Evci talepleri yüklenirken hata oluştu.');
          console.error('Error fetching evci requests:', error);
        } else {
          setRequests((data as EvciTalep[]) || []);
        }
      } catch (err) {
        setError('Evci talepleri yüklenirken bir hata oluştu.');
        console.error('Error fetching evci requests:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
    fetchSubmissionWindow();
  }, [authUser, fetchSubmissionWindow]);

  // Modal escape key handler and body scroll lock
  useEffect(() => {
    if (!modalOpen) return;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalOpen]);

  // Geri sayım sayacı
  useEffect(() => {
    if (!submissionWindow) return;

    const updateCountdown = () => {
      const now = new Date();
      if (submissionWindow.isOpen) {
        // Pencere kapanışına kalan süre
        const end = new Date(submissionWindow.windowEnd);
        const endTime = end.getTime();
        if (isNaN(endTime)) {
          setCountdown('');
          return;
        }
        setCountdown(formatCountdown(Math.max(0, endTime - now.getTime())));
      } else {
        // Pencere açılışına kalan süre
        const next = new Date(submissionWindow.nextWindowStart);
        const nextTime = next.getTime();
        if (isNaN(nextTime)) {
          setCountdown('');
          return;
        }
        setCountdown(formatCountdown(Math.max(0, nextTime - now.getTime())));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [submissionWindow]);

  // Form validasyonu
  const validate = (): FormErrors => {
    const err: FormErrors = {};
    if (form.willGo) {
      if (!form.startDate) err.startDate = 'Çıkış günü seçin.';
      if (!form.endDate) err.endDate = 'Dönüş günü seçin.';
      if (!form.destination) err.destination = 'Lütfen yer girin.';
    }
    return err;
  };

  // Son gidecek talebin destination'ını bul (template)
  const lastTemplate = requests.find((r) => r.willGo && r.destination);

  // Yeni talep
  const handleNew = () => {
    if (!authUser) return;

    if (submissionWindow && !submissionWindow.isOpen) {
      toast.error('Talep penceresi kapalı. Pazartesi-Perşembe arasında talep oluşturabilirsiniz.');
      return;
    }

    // Bu hafta zaten talep var mı kontrolü (local)
    if (submissionWindow?.weekOf) {
      const thisWeekReqs = requests.filter(
        (r) => r.weekOf === submissionWindow.weekOf && r.parentApproval !== 'rejected',
      );
      if (thisWeekReqs.length > 0) {
        toast.error('Bu hafta için zaten bir evci talebiniz var.');
        return;
      }
    }

    setEditingIndex(null);
    setForm({ willGo: true });
    setErrors({});
    setModalOpen(true);
  };

  const applyTemplate = () => {
    if (lastTemplate) {
      setForm((prev) => ({ ...prev, destination: lastTemplate.destination }));
      toast.success('Geçen haftaki yer bilgisi uygulandı');
    }
  };

  // Gün adını startDate/endDate'ten ayıkla (yeni format: "Perşembe 16:00", eski format: "2026-03-05T16:00")
  const parseDayAndTime = (value?: string): { day: string; time: string } => {
    if (!value) return { day: '', time: '' };
    const dayNames = DAYS_OF_WEEK.map((d) => d.value);
    // Yeni format: "Perşembe 16:00" veya sadece "Perşembe"
    const parts = value.split(' ');
    if (dayNames.includes(parts[0])) {
      return { day: parts[0], time: parts[1] || '' };
    }
    // Eski tarih formatı — gün adına çevir
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const dayIndex = date.getDay(); // 0=Pazar
      const dayMap = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      const hours = String(date.getHours()).padStart(2, '0');
      const mins = String(date.getMinutes()).padStart(2, '0');
      return { day: dayMap[dayIndex], time: `${hours}:${mins}` };
    }
    return { day: value, time: '' };
  };

  // Düzenleme
  const handleEdit = (idx: number) => {
    const req = requests[idx];
    if (req.parentApproval === 'approved') {
      toast.error('Veli tarafından onaylanmış talep düzenlenemez.');
      return;
    }
    const start = parseDayAndTime(req.startDate);
    const end = parseDayAndTime(req.endDate);
    setEditingIndex(idx);
    setForm({
      ...req,
      startDate: start.day,
      startTime: start.time,
      endDate: end.day,
      endTime: end.time,
    });
    setErrors({});
    setModalOpen(true);
  };

  // Silme
  const handleDelete = async (idx: number) => {
    if (!authUser) return;
    const target = requests[idx];

    if (target.parentApproval === 'approved') {
      toast.error('Veli tarafından onaylanmış talep silinemez.');
      return;
    }

    if (!window.confirm('Talebi iptal etmek istediğinize emin misiniz?')) return;

    if (!target._id) return;

    try {
      const { error } = await EvciService.deleteEvciRequest(target._id);
      if (error) {
        toast.error('Talep silinirken hata oluştu: ' + error);
      } else {
        setRequests(requests.filter((r) => r._id !== target._id));
        toast.success('Talep iptal edildi.');
      }
    } catch (err) {
      console.error('Error deleting evci request:', err);
      toast.error('Talep silinirken hata oluştu.');
    }
  };

  // Gönderme / Güncelleme
  const handleSubmit = async () => {
    if (!authUser) return;

    const vErr = validate();
    if (Object.keys(vErr).length) {
      setErrors(vErr);
      return;
    }

    const startDateTime =
      form.startDate && form.startTime
        ? `${form.startDate} ${form.startTime}`
        : form.startDate || '';
    const endDateTime =
      form.endDate && form.endTime ? `${form.endDate} ${form.endTime}` : form.endDate || '';

    try {
      if (editingIndex !== null) {
        const target = requests[editingIndex];
        if (!target._id) return;

        const { error } = await EvciService.updateEvciRequest(target._id, {
          startDate: startDateTime,
          endDate: endDateTime,
          destination: form.destination || '',
          willGo: form.willGo || false,
        });

        if (error) {
          toast.error('Talep güncellenirken hata oluştu: ' + error);
        } else {
          const updatedRequests = [...requests];
          updatedRequests[editingIndex] = {
            ...updatedRequests[editingIndex],
            startDate: startDateTime,
            endDate: endDateTime,
            destination: form.destination || '',
            willGo: form.willGo || false,
          };
          setRequests(updatedRequests);
          setModalOpen(false);
          toast.success('Talep güncellendi.');
        }
      } else {
        const { data, error } = await EvciService.createEvciRequest({
          studentId: authUser.id,
          startDate: startDateTime,
          endDate: endDateTime,
          destination: form.destination || '',
          willGo: form.willGo || false,
        });

        if (error) {
          toast.error('Talep oluşturulurken hata oluştu: ' + error);
        } else {
          const newRequest: EvciTalep = {
            _id: (data as any)._id,
            studentId: authUser.id,
            studentName: authUser.adSoyad,
            startDate: startDateTime,
            endDate: endDateTime,
            destination: form.destination || '',
            willGo: form.willGo || false,
            createdAt: new Date().toISOString(),
            parentApproval: 'pending',
            weekOf: (data as any).weekOf,
          };
          setRequests([newRequest, ...requests]);
          setModalOpen(false);
          toast.success('Talep gönderildi. Veli onayı bekleniyor.');
        }
      }
    } catch (err) {
      console.error('Error submitting evci request:', err);
      toast.error('Talep işlenirken hata oluştu.');
    }
  };

  const breadcrumb = [{ label: 'Ana Sayfa', path: '/student' }, { label: 'Evci İşlemleri' }];

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Evci İşlemleri" breadcrumb={breadcrumb}>
        <div className="evci-page">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Yükleniyor...</p>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  if (error) {
    return (
      <ModernDashboardLayout pageTitle="Evci İşlemleri" breadcrumb={breadcrumb}>
        <div className="evci-page">
          <div className="error-container">
            <div className="error-message">
              <h2>Hata Oluştu</h2>
              <p>{error}</p>
              <button onClick={() => window.location.reload()} className="btn btn-primary">
                Yeniden Dene
              </button>
            </div>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  if (!authUser?.oda) {
    return (
      <ModernDashboardLayout pageTitle="Evci İşlemleri" breadcrumb={breadcrumb}>
        <div className="evci-page">
          <div className="empty-state">
            <div className="empty-icon">
              <Home size={80} />
            </div>
            <h3>Evci Talepleri</h3>
            <p>Evci talepleri sadece yatılı öğrenciler için geçerlidir.</p>
            <Link to="/student" className="btn btn-primary">
              <ArrowLeft size={18} /> Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  const windowIsOpen = submissionWindow?.isOpen ?? true;

  return (
    <ModernDashboardLayout pageTitle="Evci İşlemleri" breadcrumb={breadcrumb}>
      <div className="evci-page">
        {/* Submission Window Banner */}
        {submissionWindow && (
          <div className={`submission-window-banner ${windowIsOpen ? 'open' : 'closed'}`}>
            <Timer size={20} />
            <span>
              {windowIsOpen
                ? `Talep penceresi açık${countdown ? ` — kapanışa kalan: ${countdown}` : ''}`
                : `Talep penceresi kapalı${countdown ? ` — açılışa kalan: ${countdown}` : ''}`}
              {submissionWindow.reason ? ` (${submissionWindow.reason})` : ''}
            </span>
          </div>
        )}

        <div className="page-header">
          <div className="page-header-content">
            <div className="page-title-section">
              <Home className="page-icon" />
              <h1 className="page-title-main">Pansiyon Evci Taleplerim</h1>
            </div>
            <button
              onClick={handleNew}
              className="btn btn-primary btn-new-evci"
              disabled={!windowIsOpen}
            >
              <Plus size={24} />
              Yeni Evci Talebi
            </button>
          </div>
        </div>

        <div className="requests-container">
          {requests.length === 0 ? (
            <div className="empty-state">
              <Home className="empty-icon" />
              <h3>Henüz talep yok</h3>
              <p>Yeni evci talebi oluşturmak için yukarıdaki butona tıklayın.</p>
            </div>
          ) : (
            <div className="requests-grid">
              {requests.map((r, i) => {
                const badge = getParentApprovalBadge(r.parentApproval);
                const canModify = r.parentApproval !== 'approved';
                return (
                  <div key={r._id || i} className="request-card">
                    <div className="card-header">
                      <div className="card-icon">
                        <Calendar size={20} />
                      </div>
                      <div className="card-header-badges">
                        <span className={`parent-approval-badge ${badge.className}`}>
                          <Shield size={14} /> {badge.text}
                        </span>
                      </div>
                      {canModify && (
                        <div className="card-actions">
                          <button
                            onClick={() => handleEdit(i)}
                            className="action-button edit-button"
                            title="Düzenle"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(i)}
                            className="action-button delete-button"
                            title="İptal Et"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="card-content">
                      <div className="request-info">
                        <div className="info-item">
                          <Calendar className="info-icon" />
                          <span className="info-label">Tarih:</span>
                          <span className="info-value">
                            {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                        <div className="info-item">
                          <Clock className="info-icon" />
                          <span className="info-label">Çıkış:</span>
                          <span className="info-value">{!r.willGo ? 'Gitmiyor' : r.startDate}</span>
                        </div>
                        <div className="info-item">
                          <Clock className="info-icon" />
                          <span className="info-label">Dönüş:</span>
                          <span className="info-value">{!r.willGo ? '-' : r.endDate}</span>
                        </div>
                        <div className="info-item">
                          <MapPin className="info-icon" />
                          <span className="info-label">Yer:</span>
                          <span className="info-value">{!r.willGo ? '-' : r.destination}</span>
                        </div>
                        {r.parentApproval === 'rejected' && r.rejectionReason && (
                          <div className="info-item rejection-reason">
                            <AlertCircle className="info-icon" />
                            <span className="info-label">Red Sebebi:</span>
                            <span className="info-value">{r.rejectionReason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {modalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">Evci Talebi</h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="modal-close"
                  aria-label="Kapat"
                >
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                className="modal-body"
              >
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!form.willGo}
                      onChange={(e) => setForm({ ...form, willGo: !e.target.checked })}
                    />
                    <span>Evciye Gitmeyeceğim</span>
                  </label>
                </div>

                {form.willGo && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Çıkış Günü</label>
                        <select
                          value={form.startDate || ''}
                          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                          className="form-control"
                        >
                          <option value="">Gün seçin</option>
                          {DAYS_OF_WEEK.map((d) => (
                            <option key={d.value} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                        {errors.startDate && <p className="error-message">{errors.startDate}</p>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Çıkış Saati</label>
                        <input
                          type="time"
                          value={form.startTime || ''}
                          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                          className="form-control"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Dönüş Günü</label>
                        <select
                          value={form.endDate || ''}
                          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                          className="form-control"
                        >
                          <option value="">Gün seçin</option>
                          {DAYS_OF_WEEK.map((d) => (
                            <option key={d.value} value={d.value}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                        {errors.endDate && <p className="error-message">{errors.endDate}</p>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Dönüş Saati</label>
                        <input
                          type="time"
                          value={form.endTime || ''}
                          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                          className="form-control"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Yer</label>
                      {lastTemplate && editingIndex === null && !form.destination && (
                        <button type="button" onClick={applyTemplate} className="btn btn-template">
                          <Copy size={14} />
                          Geçen haftaki gibi ({lastTemplate.destination})
                        </button>
                      )}
                      <input
                        type="text"
                        value={form.destination || ''}
                        onChange={(e) => setForm({ ...form, destination: e.target.value })}
                        className="form-control"
                        placeholder="Gidilecek yer"
                      />
                      {errors.destination && <p className="error-message">{errors.destination}</p>}
                    </div>
                  </>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn btn-secondary"
                  >
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingIndex !== null ? 'Güncelle' : 'Talebi Gönder'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
};

export default StudentEvciPage;
