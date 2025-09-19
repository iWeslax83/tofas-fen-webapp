import { useState, useEffect } from "react";
import { Plus, Calendar, Trash2, FileText, Download } from 'lucide-react';
import { useAuth } from "../../hooks/useAuth";
import { HomeworkService } from "../../utils/apiService";
import { toast } from "react-toastify";
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';
import './OdevlerPage.css';


interface Homework {
  _id?: string;
  title: string;
  content: string;
  subject: string;
  startDate: string;
  endDate: string;
  date: string;
  grade: string;
  file?: string;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
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
      console.warn(`User role ${user.rol} not allowed for odevler page`);
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
        const { data, error } = await HomeworkService.getHomeworks();
        if (error) {
          console.error('Error fetching homeworks:', error);
        } else {
          setHomeworks((data as Homework[]) || []);
        }
      } catch (error) {
        console.error('Error fetching homeworks:', error);
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
        } else {
          setHomeworks(hws => hws.filter(hw => hw._id !== id));
        }
      } catch (error) {
        console.error('Error deleting homework:', error);
      }
    }
  };

  const filteredHomeworks = homeworks.filter((hw: Homework) => {
    if (selectedSubject !== "Tümü" && hw.subject !== selectedSubject) return false;
    if (user?.rol === "student") {
      return hw.grade === (user as any).sinif;
    }
    if (user?.rol === "parent" && (user as any).childId) {
      if (!(user as any).childrenSiniflar) {
        return false;
      }
      return (user as any).childrenSiniflar.includes(hw.grade);
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
      <div className="welcome-section">
        <BackButton />
        <div className="welcome-card">
          <div className="welcome-content">
            <div className="welcome-text">
              <h2>Ödevler</h2>
              <p>
                {user?.rol === 'student' 
                  ? 'Ödevlerinizi buradan takip edebilirsiniz.'
                  : user?.rol === 'teacher' || user?.rol === 'admin'
                  ? 'Öğrenciler için ödev oluşturabilir ve yönetebilirsiniz.'
                  : 'Çocuğunuzun ödevlerini buradan takip edebilirsiniz.'
                }
              </p>
            </div>
            <div className="welcome-actions">
              {(user?.rol === 'teacher' || user?.rol === 'admin') && (
                <button 
                  onClick={() => setShowModal(true)}
                  className="btn-blue"
                >
                  <Plus className="icon" />
                  <span>Yeni Ödev Ekle</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
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
              <div key={hw._id || index} className="dashboard-card">
                <div className="card-header">
                  <div className="card-icon">
                    <FileText className="icon" />
                  </div>
                  {(user?.rol === 'teacher' || user?.rol === 'admin') && (
                    <button 
                      onClick={() => handleDelete(hw._id!)}
                      className="card-badge delete-button"
                      title="Ödevi Sil"
                    >
                      <Trash2 className="icon" />
                    </button>
                  )}
                </div>
                <div className="card-content">
                  <h3>{hw.title}</h3>
                  <p className="card-subtitle">{hw.subject} • {hw.grade}. Sınıf</p>
                  <p className="card-description">{hw.content}</p>
                  <div className="card-meta">
                    <div className="meta-item">
                      <Calendar className="meta-icon" />
                      <span>Başlangıç: {new Date(hw.startDate).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="meta-item">
                      <Calendar className="meta-icon" />
                      <span>Bitiş: {new Date(hw.endDate).toLocaleDateString('tr-TR')}</span>
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
                      const homeworkData = {
                        title: formData.get('title') as string,
                        content: formData.get('content') as string,
                        subject: formData.get('subject') as string,
                        startDate: formData.get('startDate') as string,
                        endDate: formData.get('endDate') as string,
                        grade: formData.get('grade') as string,
                        date: new Date().toISOString(),
                        ...(fileUrl && { file: fileUrl })
                      };
                      
                      const { error } = await HomeworkService.createHomework(homeworkData);
                      
                      if (error) {
                        alert(error);
                      } else {
                        // Then fetch the updated list of homeworks
                        const { data, error: fetchError } = await HomeworkService.getHomeworks();
                        if (fetchError) {
                          console.error('Error fetching homeworks:', fetchError);
                        } else {
                          setHomeworks((data as Homework[]) || []);
                        }
                      }
                      
                      setShowModal(false);
                      form.reset();
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
    </ModernDashboardLayout>
  );
}
