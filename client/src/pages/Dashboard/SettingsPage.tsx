import { useState } from 'react';
import { Settings, LogOut } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import './SettingsPage.css';

const roleLabels: Record<string, string> = {
  admin: 'Yönetici',
  teacher: 'Öğretmen',
  student: 'Öğrenci',
  parent: 'Veli',
  hizmetli: 'Hizmetli',
};

export default function SettingsPage() {
  const { user, logout } = useAuthContext();
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return Notification.permission === 'granted';
  });

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    } else {
      setNotificationsEnabled(false);
    }
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Ayarlar' },
  ];

  return (
    <ModernDashboardLayout pageTitle="Ayarlar" breadcrumb={breadcrumb}>
      <div className="settings-page">
        <div className="page-header">
          <div className="page-header-content">
            <Settings className="page-icon" />
            <h1 className="page-title-main">Ayarlar</h1>
          </div>
        </div>

        {/* Profile Info */}
        <section className="settings-section">
          <h2 className="settings-section-title">Profil Bilgileri</h2>
          <div className="profile-info-grid">
            <div className="profile-info-item">
              <span className="profile-info-label">Ad Soyad</span>
              <span className="profile-info-value">{user?.adSoyad || '-'}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Rol</span>
              <span className="profile-info-value">{roleLabels[user?.rol || ''] || user?.rol}</span>
            </div>
            {user?.email && (
              <div className="profile-info-item">
                <span className="profile-info-label">E-posta</span>
                <span className="profile-info-value">{user.email}</span>
              </div>
            )}
            {user?.sinif && user?.sube && (
              <div className="profile-info-item">
                <span className="profile-info-label">Sınıf / Şube</span>
                <span className="profile-info-value">{user.sinif} / {user.sube}</span>
              </div>
            )}
            <div className="profile-info-item">
              <span className="profile-info-label">Kullanıcı ID</span>
              <span className="profile-info-value">{user?.id || '-'}</span>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="settings-section">
          <h2 className="settings-section-title">Bildirimler</h2>
          <div className="settings-row">
            <div className="settings-row-info">
              <span className="settings-row-label">Tarayıcı Bildirimleri</span>
              <span className="settings-row-desc">Yeni duyuru ve güncellemeler için bildirim al</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={handleNotificationToggle}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </section>

        {/* Account */}
        <section className="settings-section">
          <h2 className="settings-section-title">Hesap</h2>
          <button onClick={logout} className="settings-logout-btn">
            <LogOut size={18} />
            Oturumu Kapat
          </button>
          <p className="app-version">Tofaş Fen Lisesi Bilgi Sistemi v1.0</p>
        </section>
      </div>
    </ModernDashboardLayout>
  );
}
