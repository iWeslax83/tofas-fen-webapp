import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import './BackButton.css';

interface BackButtonProps {
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'minimal' | 'floating';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  customText?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ 
  className = '', 
  onClick,
  variant = 'default',
  size = 'md',
  showText = true,
  customText
}) => {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const getRoleRoute = (role?: string) => {
    switch (role) {
      case 'admin': return '/admin';
      case 'student': return '/student';
      case 'teacher': return '/teacher';
      case 'parent': return '/parent';
      case 'hizmetli': return '/hizmetli';
      default: return '/';
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Navigate to user's role-based main page
      const roleRoute = getRoleRoute(user?.rol);
      navigate(roleRoute);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'back-button--sm';
      case 'lg': return 'back-button--lg';
      default: return 'back-button--md';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'minimal': return 'back-button--minimal';
      case 'floating': return 'back-button--floating';
      default: return 'back-button--default';
    }
  };

  const buttonText = customText || 'Ana Sayfaya Dön';

  return (
    <button 
      onClick={handleClick}
      className={`back-button ${getVariantClasses()} ${getSizeClasses()} ${className}`}
      title={buttonText}
      aria-label={buttonText}
    >
      <div className="back-button__icon">
        <ArrowLeft size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
        <div className="back-button__icon-glow"></div>
      </div>
      {showText && (
        <div className="back-button__content">
          <span className="back-button__text">{buttonText}</span>
          <span className="back-button__subtitle">Ana Paneline Dön</span>
        </div>
      )}
      <div className="back-button__ripple"></div>
    </button>
  );
};

export default BackButton;
