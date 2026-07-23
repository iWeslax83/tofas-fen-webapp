import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAuthStore,
  useAuthActions,
  useUser,
  useRequires2FA,
  useTwoFactorUser,
  useTwoFactorExpiresAt,
} from '../stores/authStore';
import { VideoBackdrop } from '../components/VideoBackdrop';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Chip } from '../components/ui/Chip';
import { AppError } from '../utils/AppError';
import { cn } from '../utils/cn';

interface FieldProps {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}

const Field = ({ label, htmlFor, children }: FieldProps) => (
  <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
    <span className="text-sm font-medium text-[var(--ink-2)]">{label}</span>
    {children}
  </label>
);

const formatCountdown = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function LoginPage() {
  const [id, setId] = useState('');
  const [sifre, setSifre] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const { login, verify2FA, resend2FA, cancel2FA } = useAuthActions();
  const user = useUser();
  const requires2FA = useRequires2FA();
  const twoFactorUser = useTwoFactorUser();
  const twoFactorExpiresAt = useTwoFactorExpiresAt();

  useEffect(() => {
    if (user?.rol) navigate(`/${user.rol}`, { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!twoFactorExpiresAt) {
      setCountdown(0);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((twoFactorExpiresAt - Date.now()) / 1000));
      setCountdown(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [twoFactorExpiresAt]);

  const handleResend = useCallback(async () => {
    setIsResending(true);
    setError('');
    try {
      await resend2FA();
      toast.success('Yeni doğrulama kodu gönderildi');
      setTwoFactorCode('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      const msg =
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Kod gönderilemedi');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  }, [resend2FA]);

  if (user?.rol) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--paper)]">
        <div className="text-sm text-[var(--ink-dim)]">Yönlendiriliyor…</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim()) {
      setError('Kullanıcı ID gereklidir');
      return;
    }
    if (!sifre.trim()) {
      setError('Şifre gereklidir');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await login(id.trim(), sifre);
      if (!useAuthStore.getState().requires2FA) {
        toast.success('Giriş başarılı!');
      }
    } catch (err: unknown) {
      let errorMessage = 'Giriş başarısız. Lütfen kullanıcı ID ve şifrenizi kontrol edin.';
      try {
        if (err instanceof AppError) {
          errorMessage = err.getUserMessage() || err.message || errorMessage;
        } else if (err instanceof Error) {
          errorMessage = err.message || errorMessage;
        } else {
          const apiError = (err as { response?: { data?: unknown } })?.response?.data;
          if (apiError) {
            if (typeof apiError === 'string') {
              errorMessage = apiError;
            } else if (typeof apiError === 'object' && apiError) {
              const a = apiError as {
                error?: { message?: string } | string;
                message?: string;
                errors?: Array<string | { message?: string }>;
              };
              if (typeof a.error === 'object' && a.error?.message) errorMessage = a.error.message;
              else if (typeof a.message === 'string') errorMessage = a.message;
              else if (typeof a.error === 'string') errorMessage = a.error;
              else if (Array.isArray(a.errors) && a.errors.length > 0) {
                const first = a.errors[0];
                if (typeof first === 'string') errorMessage = first;
                else if (first?.message) errorMessage = first.message;
              }
            }
          }
        }
      } catch {
        // fall back to default message
      }
      const shortMessage =
        errorMessage.length > 300 ? `${errorMessage.slice(0, 300)}…` : errorMessage;
      setError(shortMessage);
      toast.error(shortMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <VideoBackdrop
        src="/video/hero.mp4"
        poster="/images/hero-poster.webp"
        label="Tofaş Fen Lisesi kampüsü"
      />

      <div className="relative z-10 h-1.5 bg-[var(--accent)]" aria-hidden="true" />

      <main className="relative z-10 flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md bg-[var(--paper)] border border-[var(--rule)] rounded-[var(--radius)] shadow-[var(--shadow)] p-8 lg:p-10">
          {/* The crest carries a lot of fine detail -- a text band and a thin
              atom outline -- that turns to mush below ~80px. It gets room here
              rather than being shrunk into an icon beside the wordmark. */}
          <div className="flex flex-col items-center gap-4 pb-6 border-b border-[var(--rule)]">
            <img
              src="/tofaslogo.png"
              alt="Tofaş Fen Lisesi logosu"
              width={250}
              height={298}
              className="h-24 w-auto"
            />
            <div className="text-center">
              <span className="block font-serif text-lg text-[var(--ink)] leading-tight">
                Tofaş Fen Lisesi
              </span>
              <span className="block text-xs text-[var(--ink-dim)]">Bilgi Sistemi</span>
            </div>
          </div>

          <div className="w-full">
            <header className="mt-6 mb-8">
              <h2 className="font-serif text-2xl text-[var(--ink)]">
                {requires2FA ? 'İki Adımlı Doğrulama' : 'Sisteme Giriş'}
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">
                {requires2FA
                  ? 'E-postanıza gönderilen 6 haneli kodu girin.'
                  : 'Kullanıcı ID ve şifrenizle giriş yapın.'}
              </p>
            </header>

            {!requires2FA ? (
              <form onSubmit={handleSubmit} className="space-y-5" aria-label="Giriş formu">
                <Field label="Kullanıcı ID" htmlFor="login-id">
                  <Input
                    id="login-id"
                    name="id"
                    type="text"
                    value={id}
                    onChange={(e) => {
                      setId(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Okul No'nuzu girin"
                    required
                    disabled={isSubmitting}
                    autoComplete="username"
                    maxLength={50}
                  />
                </Field>

                <Field label="Şifre" htmlFor="login-sifre">
                  <div className="relative">
                    <Input
                      id="login-sifre"
                      name="sifre"
                      type={showPassword ? 'text' : 'password'}
                      value={sifre}
                      onChange={(e) => {
                        setSifre(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="Şifrenizi girin"
                      required
                      disabled={isSubmitting}
                      autoComplete="current-password"
                      maxLength={100}
                      className="pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--ink-dim)] hover:text-[var(--ink)] p-1"
                      disabled={isSubmitting}
                      aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                      title={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Field>

                {error && (
                  <div
                    id="login-error"
                    role="alert"
                    aria-live="polite"
                    className="border-l-4 border-[var(--accent)] bg-[var(--accent-tint)] rounded-[var(--radius-sm)] px-3 py-2 flex items-start gap-2"
                  >
                    <Chip tone="state">Hata</Chip>
                    <span className="font-serif text-sm text-[var(--ink)] flex-1">{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={isSubmitting}
                  aria-describedby={error ? 'login-error' : undefined}
                >
                  Giriş Yap
                </Button>

                <div className="pt-3 border-t border-[var(--rule)] text-center">
                  <Link
                    to="/kayit-basvurusu"
                    className="text-sm text-[var(--ink-dim)] hover:text-[var(--accent)]"
                  >
                    Yeni kayıt başvurusu
                  </Link>
                </div>
              </form>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (twoFactorCode.length !== 6) {
                    setError('Lütfen 6 haneli doğrulama kodunu girin');
                    return;
                  }
                  setIsSubmitting(true);
                  setError('');
                  try {
                    await verify2FA(twoFactorCode, rememberDevice);
                    toast.success('Giriş başarılı!');
                  } catch (err: unknown) {
                    const e2 = err as {
                      response?: { data?: { error?: { message?: string }; message?: string } };
                    };
                    const msg =
                      e2?.response?.data?.error?.message ||
                      e2?.response?.data?.message ||
                      (err instanceof Error ? err.message : 'Doğrulama başarısız');
                    setError(msg);
                    toast.error(msg);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="space-y-5"
                aria-label="İki faktörlü doğrulama formu"
              >
                <div className="border-l-4 border-[var(--accent)] bg-[var(--accent-tint)] rounded-[var(--radius-sm)] px-4 py-3 flex items-start gap-3">
                  <ShieldCheck size={16} className="text-[var(--accent)] mt-1 shrink-0" />
                  <p className="font-serif text-sm text-[var(--ink)] leading-relaxed">
                    Merhaba <strong>{twoFactorUser?.adSoyad}</strong>. E-posta adresinize gönderilen
                    6 haneli doğrulama kodunu girin.
                  </p>
                </div>

                {countdown > 0 && (
                  <div className="text-sm text-[var(--ink-dim)]">
                    Kod geçerlilik süresi:{' '}
                    <strong className="text-[var(--ink)] font-mono">
                      {formatCountdown(countdown)}
                    </strong>
                  </div>
                )}
                {countdown === 0 && twoFactorExpiresAt && (
                  <div className="text-sm text-[var(--accent)]">
                    Kodun süresi doldu. Lütfen yeni kod isteyin.
                  </div>
                )}

                <Field label="Doğrulama Kodu" htmlFor="login-2fa-code">
                  <Input
                    id="login-2fa-code"
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setTwoFactorCode(val);
                      if (error) setError('');
                    }}
                    placeholder="000000"
                    required
                    disabled={isSubmitting}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    className={cn('font-mono text-center text-2xl tracking-[0.5em]', '!pl-1')}
                  />
                </Field>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    disabled={isSubmitting}
                    className="accent-[var(--accent)]"
                  />
                  <span className="font-serif text-sm text-[var(--ink-2)]">
                    Bu cihazı 30 gün hatırla
                  </span>
                </label>

                {error && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="border-l-4 border-[var(--accent)] bg-[var(--accent-tint)] rounded-[var(--radius-sm)] px-3 py-2 flex items-start gap-2"
                  >
                    <Chip tone="state">Hata</Chip>
                    <span className="font-serif text-sm text-[var(--ink)] flex-1">{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={isSubmitting}
                  disabled={isSubmitting || twoFactorCode.length !== 6}
                >
                  Doğrula
                </Button>

                <div className="flex flex-col items-stretch gap-2 pt-3 border-t border-[var(--rule)]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResend}
                    disabled={isSubmitting || isResending}
                    loading={isResending}
                  >
                    <RefreshCw size={14} />
                    Kodu Tekrar Gönder
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      cancel2FA();
                      setTwoFactorCode('');
                      setRememberDevice(false);
                      setError('');
                      setCountdown(0);
                    }}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft size={14} />
                    Girişi İptal Et
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 w-full bg-black/70 py-4">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 text-center">
          <p className="text-xs text-white/90">
            © {new Date().getFullYear()} Tofaş Fen Lisesi Bilgilendirme Sistemi. Tüm hakları
            saklıdır.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-white/70">
            <Link to="/gizlilik-politikasi" className="transition-colors hover:text-white/90">
              Gizlilik Politikası
            </Link>
            <span>•</span>
            <Link to="/kullanim-sartlari" className="transition-colors hover:text-white/90">
              Kullanım Şartları
            </Link>
            <span>•</span>
            <Link to="/kvkk-aydinlatma-metni" className="transition-colors hover:text-white/90">
              KVKK Aydınlatma Metni
            </Link>
            <span>•</span>
            <a
              href="https://stratosiha.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-white/90"
            >
              <span>Made by</span>
              <img src="/brand/stratos-iha-logo.png" alt="STRATOS İHA" className="h-3.5 w-3.5" />
              <span>STRATOS İHA</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
