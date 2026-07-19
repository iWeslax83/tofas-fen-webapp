import { useState, useEffect } from 'react';
import {
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
import { useTheme } from '../../hooks/useTheme';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { SecureAPI } from '../../utils/api';
import { API_ENDPOINTS } from '../../utils/apiEndpoints';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Chip } from '../../components/ui/Chip';
import { Switch } from '../../components/ui/Switch';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import { safeConsoleError } from '../../utils/safeLogger';

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

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <Card contentClassName="p-5">
      <div className="text-xs font-medium text-[var(--ink-dim)] border-b border-[var(--rule)] pb-3 mb-4 uppercase tracking-wider">
        {title}
      </div>
      {children}
    </Card>
  );
}

interface SettingsRowProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  active?: boolean;
  label: string;
  description: string;
  children: React.ReactNode;
}

function SettingsRow({ icon: Icon, active, label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 [&+&]:border-t [&+&]:border-[var(--rule)]">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon
            size={16}
            className={cn('shrink-0', active ? 'text-[var(--accent)]' : 'text-[var(--ink-dim)]')}
          />
          <span className="font-serif text-sm text-[var(--ink)]">{label}</span>
        </div>
        <span className="text-xs text-[var(--ink-dim)]">{description}</span>
      </div>
      {children}
    </div>
  );
}

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
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
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
      safeConsoleError('Push toggle error:', error);
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
      <div className="p-6 max-w-2xl space-y-5">
        <header>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Ayarlar</h1>
        </header>

        {/* Profile Info */}
        <Section title="Profil Bilgileri">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--ink-dim)]">Ad Soyad</span>
              <span className="font-serif text-sm text-[var(--ink)] px-3 py-2 bg-[var(--surface-2)] rounded-[var(--radius-sm)] border border-[var(--rule)]">
                {user?.adSoyad || '-'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--ink-dim)]">Rol</span>
              <span className="font-serif text-sm text-[var(--ink)] px-3 py-2 bg-[var(--surface-2)] rounded-[var(--radius-sm)] border border-[var(--rule)]">
                {roleLabels[user?.rol || ''] || user?.rol}
              </span>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--ink-dim)]">E-posta</span>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Mail
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-dim)] pointer-events-none"
                  />
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ornek@gmail.com"
                    disabled={emailSaving}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleEmailSave}
                  disabled={emailSaving || newEmail.trim() === (user?.email || '')}
                  loading={emailSaving}
                >
                  <Save size={14} />
                  Kaydet
                </Button>
              </div>

              {emailNeedsVerification && (
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <Chip tone="warn">
                    <ShieldCheck size={12} />
                    E-posta doğrulanmamış
                  </Chip>
                  {!codeSent ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSendVerificationCode}
                      loading={sendingCode}
                    >
                      <Send size={14} />
                      Doğrulama Kodu Gönder
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleVerifyCode();
                        }}
                        className="w-28 text-center font-mono tracking-[0.3em]"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleVerifyCode}
                        disabled={verifyingCode || verificationCode.length !== 6}
                        loading={verifyingCode}
                      >
                        Doğrula
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSendVerificationCode}
                        disabled={sendingCode}
                      >
                        Tekrar Gönder
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {user?.email && user.emailVerified === true && (
                <div className="mt-2">
                  <Chip tone="ok">
                    <ShieldCheck size={12} />
                    E-posta doğrulanmış
                  </Chip>
                </div>
              )}
            </div>

            {user?.sinif && user?.sube && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--ink-dim)]">Sınıf / Şube</span>
                <span className="font-serif text-sm text-[var(--ink)] px-3 py-2 bg-[var(--surface-2)] rounded-[var(--radius-sm)] border border-[var(--rule)]">
                  {user.sinif} / {user.sube}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--ink-dim)]">Kullanıcı ID</span>
              <span className="font-mono text-sm text-[var(--ink)] px-3 py-2 bg-[var(--surface-2)] rounded-[var(--radius-sm)] border border-[var(--rule)]">
                {user?.id || '-'}
              </span>
            </div>
          </div>
        </Section>

        {/* Two-Factor Authentication - admin/teacher only */}
        {isAdminOrTeacher && (
          <Section title="Güvenlik">
            <SettingsRow
              icon={Shield}
              active={twoFactorEnabled}
              label="İki Faktörlü Doğrulama"
              description={
                !user?.email
                  ? 'İki faktörlü doğrulama için bir e-posta adresi eklemeniz gerekiyor.'
                  : !user?.emailVerified
                    ? 'İki faktörlü doğrulama için e-posta adresinizi doğrulamanız gerekiyor.'
                    : 'Giriş yaparken e-posta adresinize gönderilen bir kod ile ek güvenlik sağlar.'
              }
            >
              <Switch
                checked={twoFactorEnabled}
                onChange={handleTwoFactorToggle}
                disabled={!canEnable2FA || twoFactorLoading}
              />
            </SettingsRow>
          </Section>
        )}

        {/* Theme */}
        <Section title="Sayfa Teması">
          <div className="flex gap-3">
            {(
              [
                { key: 'light', label: 'Aydınlık', icon: Sun },
                { key: 'dark', label: 'Karanlık', icon: Moon },
                { key: 'system', label: 'Sistem', icon: Monitor },
              ] as const
            ).map(({ key, label, icon: Icon }) => {
              const active = theme === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme(key)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-2 px-3 py-4 rounded-[var(--radius-sm)] border transition-colors',
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-tint)] text-[var(--accent)]'
                      : 'border-[var(--rule)] bg-[var(--surface)] text-[var(--ink-dim)] hover:border-[var(--ink-dim)]',
                  )}
                  aria-pressed={active}
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Bildirimler">
          <SettingsRow
            icon={notificationsEnabled ? Bell : BellOff}
            active={notificationsEnabled}
            label="Tarayıcı Bildirimleri"
            description={
              permissionDenied
                ? 'Bildirim izni tarayıcıdan engellendi. Tarayıcı ayarlarından izin verin.'
                : 'Yeni duyuru ve güncellemeler için bildirim al'
            }
          >
            <Switch
              checked={notificationsEnabled}
              onChange={handleNotificationToggle}
              disabled={permissionDenied}
            />
          </SettingsRow>
        </Section>

        {/* Push Notifications */}
        {'serviceWorker' in navigator && 'PushManager' in window && (
          <Section title="Push Bildirimleri">
            <SettingsRow
              icon={Smartphone}
              active={pushEnabled}
              label="Push Bildirimleri"
              description="Veli onayı, evci hatırlatmaları ve önemli güncellemeler için anlık bildirim al"
            >
              <Switch
                checked={pushEnabled}
                onChange={handlePushToggle}
                disabled={pushLoading || permissionDenied}
              />
            </SettingsRow>
          </Section>
        )}

        {/* Account */}
        <Section title="Hesap">
          <Button variant="danger" size="sm" onClick={logout}>
            <LogOut size={16} />
            Oturumu Kapat
          </Button>
        </Section>
      </div>
    </ModernDashboardLayout>
  );
}
