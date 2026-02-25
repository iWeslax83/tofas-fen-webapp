import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ArrowLeft, Home, Calendar, MapPin, Clock, Edit, Trash2, Plus } from 'lucide-react';
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
}

type FormErrors = Partial<
  Pick<EvciTalep, "startDate" | "endDate" | "destination">
>;

/** Haftanın Pazartesi gününü döner */
function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = (day + 6) % 7; // Pzt 1, ... Pazar 0
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Haftanın Cuma gününü döner */
function getFriday(d: Date): Date {
  const monday = getMonday(d);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return friday;
}


const StudentEvciPage = () => {
  const { user: authUser } = useAuth(["student"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage] = useState<string | null>(null);

  const [requests, setRequests] = useState<EvciTalep[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<EvciTalep & { startTime?: string; endTime?: string }>>({
    willGo: true
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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
          setRequests(data as EvciTalep[] || []);
        }
      } catch (err) {
        setError('Evci talepleri yüklenirken bir hata oluştu.');
        console.error('Error fetching evci requests:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [authUser]);

  // Form validasyonu
  const validate = (): FormErrors => {
    const err: FormErrors = {};
    if (form.willGo) {
      if (!form.startDate) err.startDate = "Başlangıç tarihi girin.";
      if (!form.endDate) err.endDate = "Bitiş tarihi girin.";
      if (!form.destination) err.destination = "Lütfen yer girin.";
    }
    return err;
  };

  // Yeni talep açılmadan önce hafta içi zaten talep var mı kontrolü
  const handleNew = () => {
    if (!authUser) return;

    const mon = getMonday(new Date());
    const fri = getFriday(new Date());
    const thisWeek = requests.filter((r) => {
      const d = new Date(r.createdAt);
      return d >= mon && d <= fri;
    });

    if (thisWeek.length > 0) {
      toast.error("Bu hafta için zaten bir evci talebiniz var.");
      return;
    }

    setEditingIndex(null);
    setForm({ willGo: true });
    setErrors({});
    setModalOpen(true);
  };

  // Düzenleme
  const handleEdit = (idx: number) => {
    setEditingIndex(idx);
    setForm(requests[idx]);
    setErrors({});
    setModalOpen(true);
  };

  // Silme
  const handleDelete = async (idx: number) => {
    if (!authUser) return;
    if (!window.confirm("Talebi iptal etmek istediğinize emin misiniz?"))
      return;

    const target = requests[idx];
    if (!target._id) return;

    try {
      const { error } = await EvciService.deleteEvciRequest(target._id);
      if (error) {
        toast.error('Talep silinirken hata oluştu: ' + error);
      } else {
        setRequests(requests.filter((r) => r._id !== target._id));
        toast.success("Talep iptal edildi.");
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

    // Combine date and time for start and end
    const startDateTime =
      form.startDate && form.startTime
        ? `${form.startDate}T${form.startTime}`
        : form.startDate || "";
    const endDateTime =
      form.endDate && form.endTime
        ? `${form.endDate}T${form.endTime}`
        : form.endDate || "";

    try {
      if (editingIndex !== null) {
        // Güncelle
        const target = requests[editingIndex];
        if (!target._id) return;

        const { error } = await EvciService.updateEvciRequest(target._id, {
          startDate: startDateTime,
          endDate: endDateTime,
          destination: form.destination || "",
          willGo: form.willGo || false,
        });

        if (error) {
          toast.error('Talep güncellenirken hata oluştu: ' + error);
        } else {
          // Local state'i güncelle
          const updatedRequests = [...requests];
          updatedRequests[editingIndex] = {
            ...updatedRequests[editingIndex],
            startDate: startDateTime,
            endDate: endDateTime,
            destination: form.destination || "",
            willGo: form.willGo || false,
          };
          setRequests(updatedRequests);
          setModalOpen(false);
          toast.success("Talep güncellendi.");
        }
      } else {
        // Yeni ekle
        const { data, error } = await EvciService.createEvciRequest({
          studentId: authUser.id,
          startDate: startDateTime,
          endDate: endDateTime,
          destination: form.destination || "",
          willGo: form.willGo || false,
        });

        if (error) {
          toast.error('Talep oluşturulurken hata oluştu: ' + error);
        } else {
          // Local state'e ekle
          const newRequest: EvciTalep = {
            _id: (data as any)._id,
            studentId: authUser.id,
            studentName: authUser.adSoyad,
            startDate: startDateTime,
            endDate: endDateTime,
            destination: form.destination || "",
            willGo: form.willGo || false,
            createdAt: new Date().toISOString(),
          };
          setRequests([...requests, newRequest]);
          setModalOpen(false);
          toast.success("Talep gönderildi.");
        }
      }
    } catch (err) {
      console.error('Error submitting evci request:', err);
      toast.error('Talep işlenirken hata oluştu.');
    }
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: '/student' },
    { label: 'Evci İşlemleri' }
  ];

  // Yükleme durumu
  if (loading) {
    return (
      <ModernDashboardLayout
        pageTitle="Evci İşlemleri"
        breadcrumb={breadcrumb}
      >
        <div className="evci-page">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Yükleniyor...</p>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <ModernDashboardLayout
        pageTitle="Evci İşlemleri"
        breadcrumb={breadcrumb}
      >
        <div className="evci-page">
          <div className="error-container">
            <div className="error-message">
              <h2>Hata Oluştu</h2>
              <p>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                Yeniden Dene
              </button>
            </div>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  // Eğer öğrenci yatılı değilse
  if (!authUser?.oda) {
    return (
      <ModernDashboardLayout
        pageTitle="Evci İşlemleri"
        breadcrumb={breadcrumb}
      >
        <div className="evci-page">
          <div className="empty-state">
            <div className="empty-icon">
              <Home size={80} />
            </div>
            <h3>Evci Talepleri</h3>
            <p>Evci talepleri sadece yatılı öğrenciler için geçerlidir.</p>
            <Link to="/student" className="btn btn-primary">
              <ArrowLeft size={18} />
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout
      pageTitle="Evci İşlemleri"
      breadcrumb={breadcrumb}
    >
      <div className="evci-page">

        {toastMessage && (
          <div className="toast-container">
            <div className="toast">{toastMessage}</div>
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
              className="btn btn-primary"
              style={{ fontSize: '1.125rem', padding: '10px 20px', minHeight: '50px' }}
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
              {requests.map((r, i) => (
                <div key={i} className="request-card">
                  <div className="card-header">
                    <div className="card-icon">
                      <Calendar size={20} />
                    </div>
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
                  </div>
                  <div className="card-content">
                    <div className="request-info">
                      <div className="info-item">
                        <Calendar className="info-icon" />
                        <span className="info-label">Tarih:</span>
                        <span className="info-value">{new Date(r.createdAt).toLocaleDateString("tr-TR")}</span>
                      </div>
                      <div className="info-item">
                        <Clock className="info-icon" />
                        <span className="info-label">Başlangıç:</span>
                        <span className="info-value">{!r.willGo ? "Gitmiyor" : r.startDate}</span>
                      </div>
                      <div className="info-item">
                        <Clock className="info-icon" />
                        <span className="info-label">Bitiş:</span>
                        <span className="info-value">{!r.willGo ? "-" : r.endDate}</span>
                      </div>
                      <div className="info-item">
                        <MapPin className="info-icon" />
                        <span className="info-label">Yer:</span>
                        <span className="info-value">{!r.willGo ? "-" : r.destination}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="modal-body">
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
                        <label className="form-label">Başlangıç Tarihi</label>
                        <input
                          type="date"
                          value={form.startDate || ""}
                          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                          className="form-control"
                        />
                        {errors.startDate && (
                          <p className="error-message">{errors.startDate}</p>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Başlangıç Saati</label>
                        <input
                          type="time"
                          value={form.startTime || ""}
                          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                          className="form-control"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Bitiş Tarihi</label>
                        <input
                          type="date"
                          value={form.endDate || ""}
                          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                          className="form-control"
                        />
                        {errors.endDate && (
                          <p className="error-message">{errors.endDate}</p>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Bitiş Saati</label>
                        <input
                          type="time"
                          value={form.endTime || ""}
                          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                          className="form-control"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Yer</label>
                      <input
                        type="text"
                        value={form.destination || ""}
                        onChange={(e) => setForm({ ...form, destination: e.target.value })}
                        className="form-control"
                        placeholder="Gidilecek yer"
                      />
                      {errors.destination && (
                        <p className="error-message">{errors.destination}</p>
                      )}
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
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    {editingIndex !== null ? "Güncelle" : "Talebi Gönder"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}

export default StudentEvciPage;