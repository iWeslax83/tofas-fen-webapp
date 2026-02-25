import { useState, useEffect } from "react";
import { Plus, Calendar, Trash2, FileText, Download } from 'lucide-react';
import { useAuth } from "../../hooks/useAuth";
import { HomeworkService } from "../../utils/apiService";
import ModernDashboardLayout from '../../components/ModernDashboardLayout';

import './OdevlerPage.css';


interface Homework {
  _id?: string;
  id?: string;
  title: string;
  content?: string;
  description?: string;
  subject: string;
  startDate?: string;
  endDate?: string;
  assignedDate?: string | Date;
  dueDate?: string | Date;
  date?: string;
  grade?: string;
  classLevel?: string;
  classSection?: string;
  file?: string;
  attachments?: string[];
  teacherId?: string;
  teacherName?: string;
  status?: string;
}


export default function OdevlerPage() {
  const { user, isLoading: authLoading } = useAuth(["admin", "teacher", "student", "parent"]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("Tümü");
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has the correct role
    if (!authLoading && user && !["admin", "teacher", "student", "parent"].includes(user.rol || '')) {
      console.warn(`User role ${user.rol || 'undefined'} not allowed for odevler page`);
      // The original code had navigate(`/${user.rol || 'login'}`, { replace: true });
      // This line was removed as per the edit hint.
      return;
    }

    // Redirect to login if no user
    if (!authLoading && !user) {
      // The original code had navigate('/login', { replace: true });
      // This line was removed as per the edit hint.
      return;
    }

    const fetchHomeworks = async () => {
      try {
        // Tüm roller için aynı endpoint:
        // /api/homeworks -> Backend sınıf seviyesine göre filtrelenmiyor,
        // biz öğrenci/veli için filtreyi tamamen frontend'de yapıyoruz.
        const result = await HomeworkService.getHomeworks();
        if (result.error) {
          console.error('Error fetching homeworks:', result.error);
          setHomeworks([]);
        } else {
          setHomeworks((result.data as Homework[]) || []);
        }
      } catch (error) {
        console.error('Error fetching homeworks:', error);
        setHomeworks([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchHomeworks();
    }
  }, [user, authLoading]); // Removed navigate from dependency array

  const handleDelete = async (id: string) => {
    if (window.confirm('Ödevi silmek istediğinize emin misiniz?')) {
      try {
        const { error } = await HomeworkService.deleteHomework(id);
        if (error) {
          console.error('Error deleting homework:', error);
          alert('Ödev silinirken hata oluştu: ' + error);
        } else {
          // Hem _id hem id ile filtrele
          setHomeworks(hws => hws.filter(hw => hw._id !== id && hw.id !== id));
          // Liste yenile
          const { data, error: fetchError } = await HomeworkService.getHomeworks();
          if (!fetchError && data) {
            setHomeworks((data as Homework[]) || []);
          }
        }
      } catch (error) {
        console.error('Error deleting homework:', error);
      }
    }
  };

  const filteredHomeworks = homeworks.filter((hw: Homework) => {
    if (selectedSubject !== "Tümü" && hw.subject !== selectedSubject) return false;
    if (user?.rol === "student") {
      // Öğrencinin sınıf bilgisinden sadece seviye (9,10,11,12) alınır
      const raw = (user as any).sinif || (user as any).grade;
      const studentClassLevel = raw ? String(raw).replace(/[^0-9]/g, "") : "";
      if (!studentClassLevel) return false;
      return hw.classLevel === studentClassLevel || hw.grade === studentClassLevel;
    }
    if (user?.rol === "parent" && (user as any).childId) {
      if (!(user as any).childrenSiniflar) {
        return false;
      }
      const childrenSiniflar = (user as any).childrenSiniflar || [];
      // Çocukların sınıf bilgisinden sadece seviye (9,10,11,12) çıkar
      const childClasses = childrenSiniflar
        .map((child: any) => {
          // If child is an object with sinif property, extract it
          if (typeof child === 'object' && child.sinif) {
            return String(child.sinif).replace(/[^0-9]/g, "");
          }
          // Otherwise assume it's just a string
          return String(child).replace(/[^0-9]/g, "");
        })
        .filter((sinif: any) => sinif);
      return childClasses.includes(hw.classLevel) || childClasses.includes(hw.grade);
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="centered-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Ödevler' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Ödevler"
      breadcrumb={breadcrumb}
    >
      <div className="odevler-page">
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-title-section">
              <FileText className="page-icon" />
              <h1 className="page-title-main">Ödevler</h1>
            </div>
            <div className="header-actions">
              {(user?.rol === 'teacher' || user?.rol === 'admin') && (
                <button
                  onClick={() => setShowModal(true)}
                  className="btn btn-primary"
                >
                  <Plus size={18} />
                  <span>Yeni Ödev Ekle</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="odevler-page-content">
        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label className="filter-label">Derse göre filtrele:</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="filter-select"
            >
              <option value="Tümü">Tümü</option>
              {[...new Set(homeworks.map((hw) => hw.subject))].map((subject, i) => (
                <option key={i} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Homeworks List */}
          {filteredHomeworks.length === 0 ? (
            <div className="empty-state">
              <FileText className="empty-icon" />
              <h3>Henüz ödev bulunmuyor</h3>
              <p>Seçilen kriterlere uygun ödev bulunamadı.</p>
            </div>
          ) : (
            <div className="dashboard-grid">
              {filteredHomeworks.map((hw, index) => (
                <div key={hw._id || hw.id || index} className="dashboard-card">
                <div className="card-header">
                  <div className="card-icon">
                    <FileText className="icon" />
                  </div>
                  {(user?.rol === 'teacher' || user?.rol === 'admin') && (
                    <button
                      onClick={() => handleDelete(hw.id || hw._id || '')}
                      className="card-badge delete-button"
                      title="Ödevi Sil"
                    >
                      <Trash2 className="icon" />
                    </button>
                  )}
                </div>
                <div className="card-content">
                  <h3>{hw.title}</h3>
                  <p className="card-subtitle">{hw.subject} • {hw.classLevel || hw.grade || 'N/A'}. Sınıf{hw.classSection ? ` ${hw.classSection}` : ''}</p>
                  <p className="card-description">{hw.description || hw.content || 'Açıklama bulunmuyor'}</p>
                  <div className="card-meta">
                    <div className="meta-item">
                      <Calendar className="meta-icon" />
                      <span>Başlangıç: {(() => {
                        const dateStr = hw.assignedDate || hw.startDate;
                        if (!dateStr) return 'Belirtilmemiş';
                        try {
                          const date = new Date(dateStr);
                          if (isNaN(date.getTime())) return 'Geçersiz tarih';
                          return date.toLocaleDateString('tr-TR', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          });
                        } catch {
                          return 'Geçersiz tarih';
                        }
                      })()}</span>
                    </div>
                    <div className="meta-item">
                      <Calendar className="meta-icon" />
                      <span>Bitiş: {(() => {
                        const dateStr = hw.dueDate || hw.endDate;
                        if (!dateStr) return 'Belirtilmemiş';
                        try {
                          const date = new Date(dateStr);
                          if (isNaN(date.getTime())) return 'Geçersiz tarih';
                          return date.toLocaleDateString('tr-TR', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          });
                        } catch {
                          return 'Geçersiz tarih';
                        }
                      })()}</span>
                    </div>
                    {hw.file && (
                      <div className="meta-item">
                        <Download className="meta-icon" />
                        <a href={hw.file} download className="file-link">
                          Dosyayı İndir
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Add Homework Modal */}
        {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Yeni Ödev Ekle</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="modal-close"
                aria-label="Kapat"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);

              try {
                let fileUrl = '';

                // Handle file upload if file is selected
                const fileInput = form.querySelector('input[name="file"]') as HTMLInputElement;
                if (fileInput && fileInput.files && fileInput.files[0]) {
                  const file = fileInput.files[0];
                  const uploadFormData = new FormData();
                  uploadFormData.append('file', file);

                  try {
                    const response = await fetch('/api/upload', {
                      method: 'POST',
                      body: uploadFormData,
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                      }
                    });

                    if (response.ok) {
                      const result = await response.json();
                      fileUrl = result.url;
                    } else {
                      console.error('File upload failed');
                    }
                  } catch (uploadError) {
                    console.error('File upload error:', uploadError);
                  }
                }

                // Create the homework with file URL if uploaded
                const startDate = formData.get('startDate') as string;
                const endDate = formData.get('endDate') as string;
                
                const homeworkData = {
                  title: formData.get('title') as string,
                  description: formData.get('content') as string,
                  subject: formData.get('subject') as string,
                  classLevel: formData.get('grade') as string,
                  classSection: formData.get('section') as string || 'A',
                  assignedDate: startDate || new Date().toISOString(),
                  dueDate: endDate,
                  attachments: fileUrl ? [fileUrl] : []
                };

                const { error } = await HomeworkService.createHomework(homeworkData);

                if (error) {
                  alert(error);
                } else {
                  // Show success message
                  alert('Ödev başarıyla oluşturuldu!');
                  
                  // Then fetch the updated list of homeworks
                  const { data, error: fetchError } = await HomeworkService.getHomeworks();
                  if (fetchError) {
                    console.error('Error fetching homeworks:', fetchError);
                    alert('Ödev oluşturuldu ancak liste yenilenemedi. Sayfayı yenileyin.');
                  } else {
                    setHomeworks((data as Homework[]) || []);
                  }
                  
                  // Close modal and reset form
                  setShowModal(false);
                  form.reset();
                }
              } catch (error) {
                console.error('Ödev oluşturulurken hata oluştu:', error);
                alert('Ödev eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
              }
            }} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ödev Başlığı</label>
                  <input
                    name="title"
                    type="text"
                    className="form-control"
                    required
                    placeholder="Ödev başlığını giriniz"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ders</label>
                  <select
                    name="subject"
                    className="form-control"
                    required
                  >
                    <option value="">Ders Seçiniz</option>
                    <option value="Matematik">Matematik</option>
                    <option value="Fizik">Fizik</option>
                    <option value="Kimya">Kimya</option>
                    <option value="Biyoloji">Biyoloji</option>
                    <option value="Türkçe">Türkçe</option>
                    <option value="İngilizce">İngilizce</option>
                    <option value="Tarih">Tarih</option>
                    <option value="Coğrafya">Coğrafya</option>
                    <option value="Din">Din Kültürü</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ödev Açıklaması</label>
                <textarea
                  name="content"
                  rows={4}
                  className="form-control"
                  required
                  placeholder="Ödev açıklamasını giriniz"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Başlangıç Tarihi</label>
                  <input
                    name="startDate"
                    type="date"
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Bitiş Tarihi</label>
                  <input
                    name="endDate"
                    type="date"
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Sınıf</label>
                  <select
                    name="grade"
                    className="form-control"
                    required
                  >
                    <option value="">Sınıf Seçiniz</option>
                    <option value="9">9. Sınıf</option>
                    <option value="10">10. Sınıf</option>
                    <option value="11">11. Sınıf</option>
                    <option value="12">12. Sınıf</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Dosya Ekle (Opsiyonel)</label>
                  <div className="file-upload">
                    <label className="file-upload-label">
                      <span>Dosya Seç</span>
                      <input
                        name="file"
                        type="file"
                        className="sr-only"
                        onChange={(e) => {
                          const fileName = e.target.files?.[0]?.name || 'Dosya seçilmedi';
                          const fileNameSpan = e.target.parentElement?.nextElementSibling as HTMLSpanElement;
                          if (fileNameSpan) {
                            fileNameSpan.textContent = fileName;
                          }
                        }}
                      />
                    </label>
                    <span className="file-name">
                      Dosya seçilmedi
                    </span>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Ödevi Kaydet
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
