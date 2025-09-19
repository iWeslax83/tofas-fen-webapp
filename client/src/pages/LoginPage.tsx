// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getUserRolePath } from '../utils/navigation';
import './LoginPage.css';

export function LoginPage() {
  const [id, setId] = useState('');
  const [sifre, setSifre] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, user, isLoading } = useAuthContext();

  // Kullanıcı zaten giriş yapmışsa yönlendir
  useEffect(() => {
    if (user && user.rol) {
      const redirectPath = getUserRolePath(user.rol);
      console.log('[LoginPage] User already authenticated, redirecting to:', redirectPath);
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate]);

  // Kullanıcı giriş yaptıktan sonra yönlendirme
  useEffect(() => {
    if (user && user.rol && !isLoading) {
      const redirectPath = getUserRolePath(user.rol);
      console.log('[LoginPage] User logged in, redirecting to:', redirectPath);
      navigate(redirectPath, { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await login(id, sifre);
      toast.success('Giriş başarılı!');
      
      // Giriş başarılı olduktan sonra kısa bir gecikme
      console.log('[LoginPage] Login successful, waiting for user state update...');
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Giriş başarısız';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="login-bg">
      {/* Background Blobs */}
      <div className="login-blob login-blob-1"></div>
      <div className="login-blob login-blob-2"></div>
      <div className="login-blob login-blob-3"></div>
      
      {/* Gradient Border */}
      <div className="login-gradient-border"></div>
      
      {/* Login Card */}
      <div className="login-card">
        {/* Card Highlight */}
        
        {/* Logo */}
        <div className="login-logo-container">
          <div className="login-logo">
            <img src="/tofaslogo.png" alt="Tofaş Fen Lisesi" className="login-logo-image" />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="login-title">Tofaş Fen Lisesi</h1>
        <p className="login-subtitle">Öğrenci Bilgi Sistemi</p>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* ID Input */}
          <div className="input-group">
            <input
              type="text"
              id="id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="login-input"
              placeholder=" "
              required
            />
            <label htmlFor="id" className="login-label">
              Kullanıcı ID
            </label>
            <User className="input-icon" />
          </div>
          
          {/* Password Input */}
          <div className="input-group">
            <input
              type={showPassword ? 'text' : 'password'}
              id="sifre"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              className="login-input"
              placeholder=" "
              required
            />
            <label htmlFor="sifre" className="login-label">
              Şifre
            </label>
            <Lock className="input-icon" />
            
            {/* Password Toggle */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle"
            >
              {showPassword ? (
                <EyeOff className="toggle-icon" />
              ) : (
                <Eye className="toggle-icon" />
              )}
            </button>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          {/* Divider */}
          <div className="login-divider">
            <div className="divider-line"></div>
            <span className="divider-text"></span>
            <div className="divider-line"></div>
          </div>
          

          
          {/* Login Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="login-submit-button"
          >
            {isSubmitting ? (
              <div className="loading-spinner"></div>
            ) : (
              'Giriş Yap'
            )}
          </button>
        </form>
        
        {/* Card Glow */}
        <div className="login-card-glow"></div>
      </div>
    </div>
  );
}
