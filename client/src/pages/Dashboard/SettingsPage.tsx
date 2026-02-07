import { useEffect, useState } from "react";
import { User } from 'lucide-react';
import { useAuthContext } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';
import './SettingsPage.css';

type Tab = "Hesap";
const TABS: Tab[] = ["Hesap"];

export default function SettingsPage() {
  const { user, isLoading } = useAuthContext();
  const [activeTab, setActiveTab] = useState<Tab>("Hesap");
  const navigate = useNavigate();

  const userRole = user?.rol || "";

  useEffect(() => {
    // Check if user has the correct role
    if (!isLoading && user && !["admin", "teacher", "student", "parent"].includes(user.rol || '')) {
      console.warn(`User role ${user.rol || 'undefined'} not allowed for settings page`);
      navigate(`/${user.rol || 'login'}`);
      return;
    }

    // Redirect to login if no user
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);




  // Şifre değiştirme fonksiyonu kaldırıldı - artık TCKN kullanılıyor



  // Çıkış yap fonksiyonu (şimdilik kullanılmıyor)
  // const handleLogout = async () => {
  //   await SecureAPI.logout();
  //   window.location.href = "/login";
  // };

  if (isLoading) {
    return (
      <div className="centered-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <ModernDashboardLayout
        pageTitle="Ayarlar"
        breadcrumb={[
          { label: 'Ana Sayfa', path: `/${userRole}` },
          { label: 'Ayarlar' }
        ]}
      >
        <div className="error-message">
          <p>Kullanıcı bulunamadı.</p>
        </div>
      </ModernDashboardLayout>
    );
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${userRole}` },
    { label: 'Ayarlar' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Ayarlar"
      breadcrumb={breadcrumb}
    >        <BackButton />

      <div className="dashboard-content">
        <div className="tabs-container">
          <ul className="tabs-header">
            {TABS.map((tabName: Tab) => (
              <li key={tabName} className="tab-item">
                <button
                  onClick={() => setActiveTab(tabName)}
                  className={`tab-button ${activeTab === tabName ? 'active' : ''}`}
                >
                  {tabName}
                </button>
              </li>
            ))}
          </ul>

          {/* Hesap Tab */}
          {activeTab === "Hesap" && (
            <div className="tab-content">
              <div className="form-section">
                <h3 className="form-title">
                  <User className="h-5 w-5" />
                  Hesap Bilgileri
                </h3>
                <div className="info-message" style={{
                  padding: '20px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '8px',
                  border: '1px solid #bae6fd',
                  marginTop: '20px'
                }}>
                  <p style={{ margin: 0, color: '#0369a1', fontSize: '14px' }}>
                    <strong>Bilgi:</strong> Şifre değiştirme özelliği kaldırılmıştır.
                    Sistem artık T.C. Kimlik Numarası (TCKN) ile giriş yapmaktadır.
                  </p>
                </div>
                {user && (
                  <div className="form-grid" style={{ marginTop: '20px' }}>
                    <div className="form-group">
                      <label className="form-label">Kullanıcı ID</label>
                      <input
                        type="text"
                        className="form-input"
                        value={user.id}
                        disabled
                        style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ad Soyad</label>
                      <input
                        type="text"
                        className="form-input"
                        value={user.adSoyad}
                        disabled
                        style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Rol</label>
                      <input
                        type="text"
                        className="form-input"
                        value={user.rol}
                        disabled
                        style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ModernDashboardLayout>
  );
} 
