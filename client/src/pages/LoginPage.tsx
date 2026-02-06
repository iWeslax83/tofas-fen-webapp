// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthActions, useUser } from '../stores/authStore';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './LoginPage.css';

export default function LoginPage() {
  const [id, setId] = useState('');
  const [sifre, setSifre] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuthActions();
  const user = useUser();

  // Handle redirect when user logs in successfully
  useEffect(() => {
    if (user?.rol) {
      // User is logged in, redirect to their dashboard
      navigate(`/${user.rol}`, { replace: true });
    }
  }, [user, navigate]);

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
      toast.success('Giriş başarılı!');

      // The redirect will be handled by useEffect when user state updates
    } catch (error: unknown) {
      // Prefer structured API message when available, otherwise fallback to error.message
      // Prefer structured API message when available
      const apiError = (error as any)?.response?.data;
      // Server sends { success: false, error: { message: "..." } }
      // So/ we should check apiError.error.message first
      let apiMessage = apiError?.error?.message || apiError?.message || apiError?.error;

      // If the message is an object (e.g. validation errors), stringify it or extract the first error
      if (typeof apiMessage === 'object' && apiMessage !== null) {
        try {
          // If it has a 'message' property or similar, try to use valid string
          // Otherwise json stringify
          apiMessage = JSON.stringify(apiMessage);
        } catch (e) {
          apiMessage = 'Beklenmeyen hata formatı';
        }
      }

      const errorMessage = (typeof apiMessage === 'string' ? apiMessage : undefined) || (error as any)?.message || 'Giriş başarısız';
      const shortMessage = typeof errorMessage === 'string' && errorMessage.length > 300 ? `${errorMessage.slice(0, 300)}...` : String(errorMessage);

      setError(shortMessage);
      toast.error(shortMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-bg" role="main">
      {/* Background Blobs */}
      <div className="login-blob login-blob-1" aria-hidden="true"></div>
      <div className="login-blob login-blob-2" aria-hidden="true"></div>
      <div className="login-blob login-blob-3" aria-hidden="true"></div>

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

          {/* Login Form */}
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
                  if (error) setError(''); // Clear error when user starts typing
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
                    if (error) setError(''); // Clear error when user starts typing
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