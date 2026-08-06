import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../stores/authStore';
import './PasswordChangeBanner.css';

const DISMISS_KEY = 'tofas_pw_banner_dismissed_at';

const PasswordChangeBanner: React.FC = () => {
  const user = useUser();
  const navigate = useNavigate();
  const [kapatildi, setKapatildi] = useState(() => {
    const kapatmaZamani = localStorage.getItem(DISMISS_KEY);
    if (!kapatmaZamani) return false;
    // Yönetim araya yeni bir şifre yazdıysa bandı tekrar göster.
    const sonAdminYazimi = user?.passwordLastSetAt ? new Date(user.passwordLastSetAt) : null;
    if (sonAdminYazimi && sonAdminYazimi > new Date(kapatmaZamani)) return false;
    return true;
  });

  if (!user || user.usingDistributedPassword !== true || kapatildi) {
    return null;
  }

  const kapat = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setKapatildi(true);
  };

  return (
    <div className="password-change-banner">
      <div className="banner-content">
        <KeyRound className="banner-icon" />
        <span className="banner-text">
          Hesabına verilen otomatik şifreyi kullanıyorsun. Ayarlardan kendi şifreni
          belirleyebilirsin.
        </span>
      </div>
      <div className="banner-actions">
        <button
          className="btn-go-settings"
          onClick={() => navigate(`/${user.rol || 'student'}/ayarlar`)}
        >
          Ayarlara Git
        </button>
        <button className="btn-dismiss" onClick={kapat} aria-label="Bildirimi kapat">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default PasswordChangeBanner;
