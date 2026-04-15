import { useState, useEffect } from 'react';
import { Bell, Plus, Calendar, Trash2, X } from 'lucide-react';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { AnnouncementService } from '../../utils/apiService';
import { toast } from 'react-toastify';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';

import './DuyurularPage.css';

interface Announcement {
  _id?: string;
  title: string;
  content: string;
  date: string;
  expire?: string;
}

export default function DuyurularPage() {
  const { user } = useAuthGuard(['admin', 'teacher', 'student', 'parent']);
  const [showModal, setShowModal] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        let data: Announcement[] = [];
        let error: string | null = null;

        // Öğrenci, veli ve öğretmen için rol bazlı/çocuk bazlı duyurular
        if (user?.rol === 'student' || user?.rol === 'parent' || user?.rol === 'teacher') {
          const result = await AnnouncementService.getAnnouncementsByRole(user.rol);
          data = Array.isArray(result.data) ? (result.data as Announcement[]) : [];
          error = result.error;
        } else {
          // Admin ve diğer roller için tüm duyurular
          const result = await AnnouncementService.getAnnouncements();
          data = Array.isArray(result.data) ? (result.data as Announcement[]) : [];
          error = result.error;
        }

        if (error) {
          console.error('Error fetching announcements:', error);
        }

        setAnnouncements(data);
      } catch (error) {
        console.error('Error fetching announcements:', error);
        setAnnouncements([]);
        toast.error('Duyurular yüklenirken hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
  }, [user]);

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
          setAnnouncements(Array.isArray(data) ? (data as Announcement[]) : []);
        }
      }
    } catch (error: unknown) {
      console.error('Duyuru silme hatası:', error);
      toast.error((error as any)?.response?.data?.error || 'Duyuru silinirken hata oluştu');
    }
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Duyurular' },
  ];

  if (isLoading) {
    return (
      <ModernDashboardLayout pageTitle="Duyurular" breadcrumb={breadcrumb}>
        <div className="duyurular-page">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Duyurular yükleniyor...</p>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Duyurular" breadcrumb={breadcrumb}>
      <div className="duyurular-page">
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-title-section">
              <Bell className="page-icon" />
              <h1 className="page-title-main">Duyurular</h1>
            </div>
            {user?.rol === 'admin' && (
              <button onClick={() => setShowModal(true)} className="btn-blue">
                <Plus size={18} />
                <span>Yeni Duyuru Ekle</span>
              </button>
            )}
          </div>
        </div>

        <div className="duyurular-page-content">
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
                      <Bell size={24} />
                    </div>
                    {user?.rol === 'admin' && (
                      <button
                        onClick={() => handleDeleteAnnouncement(announcement._id!)}
                        className="delete-button"
                        title="Duyuruyu Sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">{announcement.title}</h3>
                    <p className="card-description">{announcement.content}</p>
                    <div className="card-meta">
                      <div className="meta-item">
                        <Calendar className="meta-icon" />
                        <span>
                          Yayın Tarihi: {new Date(announcement.date).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      {announcement.expire && (
                        <div className="meta-item">
                          <Calendar className="meta-icon" />
                          <span>
                            Son Geçerlilik:{' '}
                            {new Date(announcement.expire).toLocaleDateString('tr-TR')}
                          </span>
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
            <div className="modal">
              <div className="modal-header">
                <h3 className="modal-title">Yeni Duyuru Ekle</h3>
                <button onClick={() => setShowModal(false)} className="modal-close">
                  <X size={20} />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const announcementData = {
                    title: String(formData.get('title') || ''),
                    content: String(formData.get('content') || ''),
                    date: new Date().toISOString(),
                    expire: formData.get('expire') ? String(formData.get('expire')) : undefined,
                  };
                  try {
                    const { error } =
                      await AnnouncementService.createAnnouncement(announcementData);
                    if (error) {
                      toast.error(error);
                    } else {
                      const { data: fetchData, error: fetchError } =
                        await AnnouncementService.getAnnouncements();
                      if (fetchError) {
                        console.error('Error fetching announcements:', fetchError);
                      } else {
                        setAnnouncements(
                          Array.isArray(fetchData) ? (fetchData as Announcement[]) : [],
                        );
                      }
                      setShowModal(false);
                      (e.target as HTMLFormElement).reset();
                      toast.success('Duyuru başarıyla eklendi');
                    }
                  } catch (error) {
                    console.error('Error creating announcement:', error);
                    toast.error('Duyuru eklenirken hata oluştu');
                  }
                }}
                className="modal-form"
              >
                <div className="form-group">
                  <label className="form-label">Duyuru Başlığı</label>
                  <input
                    name="title"
                    className="form-input"
                    required
                    placeholder="Duyuru başlığını giriniz"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duyuru İçeriği</label>
                  <textarea
                    name="content"
                    className="form-textarea"
                    rows={6}
                    required
                    placeholder="Duyuru içeriğini detaylıca yazınız"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Son Geçerlilik Tarihi (Opsiyonel)</label>
                  <input name="expire" type="date" className="form-input" />
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary"
                  >
                    İptal
                  </button>
                  <button type="submit" className="btn-primary">
                    Duyuruyu Yayınla
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
