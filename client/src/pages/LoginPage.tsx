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
  <label htmlFor={htmlFor} className="flex flex-col gap-1">
    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
      {label}
    </span>
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
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yönlendiriliyor…
        </div>
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
    <div className="min-h-screen bg-[var(--paper)] flex flex-col">
      <div className="h-1.5 bg-[var(--state)]" aria-hidden="true" />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[5fr_7fr]">
        <aside className="bg-[var(--ink)] text-[var(--paper)] p-8 lg:p-12 flex flex-col justify-between min-h-[40vh] lg:min-h-screen">
          <div className="space-y-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
              Türkiye Cumhuriyeti · Resmî Belge
            </div>
            <div className="flex items-center gap-4">
              <img
                src="/tofaslogo.png"
                alt="Tofaş Fen Lisesi logosu"
                className="w-16 h-16 bg-white p-2 border border-white/20"
              />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/60">
                  Bilgi Sistemi
                </div>
                <h1 className="font-serif text-3xl text-white leading-tight">Tofaş Fen Lisesi</h1>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-white/15 pt-6">
            <p className="font-serif text-sm text-white/85 leading-relaxed">
              Bu sistem yalnızca yetkili kullanıcılarca erişilebilir. Tüm oturumlar kaydedilir ve
              denetlenir.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">
              © {new Date().getFullYear()} Tofaş Fen Lisesi. Tüm hakları saklıdır.
            </p>
          </div>
        </aside>

        <main className="p-8 lg:p-12 flex flex-col justify-center min-h-[60vh] lg:min-h-screen">
          <div className="w-full max-w-md mx-auto">
            <header className="mb-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
                {requires2FA ? 'Form 02 · Doğrulama' : 'Form 01 · Giriş'}
              </div>
              <h2 className="font-serif text-2xl text-[var(--ink)] mt-1">
                {requires2FA ? 'İki Adımlı Doğrulama' : 'Sisteme Giriş'}
              </h2>
            </header>

            {!requires2FA ? (
              <form onSubmit={handleSubmit} className="space-y-5" aria-label="Giriş formu">
                <Field label="Kullanıcı ID" htmlFor="login-id">
                  <Input
                    id="login-id"
                    type="text"
                    value={id}
                    onChange={(e) => {
                      setId(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Kullanıcı ID'nizi girin"
                    required
                    disabled={isSubmitting}
                    autoComplete="username"
                    maxLength={50}
                  />
                </Field>

                <Field label="Şifre (TCKN)" htmlFor="login-sifre">
                  <div className="relative">
                    <Input
                      id="login-sifre"
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
                    className="border-l-4 border-[var(--state)] bg-[var(--surface)] px-3 py-2 flex items-start gap-2"
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
                    className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)] hover:text-[var(--state)]"
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
                <div className="border-l-4 border-[var(--state)] bg-[var(--surface)] px-4 py-3 flex items-start gap-3">
                  <ShieldCheck size={16} className="text-[var(--state)] mt-1 shrink-0" />
                  <p className="font-serif text-sm text-[var(--ink)] leading-relaxed">
                    Merhaba <strong>{twoFactorUser?.adSoyad}</strong>. E-posta adresinize gönderilen
                    6 haneli doğrulama kodunu girin.
                  </p>
                </div>

                {countdown > 0 && (
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
                    Kod geçerlilik süresi:{' '}
                    <strong className="text-[var(--ink)]">{formatCountdown(countdown)}</strong>
                  </div>
                )}
                {countdown === 0 && twoFactorExpiresAt && (
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--state)]">
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
                    className="accent-[var(--state)]"
                  />
                  <span className="font-serif text-sm text-[var(--ink-2)]">
                    Bu cihazı 30 gün hatırla
                  </span>
                </label>

                {error && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="border-l-4 border-[var(--state)] bg-[var(--surface)] px-3 py-2 flex items-start gap-2"
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
        </main>
      </div>
    </div>
  );
}
