// src/pages/LoginPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useAuthActions, useUser, useRequires2FA, useTwoFactorUser, useTwoFactorExpiresAt } from '../stores/authStore';
import { Eye, EyeOff, Lock, User, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AppError } from '../utils/AppError';
import './LoginPage.css';

export default function LoginPage() {
  const [id, setId] = useState('');
  const [sifre, setSifre] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0); // #14: seconds remaining
  const navigate = useNavigate();
  const { login, verify2FA, resend2FA, cancel2FA } = useAuthActions();
  const user = useUser();
  const requires2FA = useRequires2FA();
  const twoFactorUser = useTwoFactorUser();
  const twoFactorExpiresAt = useTwoFactorExpiresAt();

  // Handle redirect when user logs in successfully
  useEffect(() => {
    if (user?.rol) {
      navigate(`/${user.rol}`, { replace: true });
    }
  }, [user, navigate]);

  // #14: Countdown timer for 2FA code expiry
  useEffect(() => {
    if (!twoFactorExpiresAt) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((twoFactorExpiresAt - Date.now()) / 1000));
      setCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [twoFactorExpiresAt]);

  // #13: Handle resend 2FA code
  const handleResend = useCallback(async () => {
    setIsResending(true);
    setError('');
    try {
      await resend2FA();
      toast.success('Yeni doğrulama kodu gönderildi');
      setTwoFactorCode('');
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error?.message
        || (err as any)?.response?.data?.message
        || (err instanceof Error ? err.message : 'Kod gönderilemedi');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  }, [resend2FA]);

  // If user is already logged in, redirect them
  if (user?.rol) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Yönlendiriliyor...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
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
      // If 2FA is required, the store will update requires2FA
      if (!useAuthStore.getState().requires2FA) {
        toast.success('Giriş başarılı!');
      }
    } catch (error: unknown) {
      let errorMessage = 'Giriş başarısız. Lütfen kullanıcı ID ve şifrenizi kontrol edin.';

      try {
        if (error instanceof AppError) {
          errorMessage = error.getUserMessage() || error.message || errorMessage;
        } else if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        } else {
          const apiError = (error as any)?.response?.data;

          if (apiError) {
            if (typeof apiError === 'string') {
              errorMessage = apiError;
            } else if (apiError?.error?.message && typeof apiError.error.message === 'string') {
              errorMessage = apiError.error.message;
            } else if (apiError?.message && typeof apiError.message === 'string') {
              errorMessage = apiError.message;
            } else if (apiError?.error && typeof apiError.error === 'string') {
              errorMessage = apiError.error;
            } else if (Array.isArray(apiError?.errors) && apiError.errors.length > 0) {
              const firstError = apiError.errors[0];
              if (typeof firstError === 'string') {
                errorMessage = firstError;
              } else if (firstError?.message && typeof firstError.message === 'string') {
                errorMessage = firstError.message;
              }
            }
          } else if ((error as any)?.message && typeof (error as any).message === 'string') {
            errorMessage = (error as any).message;
          }
        }
      } catch (e) {
        errorMessage = 'Giriş başarısız. Lütfen kullanıcı ID ve şifrenizi kontrol edin.';
      }

      if (typeof errorMessage !== 'string' || errorMessage.trim() === '') {
        errorMessage = 'Giriş başarısız. Lütfen kullanıcı ID ve şifrenizi kontrol edin.';
      }

      const shortMessage = errorMessage.length > 300 ? `${errorMessage.slice(0, 300)}...` : errorMessage;

      setError(shortMessage);
      toast.error(shortMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format countdown as mm:ss
  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="login-bg" role="main">
      {/* Gradient Border */}
      <div className="login-gradient-border">
        <div className="login-container">
          {/* Header */}
          <header className="login-header">
            <div className="login-logo">
              <img src="/tofaslogo.png" alt="Tofaş Fen Lisesi logosu" className="login-logo-img" />
            </div>
            <h1 className="login-title">Tofaş Fen Lisesi</h1>
            <p className="login-subtitle">Bilgi Sistemi</p>
          </header>

          {/* Conditional: Login Form or 2FA Form */}
          {!requires2FA ? (
            <>
              <form onSubmit={handleSubmit} className="login-form" role="form" aria-label="Giriş formu">
                <div className="login-form-group">
                  <label htmlFor="id" className="login-label">
                    <User className="login-icon" />
                    Kullanıcı ID
                  </label>
                  <input
                    type="text"
                    id="id"
                    value={id}
                    onChange={(e) => {
                      setId(e.target.value);
                      if (error) setError('');
                    }}
                    className="login-input"
                    placeholder="Kullanıcı ID'nizi girin"
                    required
                    disabled={isSubmitting}
                    autoComplete="username"
                    maxLength={50}
                  />
                </div>

                <div className="login-form-group">
                  <label htmlFor="sifre" className="login-label">
                    <Lock className="login-icon" />
                    Şifre(TCKN)
                  </label>
                  <div className="login-password-container">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="sifre"
                      value={sifre}
                      onChange={(e) => {
                        setSifre(e.target.value);
                        if (error) setError('');
                      }}
                      className="login-input"
                      placeholder="Şifrenizi girin"
                      required
                      disabled={isSubmitting}
                      autoComplete="current-password"
                      maxLength={100}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="login-password-toggle"
                      disabled={isSubmitting}
                      aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                      title={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div id="error-message" className="login-error" role="alert" aria-live="polite">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="login-button"
                  disabled={isSubmitting}
                  aria-describedby={error ? 'error-message' : undefined}
                >
                  {isSubmitting ? (
                    <>
                      <div className="loading-spinner" style={{ marginRight: '8px' }}></div>
                      Giriş yapılıyor...
                    </>
                  ) : (
                    'Giriş Yap'
                  )}
                </button>
              </form>
            </>
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
                  const msg = (err as any)?.response?.data?.error?.message
                    || (err as any)?.response?.data?.message
                    || (err instanceof Error ? err.message : 'Doğrulama başarısız');
                  setError(msg);
                  toast.error(msg);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="login-form"
              role="form"
              aria-label="İki faktörlü doğrulama formu"
            >
              <div className="login-2fa-info">
                <ShieldCheck size={24} />
                <p>Merhaba <strong>{twoFactorUser?.adSoyad}</strong>,<br />
                E-posta adresinize gönderilen 6 haneli doğrulama kodunu girin.</p>
              </div>

              {/* #14: Countdown timer */}
              {countdown > 0 && (
                <div className="login-2fa-countdown">
                  Kod geçerlilik süresi: <strong>{formatCountdown(countdown)}</strong>
                </div>
              )}
              {countdown === 0 && twoFactorExpiresAt && (
                <div className="login-2fa-countdown login-2fa-expired">
                  Kodun süresi doldu. Lütfen yeni kod isteyin.
                </div>
              )}

              <div className="login-form-group">
                <label htmlFor="twoFactorCode" className="login-label">
                  <Lock className="login-icon" />
                  Doğrulama Kodu
                </label>
                <input
                  type="text"
                  id="twoFactorCode"
                  value={twoFactorCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setTwoFactorCode(val);
                    if (error) setError('');
                  }}
                  className="login-input login-2fa-code-input"
                  placeholder="000000"
                  required
                  disabled={isSubmitting}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <label className="login-remember-device">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span className="login-checkbox-label">Bu cihazı 30 gün hatırla</span>
              </label>

              {error && (
                <div id="error-message" className="login-error" role="alert" aria-live="polite">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={isSubmitting || twoFactorCode.length !== 6}
              >
                {isSubmitting ? (
                  <>
                    <div className="loading-spinner" style={{ marginRight: '8px' }}></div>
                    Doğrulanıyor...
                  </>
                ) : (
                  'Doğrula'
                )}
              </button>

              {/* #13: Resend code button */}
              <button
                type="button"
                className="login-resend-button"
                onClick={handleResend}
                disabled={isSubmitting || isResending}
              >
                {isResending ? (
                  <>
                    <div className="loading-spinner" style={{ marginRight: '6px', width: '14px', height: '14px' }}></div>
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    Kodu Tekrar Gönder
                  </>
                )}
              </button>

              <button
                type="button"
                className="login-back-button"
                onClick={() => {
                  cancel2FA();
                  setTwoFactorCode('');
                  setRememberDevice(false);
                  setError('');
                  setCountdown(0);
                }}
                disabled={isSubmitting}
              >
                Girişi İptal Et
              </button>
            </form>
          )}

          {/* Footer */}
          <footer className="login-footer">
            <p className="login-footer-text">
              © 2024 Tofaş Fen Lisesi. Tüm hakları saklıdır.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
