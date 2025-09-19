import { useState, useEffect } from "react";
import { Bell, Plus, Calendar, Trash2 } from 'lucide-react';
import { useAuth } from "../../hooks/useAuth";
import { AnnouncementService } from "../../utils/apiService";
import { toast } from "react-toastify";
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';

interface Announcement {
  _id?: string;
  title: string;
  content: string;
  date: string;
  expire?: string;
}

// type ApiResponse<T> = AxiosResponse<T>; // Not used

export default function DuyurularPage() {
  const { user } = useAuth(["admin", "teacher", "student", "parent"]);
  const [showModal, setShowModal] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data, error } = await AnnouncementService.getAnnouncements();
        if (error) {
          console.error('Error fetching announcements:', error);
        } else {
          setAnnouncements(Array.isArray(data) ? data as Announcement[] : []);
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
        setAnnouncements([]);
        toast.error('Duyurular yüklenirken hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm('Bu duyuruyu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const { error } = await AnnouncementService.deleteAnnouncement(announcementId);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Duyuru başarıyla silindi');
        // Refresh announcements
        const { data, error: fetchError } = await AnnouncementService.getAnnouncements();
        if (fetchError) {
          console.error('Error fetching announcements:', fetchError);
        } else {
          setAnnouncements(Array.isArray(data) ? data as Announcement[] : []);
        }
      }
    } catch (error: unknown) {
      console.error('Duyuru silme hatası:', error);
      toast.error((error as any)?.response?.data?.error || 'Duyuru silinirken hata oluştu');
    }
  };

  if (isLoading) {
    return (
      <div className="centered-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Duyurular' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Duyurular"
      breadcrumb={breadcrumb}
    >
      <div className="welcome-section">
        <BackButton />
        <div className="welcome-card">
          <div className="welcome-content">
            <div className="welcome-text">
              <h2>Duyurular</h2>
              <p>Okul duyurularını buradan takip edebilirsiniz.</p>
            </div>
            <div className="welcome-actions">
              {user?.rol === 'admin' && (
                <button 
                  onClick={() => setShowModal(true)}
                  className="btn-blue"
                >
                  <Plus className="icon" />
                  <span>Yeni Duyuru Ekle</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {announcements.length === 0 ? (
          <div className="empty-state">
            <Bell className="empty-icon" />
            <h3>Henüz duyuru bulunmuyor</h3>
            <p>Yeni duyurular burada görünecektir.</p>
          </div>
        ) : (
          <div className="dashboard-grid">
            {announcements.map((announcement, index) => (
              <div key={announcement._id || index} className="dashboard-card">
                <div className="card-header">
                  <div className="card-icon">
                    <Bell className="icon" />
                  </div>
                  {user?.rol === 'admin' && (
                    <button 
                      onClick={() => handleDeleteAnnouncement(announcement._id!)}
                      className="card-badge delete-button"
                      title="Duyuruyu Sil"
                    >
                      <Trash2 className="icon" />
                    </button>
                  )}
                </div>
                <div className="card-content">
                  <h3 className="card-title">{announcement.title}</h3>
                  <p className="card-description">{announcement.content}</p>
                  <div className="card-meta">
                    <div className="meta-item">
                      <Calendar className="meta-icon" />
                      <span>{new Date(announcement.date).toLocaleDateString('tr-TR')}</span>
                    </div>
                    {announcement.expire && (
                      <div className="meta-item">
                        <Calendar className="meta-icon" />
                        <span>Son Geçerlilik: {new Date(announcement.expire).toLocaleDateString('tr-TR')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Announcement Modal */}
      {showModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div className="modal-header">
                  <h3 className="modal-title">Yeni Duyuru Ekle</h3>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="modal-close"
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const announcementData = {
                    title: formData.get('title'),
                    content: formData.get('content'),
                    date: new Date().toISOString(),
                    expire: formData.get('expire') || undefined
                  };
                  try {
                    const { error } = await AnnouncementService.createAnnouncement(announcementData);
                    if (error) {
                      toast.error(error);
                    } else {
                      const { data: fetchData, error: fetchError } = await AnnouncementService.getAnnouncements();
                      if (fetchError) {
                        console.error('Error fetching announcements:', fetchError);
                      } else {
                        setAnnouncements(Array.isArray(fetchData) ? fetchData as Announcement[] : []);
                      }
                      setShowModal(false);
                      (e.target as HTMLFormElement).reset();
                      toast.success('Duyuru başarıyla eklendi');
                    }
                  } catch (error) {
                    console.error('Error creating announcement:', error);
                    toast.error('Duyuru eklenirken hata oluştu');
                  }
                }} className="modal-form">
                  <div className="form-group">
                    <label className="form-label">Duyuru Başlığı</label>
                    <input name="title" className="form-input" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duyuru İçeriği</label>
                    <textarea name="content" className="form-textarea" rows={4} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Son Geçerlilik Tarihi (Opsiyonel)</label>
                    <input name="expire" type="date" className="form-input" />
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                      İptal
                    </button>
                    <button type="submit" className="btn-primary">
                      Kaydet
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
    </ModernDashboardLayout>
  );
}
