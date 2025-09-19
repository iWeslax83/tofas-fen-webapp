import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, 
  VolumeX, 
  Contrast, 
  Type, 
  Move, 
  Palette,
  Keyboard,
  X,
  RotateCcw,
  Accessibility,
  Target
} from 'lucide-react';
import { 
  useAccessibility, 
  useFocusTrap, 
  useAnnouncement,
  generateAriaId,
  AccessibilityConfig
} from '../utils/accessibility';
import { defaultAccessibilityConfig } from '../utils/accessibility';
import './AccessibilityComponents.css';

// Types and Interfaces
export interface AccessibilityProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<AccessibilityConfig>;
}

export interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export interface AccessibleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'full';
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export interface AccessibleDropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export interface AccessibleTooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

// Accessibility Provider Component
export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
  initialConfig = {}
}) => {
  const { updateConfig } = useAccessibility();

  useEffect(() => {
    if (Object.keys(initialConfig).length > 0) {
      updateConfig(initialConfig);
    }
  }, [initialConfig, updateConfig]);

  return (
    <div className="accessibility-provider">
      {children}
    </div>
  );
};

// Skip Link Component
export const SkipLink: React.FC<SkipLinkProps> = ({ href, children, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const announce = useAnnouncement();

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setIsVisible(true);
      }
    };

    const handleKeyup = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setTimeout(() => setIsVisible(false), 1000);
      }
    };

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('keyup', handleKeyup);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('keyup', handleKeyup);
    };
  }, []);

  const handleFocus = () => {
    announce('Skip link activated', 'assertive');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.a
          href={href}
          className={`skip-link ${className}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          onFocus={handleFocus}
          aria-label={`Skip to ${children}`}
        >
          {children}
        </motion.a>
      )}
    </AnimatePresence>
  );
};

// Accessible Button Component
export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  ariaLabel,
  ariaDescribedBy,
  className = '',
  type = 'button'
}, ref) => {
  const [isPressed, setIsPressed] = useState(false);
  const announce = useAnnouncement();

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      setIsPressed(true);
      announce(`Button activated: ${ariaLabel || children}`, 'polite');
      onClick();
      setTimeout(() => setIsPressed(false), 150);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  const buttonClasses = [
    'accessible-button',
    `accessible-button--${variant}`,
    `accessible-button--${size}`,
    loading ? 'accessible-button--loading' : '',
    disabled ? 'accessible-button--disabled' : '',
    isPressed ? 'accessible-button--pressed' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type={type}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || loading}
      className={buttonClasses}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-pressed={isPressed}
      aria-busy={loading}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      {loading && (
        <div className="accessible-button__loader" aria-hidden="true">
          <div className="accessible-button__spinner"></div>
        </div>
      )}
      
      {icon && iconPosition === 'left' && (
        <span className="accessible-button__icon accessible-button__icon--left" aria-hidden="true">
          {icon}
        </span>
      )}
      
      <span className="accessible-button__content">
        {children}
      </span>
      
      {icon && iconPosition === 'right' && (
        <span className="accessible-button__icon accessible-button__icon--right" aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
});

AccessibleButton.displayName = 'AccessibleButton';

// Accessible Modal Component
export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  closeOnEscape = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const focusTrapRef = useFocusTrap({ 
    active: isOpen, 
    onEscape: closeOnEscape ? onClose : undefined 
  });
  const announce = useAnnouncement();

  useEffect(() => {
    if (isOpen) {
      announce(`Modal opened: ${title}`, 'assertive');
      document.body.style.overflow = 'hidden';
    } else {
      announce('Modal closed', 'polite');
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, title, announce]);

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  const modalClasses = [
    'accessible-modal',
    `accessible-modal--${size}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="accessible-modal__overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-content"
        >
          <motion.div
            ref={(el) => {
              modalRef.current = el;
              focusTrapRef.current = el;
            }}
            className={modalClasses}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            role="document"
          >
            <header className="accessible-modal__header">
              <h2 id="modal-title" className="accessible-modal__title">
                {title}
              </h2>
              {showCloseButton && (
                <AccessibleButton
                  onClick={onClose}
                  variant="secondary"
                  size="small"
                  ariaLabel="Close modal"
                  className="accessible-modal__close"
                >
                  <X size={20} />
                </AccessibleButton>
              )}
            </header>
            
            <div id="modal-content" className="accessible-modal__content">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Accessible Dropdown Component
export const AccessibleDropdown: React.FC<AccessibleDropdownProps> = ({
  trigger,
  children,
  isOpen,
  onToggle,
  placement = 'bottom',
  className = ''
}) => {
  const dropdownId = useRef(generateAriaId('dropdown'));
  const triggerId = useRef(generateAriaId('trigger'));
  const announce = useAnnouncement();

  useEffect(() => {
    if (isOpen) {
      announce('Dropdown opened', 'polite');
    } else {
      announce('Dropdown closed', 'polite');
    }
  }, [isOpen, announce]);

  const dropdownClasses = [
    'accessible-dropdown',
    `accessible-dropdown--${placement}`,
    isOpen ? 'accessible-dropdown--open' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={dropdownClasses}>
      <div
        id={triggerId.current}
        className="accessible-dropdown__trigger"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        role="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={dropdownId.current}
        tabIndex={0}
      >
        {trigger}
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={dropdownId.current}
            className="accessible-dropdown__content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            role="menu"
            aria-labelledby={triggerId.current}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Accessible Tooltip Component
export const AccessibleTooltip: React.FC<AccessibleTooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 500,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const tooltipId = useRef(generateAriaId('tooltip'));

  const showTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsVisible(false);
  };

  const tooltipClasses = [
    'accessible-tooltip',
    `accessible-tooltip--${position}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className="accessible-tooltip__container"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      aria-describedby={tooltipId.current}
    >
      {children}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            id={tooltipId.current}
            className={tooltipClasses}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            role="tooltip"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Accessibility Panel Component
export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const { config, updateConfig } = useAccessibility();
  const announce = useAnnouncement();
  const panelRef = useFocusTrap({ active: isOpen, onEscape: onClose });

  const handleToggle = (key: keyof AccessibilityConfig) => {
    const newValue = !config[key];
    updateConfig({ [key]: newValue });
    announce(`${key} ${newValue ? 'enabled' : 'disabled'}`, 'polite');
  };

  const panelClasses = [
    'accessibility-panel',
    isOpen ? 'accessibility-panel--open' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="accessibility-panel__overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef as unknown as React.Ref<HTMLDivElement>}
            className={panelClasses}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="accessibility-panel-title"
          >
            <header className="accessibility-panel__header">
              <h2 id="accessibility-panel-title" className="accessibility-panel__title">
                <Accessibility size={24} />
                Erişilebilirlik Ayarları
              </h2>
              <AccessibleButton
                onClick={onClose}
                variant="secondary"
                size="small"
                ariaLabel="Close accessibility panel"
              >
                <X size={20} />
              </AccessibleButton>
            </header>

            <div className="accessibility-panel__content">
              <section className="accessibility-panel__section">
                <h3>Görsel Ayarlar</h3>
                
                <div className="accessibility-panel__option">
                  <AccessibleButton
                    onClick={() => handleToggle('enableHighContrast')}
                    variant={config.enableHighContrast ? 'primary' : 'secondary'}
                    size="medium"
                    icon={<Contrast size={20} />}
                    ariaLabel="Toggle high contrast mode"
                  >
                    Yüksek Kontrast
                  </AccessibleButton>
                </div>

                <div className="accessibility-panel__option">
                  <AccessibleButton
                    onClick={() => handleToggle('enableLargeText')}
                    variant={config.enableLargeText ? 'primary' : 'secondary'}
                    size="medium"
                    icon={<Type size={20} />}
                    ariaLabel="Toggle large text mode"
                  >
                    Büyük Yazı
                  </AccessibleButton>
                </div>

                <div className="accessibility-panel__option">
                  <AccessibleButton
                    onClick={() => handleToggle('enableColorBlindSupport')}
                    variant={config.enableColorBlindSupport ? 'primary' : 'secondary'}
                    size="medium"
                    icon={<Palette size={20} />}
                    ariaLabel="Toggle color blind support"
                  >
                    Renk Körlüğü Desteği
                  </AccessibleButton>
                </div>
              </section>

              <section className="accessibility-panel__section">
                <h3>Hareket Ayarları</h3>
                
                <div className="accessibility-panel__option">
                  <AccessibleButton
                    onClick={() => handleToggle('enableReducedMotion')}
                    variant={config.enableReducedMotion ? 'primary' : 'secondary'}
                    size="medium"
                    icon={<Move size={20} />}
                    ariaLabel="Toggle reduced motion"
                  >
                    Azaltılmış Hareket
                  </AccessibleButton>
                </div>
              </section>

              <section className="accessibility-panel__section">
                <h3>Navigasyon Ayarları</h3>
                
                <div className="accessibility-panel__option">
                  <AccessibleButton
                    onClick={() => handleToggle('enableKeyboardNavigation')}
                    variant={config.enableKeyboardNavigation ? 'primary' : 'secondary'}
                    size="medium"
                    icon={<Keyboard size={20} />}
                    ariaLabel="Toggle keyboard navigation"
                  >
                    Klavye Navigasyonu
                  </AccessibleButton>
                </div>

                <div className="accessibility-panel__option">
                  <AccessibleButton
                    onClick={() => handleToggle('enableFocusIndicators')}
                    variant={config.enableFocusIndicators ? 'primary' : 'secondary'}
                    size="medium"
                    icon={<Target size={20} />}
                    ariaLabel="Toggle focus indicators"
                  >
                    Odak Göstergeleri
                  </AccessibleButton>
                </div>
              </section>

              <section className="accessibility-panel__section">
                <h3>Ekran Okuyucu</h3>
                
                <div className="accessibility-panel__option">
                  <AccessibleButton
                    onClick={() => handleToggle('enableScreenReader')}
                    variant={config.enableScreenReader ? 'primary' : 'secondary'}
                    size="medium"
                    icon={config.enableScreenReader ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    ariaLabel="Toggle screen reader support"
                  >
                    Ekran Okuyucu Desteği
                  </AccessibleButton>
                </div>
              </section>

              <section className="accessibility-panel__section">
                <h3>Dyslexia Desteği</h3>
                
                <div className="accessibility-panel__option">
                  <AccessibleButton
                    onClick={() => handleToggle('enableDyslexiaSupport')}
                    variant={config.enableDyslexiaSupport ? 'primary' : 'secondary'}
                    size="medium"
                    icon={<Type size={20} />}
                    ariaLabel="Toggle dyslexia support"
                  >
                    Dyslexia Desteği
                  </AccessibleButton>
                </div>
              </section>
            </div>

            <footer className="accessibility-panel__footer">
              <AccessibleButton
                onClick={() => updateConfig(defaultAccessibilityConfig)}
                variant="secondary"
                size="medium"
                icon={<RotateCcw size={20} />}
                ariaLabel="Reset accessibility settings"
              >
                Ayarları Sıfırla
              </AccessibleButton>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Accessibility Toggle Component
export const AccessibilityToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const announce = useAnnouncement();

  const handleToggle = () => {
    setIsPanelOpen(!isPanelOpen);
    announce(isPanelOpen ? 'Accessibility panel closed' : 'Accessibility panel opened', 'polite');
  };

  return (
    <>
      <AccessibleButton
        onClick={handleToggle}
        variant="primary"
        size="medium"
        icon={<Accessibility size={20} />}
        ariaLabel="Open accessibility settings"
        className={`accessibility-toggle ${className}`}
      >
        Erişilebilirlik
      </AccessibleButton>

      <AccessibilityPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </>
  );
};

// Accessibility Status Component
export const AccessibilityStatus: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { config } = useAccessibility();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasActiveFeatures = Object.values(config).some(value => value === true);
    setIsVisible(hasActiveFeatures);
  }, [config]);

  if (!isVisible) return null;

  const activeFeatures = Object.entries(config)
    .filter(([, value]) => value === true)
    .map(([key]) => key.replace('enable', '').toLowerCase())
    .join(', ');

  return (
    <motion.div
      className={`accessibility-status ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      role="status"
      aria-live="polite"
    >
      <Accessibility size={16} />
      <span>Aktif: {activeFeatures}</span>
    </motion.div>
  );
};

export default AccessibilityProvider;
