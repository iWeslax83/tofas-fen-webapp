import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../stores/authStore';
import './EmailVerificationBanner.css';

const EmailVerificationBanner: React.FC = () => {
  const user = useUser();
  const navigate = useNavigate();

  // Don't show if no user, no email, or already verified
  if (!user || !user.email || user.emailVerified !== false) {
    return null;
  }

  const handleGoToSettings = () => {
    navigate(`/${user.rol || 'student'}/ayarlar`);
  };

  return (
    <div className="email-verification-banner">
      <div className="banner-content">
        <AlertTriangle className="banner-icon" />
        <span className="banner-text">
          E-posta adresiniz henüz doğrulanmadı. Lütfen ayarlar sayfasından doğrulama işlemini tamamlayın.
        </span>
      </div>
      <div className="banner-actions">
        <button
          className="btn-send-code"
          onClick={handleGoToSettings}
        >
          Ayarlara Git
        </button>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;
