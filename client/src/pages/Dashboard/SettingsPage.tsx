import { useState, useEffect } from 'react';
import {
  Settings,
  LogOut,
  Bell,
  BellOff,
  Smartphone,
  Mail,
  Save,
  ShieldCheck,
  Send,
  Sun,
  Moon,
  Monitor,
  Shield,
} from 'lucide-react';
import axios from 'axios';
import { useAuthContext } from '../../contexts/AuthContext';
import { useUpdateUser } from '../../stores/authStore';
import { useTheme } from '../../stores/uiStore';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { SecureAPI } from '../../utils/api';
import { API_ENDPOINTS } from '../../utils/apiEndpoints';
import { toast } from 'sonner';
import './SettingsPage.css';

interface ApiErrorData {
  message?: string;
  error?: string | { message?: string };
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorData>(error)) {
    const data = error.response?.data;
    if (data) {
      if (typeof data.error === 'object' && data.error?.message) return data.error.message;
      if (typeof data.error === 'string') return data.error;
      if (data.message) return data.message;
    }
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

const NOTIF_PREF_KEY = 'tofas_notifications_enabled';
const PUSH_PREF_KEY = 'tofas_push_enabled';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const roleLabels: Record<string, string> = {
  admin: 'Yönetici',
  teacher: 'Öğretmen',
  student: 'Öğrenci',
  parent: 'Veli',

  ziyaretci: 'Ziyaretçi',
};

export default function SettingsPage() {
  const { user, logout, checkAuth } = useAuthContext();
  const updateUser = useUpdateUser();
  const { theme, setTheme } = useTheme();
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [emailSaving, setEmailSaving] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof Notification === 'undefined') return false;
    const saved = localStorage.getItem(NOTIF_PREF_KEY);
    return saved === 'true' && Notification.permission === 'granted';
  });
  const [permissionDenied, setPermissionDenied] = useState(() => {
    if (typeof Notification === 'undefined') return true;
    return Notification.permission === 'denied';
  });
  const [pushEnabled, setPushEnabled] = useState(() => {
    return localStorage.getItem(PUSH_PREF_KEY) === 'true';
  });
  const [pushLoading, setPushLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled ?? false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  const isAdminOrTeacher = user?.rol === 'admin' || user?.rol === 'teacher';
  const canEnable2FA = isAdminOrTeacher && user?.email && user?.emailVerified;

  useEffect(() => {
    setTwoFactorEnabled(user?.twoFactorEnabled ?? false);
  }, [user?.twoFactorEnabled]);

  const handleTwoFactorToggle = async () => {
    if (twoFactorLoading) return;
    setTwoFactorLoading(true);
    const newValue = !twoFactorEnabled;

    try {
      await SecureAPI.post(API_ENDPOINTS.AUTH.TOGGLE_2FA, { enabled: newValue });
      setTwoFactorEnabled(newValue);
      updateUser({ twoFactorEnabled: newValue });
      toast.success(
        newValue ? 'İki faktörlü doğrulama aktif edildi' : 'İki faktörlü doğrulama deaktif edildi',
      );
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'İşlem başarısız'));
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleNotificationToggle = async () => {
    if (typeof Notification === 'undefined') return;

    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem(NOTIF_PREF_KEY, 'true');
        // Test bildirimi gönder
        new Notification('Bildirimler Aktif', {
          body: 'Tofaş Fen Lisesi bildirimlerini almaya başladınız.',
          icon: '/tofaslogo.png',
        });
      } else if (permission === 'denied') {
        setPermissionDenied(true);
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem(NOTIF_PREF_KEY, 'false');
    }
  };

  const handlePushToggle = async () => {
    if (pushLoading) return;
    setPushLoading(true);

    try {
      if (!pushEnabled) {
        // Enable push notifications
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          toast.error('Bu tarayıcı push bildirimlerini desteklemiyor');
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error('Bildirim izni reddedildi');
          return;
        }

        // Get VAPID public key
        const { data: vapidData } = await SecureAPI.get<{ data: { publicKey?: string } }>(
          API_ENDPOINTS.PUSH.VAPID_PUBLIC_KEY,
        );
        const vapidPublicKey = vapidData?.publicKey;
        if (!vapidPublicKey) {
          toast.error('Push bildirimleri sunucuda yapılandırılmamış');
          return;
        }

        // Subscribe
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        const subJson = subscription.toJSON();
        await SecureAPI.post(API_ENDPOINTS.PUSH.SUBSCRIBE, {
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        });

        setPushEnabled(true);
        localStorage.setItem(PUSH_PREF_KEY, 'true');
        toast.success('Push bildirimleri aktif edildi');
      } else {
        // Disable push notifications
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await SecureAPI.delete(API_ENDPOINTS.PUSH.UNSUBSCRIBE, {
            data: { endpoint: subscription.endpoint },
          });
          await subscription.unsubscribe();
        }

        setPushEnabled(false);
        localStorage.setItem(PUSH_PREF_KEY, 'false');
        toast.success('Push bildirimleri kapatıldı');
      }
    } catch (error) {
      console.error('Push toggle error:', error);
      toast.error('Push bildirim ayarı değiştirilirken hata oluştu');
    } finally {
      setPushLoading(false);
    }
  };

  const handleEmailSave = async () => {
    if (!user?.id) return;
    const trimmed = newEmail.trim();
    if (!trimmed) {
      toast.error('E-posta adresi boş olamaz');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Geçerli bir e-posta adresi girin');
      return;
    }
    if (trimmed === user.email) {
      toast.info('E-posta adresi zaten aynı');
      return;
    }
    setEmailSaving(true);
    try {
      await SecureAPI.put(API_ENDPOINTS.USER.UPDATE(user.id), { email: trimmed });
      updateUser({ email: trimmed, emailVerified: false });
      setCodeSent(false);
      setVerificationCode('');
      await checkAuth();
      toast.success('E-posta adresi güncellendi. Lütfen yeni adresinizi doğrulayın.');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'E-posta güncellenirken hata oluştu'));
    } finally {
      setEmailSaving(false);
    }
  };

  const handleSendVerificationCode = async () => {
    setSendingCode(true);
    try {
      await SecureAPI.post('/api/auth/send-verification', {});
      setCodeSent(true);
      setVerificationCode('');
      toast.success('Doğrulama kodu e-posta adresinize gönderildi');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Kod gönderilemedi'));
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Lütfen 6 haneli kodu girin');
      return;
    }
    setVerifyingCode(true);
    try {
      await SecureAPI.post('/api/auth/verify-email', { code: verificationCode });
      updateUser({ emailVerified: true });
      setCodeSent(false);
      setVerificationCode('');
      toast.success('E-posta adresiniz doğrulandı');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Doğrulama başarısız'));
    } finally {
      setVerifyingCode(false);
    }
  };

  const emailNeedsVerification = user?.email && user.emailVerified === false;

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Ayarlar' },
  ];

  return (
    <ModernDashboardLayout pageTitle="Ayarlar" breadcrumb={breadcrumb}>
      <div className="settings-page">
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-title-section">
              <Settings className="page-icon" />
              <h1 className="page-title-main">Ayarlar</h1>
            </div>
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
            <div className="profile-info-item email-edit-item">
              <span className="profile-info-label">E-posta</span>
              <div className="email-edit-row">
                <div className="email-input-wrapper">
                  <Mail size={16} className="email-input-icon" />
                  <input
                    type="email"
                    className="email-edit-input"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ornek@gmail.com"
                    disabled={emailSaving}
                  />
                </div>
                <button
                  className="email-save-btn"
                  onClick={handleEmailSave}
                  disabled={emailSaving || newEmail.trim() === (user?.email || '')}
                >
                  <Save size={14} />
                  {emailSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
              {emailNeedsVerification && (
                <div className="email-verification-section">
                  <div className="verification-status">
                    <ShieldCheck size={16} className="verification-icon unverified" />
                    <span className="verification-text">E-posta doğrulanmamış</span>
                  </div>
                  {!codeSent ? (
                    <button
                      className="btn-send-verification"
                      onClick={handleSendVerificationCode}
                      disabled={sendingCode}
                    >
                      <Send size={14} />
                      {sendingCode ? 'Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
                    </button>
                  ) : (
                    <div className="verification-code-row">
                      <input
                        type="text"
                        className="verification-code-input"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleVerifyCode();
                        }}
                      />
                      <button
                        className="btn-verify-code"
                        onClick={handleVerifyCode}
                        disabled={verifyingCode || verificationCode.length !== 6}
                      >
                        {verifyingCode ? 'Doğrulanıyor...' : 'Doğrula'}
                      </button>
                      <button
                        className="btn-resend-code"
                        onClick={handleSendVerificationCode}
                        disabled={sendingCode}
                      >
                        {sendingCode ? '...' : 'Tekrar Gönder'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {user?.email && user.emailVerified === true && (
                <div className="email-verification-section">
                  <div className="verification-status">
                    <ShieldCheck size={16} className="verification-icon verified" />
                    <span className="verification-text verified">E-posta doğrulanmış</span>
                  </div>
                </div>
              )}
            </div>
            {user?.sinif && user?.sube && (
              <div className="profile-info-item">
                <span className="profile-info-label">Sınıf / Şube</span>
                <span className="profile-info-value">
                  {user.sinif} / {user.sube}
                </span>
              </div>
            )}
            <div className="profile-info-item">
              <span className="profile-info-label">Kullanıcı ID</span>
              <span className="profile-info-value">{user?.id || '-'}</span>
            </div>
          </div>
        </section>

        {/* Two-Factor Authentication - admin/teacher only */}
        {isAdminOrTeacher && (
          <section className="settings-section">
            <h2 className="settings-section-title">Güvenlik</h2>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label-group">
                  <Shield
                    size={18}
                    className={`settings-row-icon${twoFactorEnabled ? ' active' : ''}`}
                  />
                  <span className="settings-row-label">İki Faktörlü Doğrulama</span>
                </div>
                <span className="settings-row-desc">
                  {!user?.email
                    ? 'İki faktörlü doğrulama için bir e-posta adresi eklemeniz gerekiyor.'
                    : !user?.emailVerified
                      ? 'İki faktörlü doğrulama için e-posta adresinizi doğrulamanız gerekiyor.'
                      : 'Giriş yaparken e-posta adresinize gönderilen bir kod ile ek güvenlik sağlar.'}
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={handleTwoFactorToggle}
                  disabled={!canEnable2FA || twoFactorLoading}
                />
                <span
                  className={`toggle-slider${!canEnable2FA || twoFactorLoading ? ' disabled' : ''}`}
                />
              </label>
            </div>
          </section>
        )}

        {/* Theme */}
        <section className="settings-section">
          <h2 className="settings-section-title">Sayfa Teması</h2>
          <div className="theme-selector">
            <button
              className={`theme-option${theme === 'light' ? ' active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <Sun size={20} />
              <span>Aydınlık</span>
            </button>
            <button
              className={`theme-option${theme === 'dark' ? ' active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <Moon size={20} />
              <span>Karanlık</span>
            </button>
            <button
              className={`theme-option${theme === 'system' ? ' active' : ''}`}
              onClick={() => setTheme('system')}
            >
              <Monitor size={20} />
              <span>Sistem</span>
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section className="settings-section">
          <h2 className="settings-section-title">Bildirimler</h2>
          <div className="settings-row">
            <div className="settings-row-info">
              <div className="settings-row-label-group">
                {notificationsEnabled ? (
                  <Bell size={18} className="settings-row-icon active" />
                ) : (
                  <BellOff size={18} className="settings-row-icon" />
                )}
                <span className="settings-row-label">Tarayıcı Bildirimleri</span>
              </div>
              <span className="settings-row-desc">
                {permissionDenied
                  ? 'Bildirim izni tarayıcıdan engellendi. Tarayıcı ayarlarından izin verin.'
                  : 'Yeni duyuru ve güncellemeler için bildirim al'}
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={handleNotificationToggle}
                disabled={permissionDenied}
              />
              <span className={`toggle-slider${permissionDenied ? ' disabled' : ''}`} />
            </label>
          </div>
        </section>

        {/* Push Notifications */}
        {'serviceWorker' in navigator && 'PushManager' in window && (
          <section className="settings-section">
            <h2 className="settings-section-title">Push Bildirimleri</h2>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label-group">
                  <Smartphone
                    size={18}
                    className={`settings-row-icon${pushEnabled ? ' active' : ''}`}
                  />
                  <span className="settings-row-label">Push Bildirimleri</span>
                </div>
                <span className="settings-row-desc">
                  Veli onayı, evci hatırlatmaları ve önemli güncellemeler için anlık bildirim al
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={pushEnabled}
                  onChange={handlePushToggle}
                  disabled={pushLoading || permissionDenied}
                />
                <span
                  className={`toggle-slider${pushLoading || permissionDenied ? ' disabled' : ''}`}
                />
              </label>
            </div>
          </section>
        )}

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
