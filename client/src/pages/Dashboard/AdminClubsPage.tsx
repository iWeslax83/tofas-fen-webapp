import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
// import { useNavigate } from 'react-router-dom'; // Not used
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ClubService } from "../../utils/apiService";
import BackButton from "../../components/BackButton";
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import './AdminClubsPage.css';
import '../../index.css';

// const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'; // Not used

interface Club {
  _id: string;
  name: string;
  presidentId: string;
  members: string[];
  logo?: string;
  memberCount: number;
  createdAt: string;
}

interface ClubFormData {
  name: string;
  presidentId: string;
  logo: File | null;
  logoPreview: string;
}

const AdminClubsPage = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ClubFormData>({
    name: '',
    presidentId: '',
    logo: null,
    logoPreview: ''
  });

  // const navigate = useNavigate(); // Not used
  
  // Initialize navigation - removed unused function

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const { data, error } = await ClubService.getClubs();
      if (error) {
        toast.error(error);
      } else {
        setClubs((data as Club[]) || []);
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
      toast.error('Kulüpler yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('presidentId', formData.presidentId);
      if (formData.logo) {
        formDataToSend.append('logo', formData.logo);
      }

      const { data, error } = await ClubService.createClub(formDataToSend);
      if (error) {
        toast.error(error);
      } else {
        const newClub = data as Club;
        setClubs([newClub, ...clubs]);
        setFormData({
          name: '',
          presidentId: '',
          logo: null,
          logoPreview: ''
        });
        setIsModalOpen(false);
        toast.success('Kulüp başarıyla oluşturuldu');
        fetchClubs();
      }
    } catch (error) {
      console.error('Kulüp oluşturulurken hata:', error);
      toast.error('Kulüp oluşturulurken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClub = async (id: string) => {
    if (!window.confirm('Bu kulübü silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      const { error } = await ClubService.deleteClub(id);
      if (error) {
        toast.error(error);
      } else {
        setClubs(clubs.filter(club => club._id !== id));
        toast.success('Kulüp başarıyla silindi');
      }
    } catch (error) {
      console.error('Error deleting club:', error);
      toast.error('Kulüp silinirken bir hata oluştu');
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        logo: file,
        logoPreview: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      presidentId: '',
      logo: null,
      logoPreview: ''
    });
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="centered-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <ModernDashboardLayout
      pageTitle="Kulüp Yönetimi"
      breadcrumb={[
        { label: 'Ana Sayfa', path: '/admin' },
        { label: 'Kulüp Yönetimi' }
      ]}
    >
      <div className="welcome-section">
        <BackButton />
        <div className="welcome-card">
          <div className="welcome-content">
            <div className="welcome-text">
              <h2>Kulüp Yönetimi</h2>
              <p>Okul kulüplerini görüntüleyin ve yönetin</p>
            </div>
            <div className="welcome-actions">
              <button 
                className="btn-blue"
                onClick={() => setIsModalOpen(true)}
                disabled={isSubmitting}
              >
                <Plus className="icon" />
                <span>{isSubmitting ? 'İşlem Yapılıyor...' : 'Yeni Kulüp Ekle'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">

        <div className="dashboard-grid">
          {clubs.length === 0 ? (
            <div className="empty-state">
              <Users className="empty-icon" />
              <h3>Henüz kulüp yok</h3>
              <p>İlk kulübü oluşturmak için yukarıdaki butonu kullanın.</p>
            </div>
          ) : (
            clubs.map((club) => (
              <div key={club._id} className="dashboard-card">
                <div className="card-header">
                  <div className="card-icon">
                    <Users className="icon" />
                  </div>
                  <div className="card-badge">
                    <span>{club.memberCount || club.members?.length || 0} üye</span>
                  </div>
                </div>
                
                <div className="card-content">
                  <h3 className="card-title">{club.name}</h3>
                  <p className="card-subtitle">Oluşturulma: {formatDate(club.createdAt)}</p>
                  <p className="card-description">Başkan ID: {club.presidentId}</p>
                  
                  <div className="card-footer">
                    <button 
                      className="btn-red"
                      onClick={() => handleDeleteClub(club._id)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="icon" />
                      <span>{isSubmitting ? 'Siliniyor...' : 'Sil'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add/Edit Club Modal */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3 className="modal-title">Yeni Kulüp Ekle</h3>
                <button 
                  type="button" 
                  className="close-button"
                  onClick={resetForm}
                >
                  &times;
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">Kulüp Adı</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Kulüp adını girin..."
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="presidentId" className="form-label">Kulüp Başkanı ID</label>
                  <input
                    type="text"
                    id="presidentId"
                    name="presidentId"
                    className="form-input"
                    value={formData.presidentId}
                    onChange={handleInputChange}
                    placeholder="Başkan kullanıcı ID'sini girin..."
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="logo" className="form-label">Kulüp Logosu (Opsiyonel)</label>
                  <div className="file-upload">
                    <label htmlFor="logo" className="file-upload-label">
                      <span>Dosya Seç</span>
                      <input
                        type="file"
                        id="logo"
                        name="logo"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="file-input"
                      />
                    </label>
                    {formData.logoPreview && (
                      <img 
                        src={formData.logoPreview} 
                        alt="Logo önizleme" 
                        className="logo-preview"
                      />
                    )}
                  </div>
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="secondary-button"
                    onClick={resetForm}
                  >
                    İptal
                  </button>
                  <button 
                    type="submit" 
                    className="primary-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
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

export default AdminClubsPage;
