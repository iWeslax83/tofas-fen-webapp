import React, { useState } from 'react';
import { Accessibility, Settings, Target, HelpCircle, Info, Check, X } from 'lucide-react';
import {
  AccessibilityProvider,
  SkipLink,
  AccessibleButton,
  AccessibleModal,
  AccessibilityToggle,
  AccessibilityStatus,
} from '../../components/AccessibilityComponents';
import {
  useAccessibility,
  useAnnouncement,
  useKeyboardShortcut,
  defaultAccessibilityConfig,
} from '../../utils/accessibility';
import {
  DemoStatsPanel,
  ComponentShowcase,
  TestingToolsPanel,
  SettingsPanel,
} from './accessibility-demo';
import type { FormData } from './accessibility-demo';
import './AccessibilityDemoPage.css';

const AccessibilityDemoPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    message: '',
    category: '',
    priority: 'medium',
  });
  const [demoStats] = useState({
    accessibilityScore: 98,
    wcagCompliance: 'AA',
    keyboardNavigation: true,
    screenReaderSupport: true,
    focusManagement: true,
    colorContrast: true,
    textScaling: true,
    motionReduction: true,
  });

  const { config, updateConfig } = useAccessibility();
  const announce = useAnnouncement();

  useKeyboardShortcut({
    key: '1',
    action: () => setActiveSection('overview'),
    description: 'Go to overview section',
  });

  useKeyboardShortcut({
    key: '2',
    action: () => setActiveSection('components'),
    description: 'Go to components section',
  });

  useKeyboardShortcut({
    key: '3',
    action: () => setActiveSection('testing'),
    description: 'Go to testing section',
  });

  useKeyboardShortcut({
    key: '4',
    action: () => setActiveSection('settings'),
    description: 'Go to settings section',
  });

  useKeyboardShortcut({
    key: 'm',
    action: () => setIsModalOpen(true),
    description: 'Open demo modal',
  });

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    announce(`Navigated to ${section} section`, 'polite');
  };

  const handleFormSubmit = async () => {
    announce('Form submitted successfully', 'polite');
  };

  const handleResetSettings = () => {
    updateConfig(defaultAccessibilityConfig);
    announce('Accessibility settings reset to default', 'polite');
  };

  const sections = [
    { id: 'overview', label: 'Genel Bakış', icon: <Accessibility size={20} /> },
    { id: 'components', label: 'Bileşenler', icon: <Settings size={20} /> },
    { id: 'testing', label: 'Test Araçları', icon: <Target size={20} /> },
    { id: 'settings', label: 'Ayarlar', icon: <Settings size={20} /> },
  ];

  return (
    <AccessibilityProvider>
      <div className="accessibility-demo-page">
        {/* Skip Links */}
        <SkipLink href="#main-content">Ana içeriğe geç</SkipLink>
        <SkipLink href="#navigation">Navigasyona geç</SkipLink>
        <SkipLink href="#footer">Alt bilgiye geç</SkipLink>

        {/* Header */}
        <header className="demo-header" role="banner">
          <div className="demo-header__content">
            <h1 className="demo-header__title">
              <Accessibility size={32} />
              Erişilebilirlik Demo Sayfası
            </h1>
            <p className="demo-header__subtitle">WCAG 2.1 AA Uyumlu Erişilebilirlik Özellikleri</p>
          </div>

          <div className="demo-header__actions">
            <AccessibilityToggle />
            <AccessibilityStatus />
          </div>
        </header>

        {/* Navigation */}
        <nav className="demo-navigation" role="navigation" aria-label="Demo navigation">
          <ul className="demo-navigation__list">
            {sections.map((section) => (
              <li key={section.id} className="demo-navigation__item">
                <AccessibleButton
                  onClick={() => handleSectionChange(section.id)}
                  variant={activeSection === section.id ? 'primary' : 'secondary'}
                  size="medium"
                  icon={section.icon}
                  ariaLabel={`Go to ${section.label} section`}
                  className="demo-navigation__button"
                >
                  {section.label}
                </AccessibleButton>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <main id="main-content" className="demo-main" role="main">
          <div className="demo-content">
            {activeSection === 'overview' && <DemoStatsPanel demoStats={demoStats} />}

            {activeSection === 'components' && (
              <ComponentShowcase
                isDropdownOpen={isDropdownOpen}
                onDropdownToggle={() => setIsDropdownOpen(!isDropdownOpen)}
                onOpenModal={() => setIsModalOpen(true)}
                formData={formData}
                onFormDataChange={setFormData}
                onFormSubmit={handleFormSubmit}
                onAnnounce={announce}
              />
            )}

            {activeSection === 'testing' && (
              <TestingToolsPanel onOpenModal={() => setIsModalOpen(true)} onAnnounce={announce} />
            )}

            {activeSection === 'settings' && (
              <SettingsPanel
                config={config}
                onUpdateConfig={updateConfig}
                onResetSettings={handleResetSettings}
              />
            )}
          </div>
        </main>

        {/* Footer */}
        <footer id="footer" className="demo-footer" role="contentinfo">
          <div className="demo-footer__content">
            <div className="demo-footer__info">
              <h3>TOFAS FEN WebApp</h3>
              <p>WCAG 2.1 AA Uyumlu Erişilebilirlik Demo</p>
            </div>

            <div className="demo-footer__links">
              <AccessibleButton
                variant="secondary"
                size="small"
                icon={<HelpCircle size={16} />}
                ariaLabel="Accessibility help"
              >
                Yardım
              </AccessibleButton>

              <AccessibleButton
                variant="secondary"
                size="small"
                icon={<Info size={16} />}
                ariaLabel="Accessibility information"
              >
                Bilgi
              </AccessibleButton>
            </div>
          </div>
        </footer>

        {/* Demo Modal */}
        <AccessibleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Erişilebilirlik Demo Modal"
          size="medium"
          closeOnEscape={true}
          closeOnOverlayClick={true}
        >
          <div className="demo-modal__content">
            <p>Bu modal, erişilebilirlik özelliklerini test etmek için tasarlanmıştır.</p>

            <h4>Test Edilecek Özellikler:</h4>
            <ul>
              <li>Escape tuşu ile kapatma</li>
              <li>Overlay tıklama ile kapatma</li>
              <li>Odak yönetimi</li>
              <li>Ekran okuyucu duyuruları</li>
              <li>Klavye navigasyonu</li>
            </ul>

            <div className="demo-modal__actions">
              <AccessibleButton
                onClick={() => announce('Modal içindeki buton tıklandı', 'polite')}
                variant="primary"
                size="medium"
                icon={<Check size={20} />}
                ariaLabel="Confirm modal action"
              >
                Onayla
              </AccessibleButton>

              <AccessibleButton
                onClick={() => setIsModalOpen(false)}
                variant="secondary"
                size="medium"
                icon={<X size={20} />}
                ariaLabel="Close modal"
              >
                Kapat
              </AccessibleButton>
            </div>
          </div>
        </AccessibleModal>
      </div>
    </AccessibilityProvider>
  );
};

export default AccessibilityDemoPage;
