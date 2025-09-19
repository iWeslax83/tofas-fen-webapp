// src/pages/AdminEvciListPage.tsx
import { useState, useEffect } from "react";
// import { Link } from "react-router-dom"; // Not used
import { EvciService, UserService } from "../../utils/apiService";
import { toast } from "sonner";
import { Home, Plus, Trash2, Calendar, MapPin, User, Filter } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';
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
}

interface Student {
  id: string;
  adSoyad: string;
  sinif: string;
  sube: string;
  oda?: string;
  pansiyon?: boolean;
}

export function AdminEvciListPage() {
  const { user: authUser } = useAuth(["admin", "teacher"]);
  const [requests, setRequests] = useState<EvciTalep[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newReq, setNewReq] = useState<Partial<EvciTalep>>({ willGo: true });
  const [filterClass, setFilterClass] = useState<string>("All");
  const [filterRoom, setFilterRoom] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authUser) {
      fetchData();
    }
  }, [authUser]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Tüm evci taleplerini çek
      const { data: requestsData, error: requestsError } = await EvciService.getEvciRequests();
      if (requestsError) {
        console.error('Error fetching evci requests:', requestsError);
      } else {
        setRequests((requestsData as EvciTalep[]) || []);
      }

      // Tüm öğrencileri çek
      const { data: studentsData, error: studentsError } = await UserService.getUsersByRole('student');
      if (studentsError) {
        console.error('Error fetching students:', studentsError);
      } else {
        setStudents((studentsData as Student[]) || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const saveNew = async () => {
    if (
      newReq.studentId &&
      newReq.studentName &&
      newReq.startDate &&
      newReq.endDate &&
      newReq.destination &&
      typeof newReq.willGo === "boolean"
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
          // Yeniden yükle
          await fetchData();
          setShowForm(false);
          setNewReq({ willGo: true });
        }
      } catch (error) {
        console.error('Error creating evci request:', error);
        toast.error('Evci talebi oluşturulurken hata oluştu');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      toast.error('Lütfen tüm alanları doldurun');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bu talebi silmek istediğinize emin misiniz?")) {
      try {
        const { error } = await EvciService.deleteEvciRequest(id);
        
        if (error) {
          toast.error(error);
        } else {
          setRequests((reqs) => reqs.filter((r) => r._id !== id));
          toast.success('Evci talebi başarıyla silindi');
        }
      } catch (error) {
        console.error('Error deleting evci request:', error);
        toast.error('Evci talebi silinirken hata oluştu');
      }
    }
  };

  const classes = Array.from(
    new Set(
      requests
        .map((r) => students.find((s) => s.id === r.studentId)?.sinif || "")
        .filter(Boolean),
    ),
  );

  const rooms = Array.from(
    new Set(
      requests
        .map((r) => {
          const st = students.find((s) => s.id === r.studentId);
          return st?.pansiyon ? String(st.oda) : "";
        })
        .filter(Boolean),
    ),
  );

  const filteredRequests = requests.filter((r) => {
    const st = students.find((s) => s.id === r.studentId);
    if (!st) return false;
    if (filterClass !== "All" && st.sinif !== filterClass) return false;
    if (filterRoom !== "All" && String(st.oda) !== filterRoom) return false;
    return true;
  });

  const resetForm = () => {
    setNewReq({ willGo: true });
    setShowForm(false);
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${authUser?.rol || 'admin'}` },
    { label: 'Evci Talepleri Yönetimi' }
  ];

  if (isLoading) {
    return (
      <ModernDashboardLayout
        pageTitle="Evci Talepleri Yönetimi"
        breadcrumb={breadcrumb}
      >
        <div className="admin-evci-page">
          <BackButton />
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Veriler yükleniyor...</p>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout
      pageTitle="Evci Talepleri Yönetimi"
      breadcrumb={breadcrumb}
    >
      <div className="admin-evci-page">
        <BackButton />
        
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-title-section">
              <Home className="page-icon" />
              <h1 className="page-title-main">Evci Talepleri Yönetimi</h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn btn-primary"
            >
              <Plus size={18} />
              {showForm ? 'Formu Gizle' : 'Evci Ekle'}
            </button>
          </div>
        </div>

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
                  value={newReq.willGo ? "true" : "false"}
                  onChange={(e) => setNewReq({ ...newReq, willGo: e.target.value === "true" })}
                  className="form-control"
                >
                  <option value="true">Evci GİDECEK</option>
                  <option value="false">Evci GİTMEYECEK</option>
                </select>
              </div>
            </div>
            
            <div className="form-actions">
              <button
                onClick={resetForm}
                className="btn btn-secondary"
              >
                İptal
              </button>
              <button
                onClick={saveNew}
                disabled={isSubmitting}
                className="btn btn-primary"
              >
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
            <div className="requests-grid">
              {filteredRequests.map((r) => {
                const st = students.find((s) => s.id === r.studentId);
                return (
                  <div key={r._id} className="request-card">
                    <div className="card-header">
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
                      <h3 className="card-title">{r.studentName || st?.adSoyad || "-"}</h3>
                      <div className="request-info">
                        <div className="info-item">
                          <User className="info-icon" />
                          <span className="info-label">ID:</span>
                          <span className="info-value">{r.studentId}</span>
                        </div>
                        <div className="info-item">
                          <Calendar className="info-icon" />
                          <span className="info-label">Sınıf:</span>
                          <span className="info-value">{st?.sinif || "-"}</span>
                        </div>
                        <div className="info-item">
                          <MapPin className="info-icon" />
                          <span className="info-label">Oda:</span>
                          <span className="info-value">{st?.pansiyon ? st.oda : "-"}</span>
                        </div>
                        <div className="info-item">
                          <Calendar className="info-icon" />
                          <span className="info-label">Başlangıç:</span>
                          <span className="info-value">{r.startDate || "-"}</span>
                        </div>
                        <div className="info-item">
                          <Calendar className="info-icon" />
                          <span className="info-label">Bitiş:</span>
                          <span className="info-value">{r.endDate || "-"}</span>
                        </div>
                        <div className="info-item">
                          <MapPin className="info-icon" />
                          <span className="info-label">Yer:</span>
                          <span className="info-value">{r.destination || "-"}</span>
                        </div>
                        <div className="info-item">
                          <Calendar className="info-icon" />
                          <span className="info-label">Talep Tarihi:</span>
                          <span className="info-value">{new Date(r.createdAt).toLocaleString('tr-TR')}</span>
                        </div>
                      </div>
                      <div className="status-badge-container">
                        <span className={`status-badge ${r.willGo ? 'going' : 'not-going'}`}>
                          {r.willGo ? "Evci gidecek" : "Evci gitmeyecek"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModernDashboardLayout>
  );
}

export default AdminEvciListPage;
