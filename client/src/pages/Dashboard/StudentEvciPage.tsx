import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ArrowLeft, Home, Calendar, MapPin, Clock, Edit, Trash2, Plus } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';
import './StudentEvciPage.css';

interface EvciTalep {
  studentId: string;
  studentName: string;
  startDate: string;
  endDate: string;
  destination: string;
  noShow: boolean;
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

// Cumartesi günü talepleri sıfırlama fonksiyonu
function resetWeeklyRequests() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Pazar, 6 = Cumartesi
  
  // Eğer bugün cumartesi ise (6) ve saat 12:00'dan sonra ise
  if (dayOfWeek === 6 && today.getHours() >= 12) {
    const lastReset = localStorage.getItem('lastWeeklyReset');
    const todayStr = today.toDateString();
    
    // Eğer bugün henüz sıfırlanmamışsa
    if (lastReset !== todayStr) {
      // Evci taleplerini sıfırla
      localStorage.setItem("evciRequests", "[]");
      localStorage.setItem('lastWeeklyReset', todayStr);
      // Weekly evci requests reset on Saturday at 12:00
    }
  }
}

const StudentEvciPage = () => {
  const { user: authUser, isLoading: authLoading } = useAuth(["student"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [requests, setRequests] = useState<EvciTalep[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<EvciTalep & { startTime?: string; endTime?: string }>>({ 
    noShow: false 
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await resetWeeklyRequests();
        setLoading(false);
      } catch (err) {
        setError('Haftalık talepler yüklenirken bir hata oluştu.');
        setLoading(false);
      }
    };
    
    if (authUser) {
      init();
    }
  }, [authUser]);

  // Kullanıcının mevcut taleplerini yükle
  useEffect(() => {
    if (authUser) {
      const all: EvciTalep[] = JSON.parse(
        localStorage.getItem("evciRequests") || "[]",
      );
      setRequests(all.filter((r) => r.studentId === authUser.id));
    }
  }, [authUser]);

  // Form validasyonu
  const validate = (): FormErrors => {
    const err: FormErrors = {};
    if (!form.noShow) {
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
    const all: EvciTalep[] = JSON.parse(
      localStorage.getItem("evciRequests") || "[]",
    );
    const thisWeek = all
      .filter((r) => r.studentId === authUser.id)
      .filter((r) => {
        const d = new Date(r.createdAt);
        return d >= mon && d <= fri;
      });

    if (thisWeek.length > 0) {
      setToastMessage("Bu hafta için zaten bir evci talebiniz var.");
      return;
    }

    setEditingIndex(null);
    setForm({ noShow: false });
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
  const handleDelete = (idx: number) => {
    if (!authUser) return;
    if (!window.confirm("Talebi iptal etmek istediğinize emin misiniz?"))
      return;

    const all: EvciTalep[] = JSON.parse(
      localStorage.getItem("evciRequests") || "[]",
    );
    const target = requests[idx];
    const updatedAll = all.filter(
      (r) =>
        !(r.studentId === target.studentId && r.createdAt === target.createdAt),
    );
    localStorage.setItem("evciRequests", JSON.stringify(updatedAll));
    setRequests(updatedAll.filter((r) => r.studentId === authUser.id));
    setToastMessage("Talep iptal edildi.");
  };

  // Gönderme / Güncelleme
  const handleSubmit = () => {
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
    const entry: EvciTalep = {
      studentId: authUser.id,
      studentName: authUser.adSoyad,
      startDate: startDateTime,
      endDate: endDateTime,
      destination: form.destination || "",
      noShow: form.noShow || false,
      createdAt:
        editingIndex !== null
        ? requests[editingIndex].createdAt
        : new Date().toISOString(),
    };

    const all: EvciTalep[] = JSON.parse(
      localStorage.getItem("evciRequests") || "[]",
    );
    const updated = [...all];

    if (editingIndex !== null) {
      // Güncelle
      const old = requests[editingIndex];
      const idx = updated.findIndex(
        (r) => r.studentId === old.studentId && r.createdAt === old.createdAt,
      );
      if (idx !== -1) updated[idx] = entry;
    } else {
      // Yeni ekle
      updated.push(entry);
    }

    localStorage.setItem("evciRequests", JSON.stringify(updated));
    setRequests(updated.filter((r) => r.studentId === authUser.id));
    setModalOpen(false);
    setToastMessage(editingIndex !== null ? "Talep güncellendi." : "Talep gönderildi.");
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
          <BackButton />
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
          <BackButton />
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
          <BackButton />
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
        <BackButton />
        
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
            >
              <Plus size={18} />
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
                        <span className="info-value">{r.noShow ? "Gitmiyor" : r.startDate}</span>
                      </div>
                      <div className="info-item">
                        <Clock className="info-icon" />
                        <span className="info-label">Bitiş:</span>
                        <span className="info-value">{r.noShow ? "-" : r.endDate}</span>
                      </div>
                      <div className="info-item">
                        <MapPin className="info-icon" />
                        <span className="info-label">Yer:</span>
                        <span className="info-value">{r.noShow ? "-" : r.destination}</span>
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
                      checked={form.noShow || false}
                      onChange={(e) => setForm({ ...form, noShow: e.target.checked })}
                    />
                    <span>Evciye Gitmeyeceğim</span>
                  </label>
                </div>
                
                {!form.noShow && (
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