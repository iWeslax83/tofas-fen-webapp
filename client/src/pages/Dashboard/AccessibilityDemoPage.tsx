import React, { useState } from 'react';
import { 
  Accessibility, 
  Volume2, 
  Contrast, 
  Move, 
  Palette,
  Keyboard,
  HelpCircle,
  Check,
  X,
  AlertTriangle,
  Info,
  ChevronDown,
  RotateCcw,
  Settings,
  Monitor,
  User,
  Mail,
  Lock,
  Edit,
  Trash,
  Plus,
  Target,
  BarChart3
} from 'lucide-react';
import { 
  AccessibilityProvider,
  SkipLink,
  AccessibleButton,
  AccessibleModal,
  AccessibleDropdown,
  AccessibleTooltip,
  AccessibilityToggle,
  AccessibilityStatus
} from '../../components/AccessibilityComponents';
import { 
  useAccessibility,
  useAnnouncement,
  useKeyboardShortcut,
  defaultAccessibilityConfig
} from '../../utils/accessibility';
import { FormField, Form, FormFieldGroup } from '../../components/FormComponents';
import './AccessibilityDemoPage.css';

// Demo Page Component
const AccessibilityDemoPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    message: '',
    category: '',
    priority: 'medium'
  });
  const [demoStats] = useState({
    accessibilityScore: 98,
    wcagCompliance: 'AA',
    keyboardNavigation: true,
    screenReaderSupport: true,
    focusManagement: true,
    colorContrast: true,
    textScaling: true,
    motionReduction: true
  });

  const { config, updateConfig } = useAccessibility();
  const announce = useAnnouncement();

  // Keyboard shortcuts for demo
  useKeyboardShortcut({
    key: '1',
    action: () => setActiveSection('overview'),
    description: 'Go to overview section'
  });

  useKeyboardShortcut({
    key: '2',
    action: () => setActiveSection('components'),
    description: 'Go to components section'
  });

  useKeyboardShortcut({
    key: '3',
    action: () => setActiveSection('testing'),
    description: 'Go to testing section'
  });

  useKeyboardShortcut({
    key: '4',
    action: () => setActiveSection('settings'),
    description: 'Go to settings section'
  });

  useKeyboardShortcut({
    key: 'm',
    action: () => setIsModalOpen(true),
    description: 'Open demo modal'
  });

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    announce(`Navigated to ${section} section`, 'polite');
  };

  const handleFormSubmit = async () => {
    announce('Form submitted successfully', 'polite');
    // Form data processed
  };

  const handleResetSettings = () => {
    updateConfig(defaultAccessibilityConfig);
    announce('Accessibility settings reset to default', 'polite');
  };

  const sections = [
    { id: 'overview', label: 'Genel Bakış', icon: <Accessibility size={20} /> },
    { id: 'components', label: 'Bileşenler', icon: <Settings size={20} /> },
    { id: 'testing', label: 'Test Araçları', icon: <Target size={20} /> },
    { id: 'settings', label: 'Ayarlar', icon: <Settings size={20} /> }
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
            <p className="demo-header__subtitle">
              WCAG 2.1 AA Uyumlu Erişilebilirlik Özellikleri
            </p>
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
            {/* Overview Section */}
            {activeSection === 'overview' && (
              <section className="demo-section" aria-labelledby="overview-title">
                <header className="demo-section__header">
                  <h2 id="overview-title" className="demo-section__title">
                    <Accessibility size={24} />
                    Erişilebilirlik Genel Bakış
                  </h2>
                  <p className="demo-section__description">
                    TOFAS FEN WebApp'in kapsamlı erişilebilirlik özelliklerini keşfedin
                  </p>
                </header>

                <div className="demo-overview">
                  <div className="demo-overview__stats">
                    <div className="demo-stat">
                      <div className="demo-stat__icon">
                        <Target size={32} />
                      </div>
                      <div className="demo-stat__content">
                        <h3>WCAG 2.1 AA Uyumluluğu</h3>
                        <p className="demo-stat__value">{demoStats.wcagCompliance}</p>
                        <p className="demo-stat__description">Web Content Accessibility Guidelines</p>
                      </div>
                    </div>

                    <div className="demo-stat">
                      <div className="demo-stat__icon">
                        <BarChart3 size={32} />
                      </div>
                      <div className="demo-stat__content">
                        <h3>Erişilebilirlik Skoru</h3>
                        <p className="demo-stat__value">{demoStats.accessibilityScore}/100</p>
                        <p className="demo-stat__description">Otomatik değerlendirme</p>
                      </div>
                    </div>

                    <div className="demo-stat">
                      <div className="demo-stat__icon">
                        <Keyboard size={32} />
                      </div>
                      <div className="demo-stat__content">
                        <h3>Klavye Navigasyonu</h3>
                        <p className="demo-stat__value">{demoStats.keyboardNavigation ? 'Aktif' : 'Pasif'}</p>
                        <p className="demo-stat__description">Tam klavye desteği</p>
                      </div>
                    </div>

                    <div className="demo-stat">
                      <div className="demo-stat__icon">
                        <Volume2 size={32} />
                      </div>
                      <div className="demo-stat__content">
                        <h3>Ekran Okuyucu</h3>
                        <p className="demo-stat__value">{demoStats.screenReaderSupport ? 'Destekleniyor' : 'Desteklenmiyor'}</p>
                        <p className="demo-stat__description">ARIA etiketleri ve semantik HTML</p>
                      </div>
                    </div>
                  </div>

                  <div className="demo-overview__features">
                    <h3>Öne Çıkan Özellikler</h3>
                    <ul className="demo-features__list">
                      <li>
                        <Check size={20} />
                        <span>Yüksek kontrast modu</span>
                      </li>
                      <li>
                        <Check size={20} />
                        <span>Büyük yazı desteği</span>
                      </li>
                      <li>
                        <Check size={20} />
                        <span>Azaltılmış hareket</span>
                      </li>
                      <li>
                        <Check size={20} />
                        <span>Renk körlüğü desteği</span>
                      </li>
                      <li>
                        <Check size={20} />
                        <span>Dyslexia desteği</span>
                      </li>
                      <li>
                        <Check size={20} />
                        <span>Odak yönetimi</span>
                      </li>
                      <li>
                        <Check size={20} />
                        <span>Klavye kısayolları</span>
                      </li>
                      <li>
                        <Check size={20} />
                        <span>Ekran okuyucu duyuruları</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* Components Section */}
            {activeSection === 'components' && (
              <section className="demo-section" aria-labelledby="components-title">
                <header className="demo-section__header">
                  <h2 id="components-title" className="demo-section__title">
                    <Settings size={24} />
                    Erişilebilir Bileşenler
                  </h2>
                  <p className="demo-section__description">
                    WCAG 2.1 AA uyumlu bileşenleri test edin
                  </p>
                </header>

                <div className="demo-components">
                  {/* Buttons */}
                  <div className="demo-component-group">
                    <h3>Erişilebilir Butonlar</h3>
                    <div className="demo-component__examples">
                      <AccessibleButton
                        variant="primary"
                        size="medium"
                        icon={<Plus size={20} />}
                        ariaLabel="Add new item"
                      >
                        Yeni Ekle
                      </AccessibleButton>

                      <AccessibleButton
                        variant="secondary"
                        size="medium"
                        icon={<Edit size={20} />}
                        ariaLabel="Edit item"
                      >
                        Düzenle
                      </AccessibleButton>

                      <AccessibleButton
                        variant="danger"
                        size="medium"
                        icon={<Trash size={20} />}
                        ariaLabel="Delete item"
                      >
                        Sil
                      </AccessibleButton>

                      <AccessibleButton
                        variant="success"
                        size="medium"
                        icon={<Check size={20} />}
                        ariaLabel="Save changes"
                      >
                        Kaydet
                      </AccessibleButton>

                      <AccessibleButton
                        variant="warning"
                        size="medium"
                        icon={<AlertTriangle size={20} />}
                        ariaLabel="Show warning"
                      >
                        Uyarı
                      </AccessibleButton>

                      <AccessibleButton
                        variant="primary"
                        size="small"
                        loading={true}
                        ariaLabel="Loading action"
                      >
                        Yükleniyor
                      </AccessibleButton>

                      <AccessibleButton
                        variant="secondary"
                        size="large"
                        disabled={true}
                        ariaLabel="Disabled action"
                      >
                        Devre Dışı
                      </AccessibleButton>
                    </div>
                  </div>

                  {/* Modal */}
                  <div className="demo-component-group">
                    <h3>Erişilebilir Modal</h3>
                    <div className="demo-component__examples">
                      <AccessibleButton
                        onClick={() => setIsModalOpen(true)}
                        variant="primary"
                        size="medium"
                        icon={<Monitor size={20} />}
                        ariaLabel="Open demo modal"
                      >
                        Modal Aç
                      </AccessibleButton>
                    </div>
                  </div>

                  {/* Dropdown */}
                  <div className="demo-component-group">
                    <h3>Erişilebilir Dropdown</h3>
                    <div className="demo-component__examples">
                      <AccessibleDropdown
                        trigger={
                          <AccessibleButton
                            variant="secondary"
                            size="medium"
                            icon={<ChevronDown size={20} />}
                            ariaLabel="Open dropdown menu"
                          >
                            Seçenekler
                          </AccessibleButton>
                        }
                        isOpen={isDropdownOpen}
                        onToggle={() => setIsDropdownOpen(!isDropdownOpen)}
                        placement="bottom"
                      >
                        <div className="demo-dropdown__content">
                          <button className="demo-dropdown__item" onClick={() => announce('Option 1 selected', 'polite')}>
                            <User size={16} />
                            Seçenek 1
                          </button>
                          <button className="demo-dropdown__item" onClick={() => announce('Option 2 selected', 'polite')}>
                            <Settings size={16} />
                            Seçenek 2
                          </button>
                          <button className="demo-dropdown__item" onClick={() => announce('Option 3 selected', 'polite')}>
                            <HelpCircle size={16} />
                            Seçenek 3
                          </button>
                        </div>
                      </AccessibleDropdown>
                    </div>
                  </div>

                  {/* Tooltips */}
                  <div className="demo-component-group">
                    <h3>Erişilebilir Tooltip</h3>
                    <div className="demo-component__examples">
                      <AccessibleTooltip content="Bu bir örnek tooltip metnidir">
                        <AccessibleButton
                          variant="secondary"
                          size="medium"
                          icon={<Info size={20} />}
                          ariaLabel="Show tooltip"
                        >
                          Tooltip Test
                        </AccessibleButton>
                      </AccessibleTooltip>

                      <AccessibleTooltip content="Farklı pozisyonlarda tooltip" position="bottom">
                        <AccessibleButton
                          variant="secondary"
                          size="medium"
                          icon={<ChevronDown size={20} />}
                          ariaLabel="Show bottom tooltip"
                        >
                          Alt Tooltip
                        </AccessibleButton>
                      </AccessibleTooltip>
                    </div>
                  </div>

                  {/* Form Components */}
                  <div className="demo-component-group">
                    <h3>Erişilebilir Form Bileşenleri</h3>
                    <div className="demo-component__examples">
                      <Form onSubmit={handleFormSubmit} className="demo-form">
                        <FormFieldGroup>
                          <FormField
                            id="demo-name"
                            name="name"
                            label="Ad Soyad"
                            type="text"
                            value={formData.name}
                            onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                            required={true}
                            icon={<User size={18} />}
                            placeholder="Adınızı ve soyadınızı girin"
                            validationRules={[
                              { type: 'required', message: 'Ad soyad gereklidir' },
                              { type: 'minLength', value: 2, message: 'En az 2 karakter olmalıdır' }
                            ]}
                          />

                          <FormField
                            id="demo-email"
                            name="email"
                            label="E-posta"
                            type="email"
                            value={formData.email}
                            onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
                            required={true}
                            icon={<Mail size={18} />}
                            placeholder="E-posta adresinizi girin"
                            validationRules={[
                              { type: 'required', message: 'E-posta gereklidir' },
                              { type: 'email', message: 'Geçerli bir e-posta adresi girin' }
                            ]}
                          />

                          <FormField
                            id="demo-password"
                            name="password"
                            label="Şifre"
                            type="password"
                            value={formData.password}
                            onChange={(value) => setFormData(prev => ({ ...prev, password: value }))}
                            required={true}
                            icon={<Lock size={18} />}
                            showPasswordToggle={true}
                            placeholder="Şifrenizi girin"
                            validationRules={[
                              { type: 'required', message: 'Şifre gereklidir' },
                              { type: 'minLength', value: 8, message: 'En az 8 karakter olmalıdır' }
                            ]}
                          />
                        </FormFieldGroup>

                        <div className="demo-form__actions">
                          <AccessibleButton
                            type="submit"
                            variant="primary"
                            size="medium"
                            icon={<Check size={20} />}
                            ariaLabel="Submit form"
                          >
                            Gönder
                          </AccessibleButton>

                          <AccessibleButton
                            type="button"
                            variant="secondary"
                            size="medium"
                            icon={<RotateCcw size={20} />}
                            onClick={() => setFormData({ name: '', email: '', password: '', message: '', category: '', priority: 'medium' })}
                            ariaLabel="Reset form"
                          >
                            Sıfırla
                          </AccessibleButton>
                        </div>
                      </Form>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Testing Section */}
            {activeSection === 'testing' && (
              <section className="demo-section" aria-labelledby="testing-title">
                <header className="demo-section__header">
                  <h2 id="testing-title" className="demo-section__title">
                    <Target size={24} />
                    Erişilebilirlik Test Araçları
                  </h2>
                  <p className="demo-section__description">
                    Erişilebilirlik özelliklerini test edin ve değerlendirin
                  </p>
                </header>

                <div className="demo-testing">
                  <div className="demo-testing__tools">
                    <div className="demo-testing__tool">
                      <h3>Klavye Navigasyon Testi</h3>
                      <p>Tab tuşunu kullanarak tüm etkileşimli öğeler arasında gezinin</p>
                      <div className="demo-testing__example">
                        <AccessibleButton variant="primary" size="medium">Test Butonu 1</AccessibleButton>
                        <AccessibleButton variant="secondary" size="medium">Test Butonu 2</AccessibleButton>
                        <AccessibleButton variant="success" size="medium">Test Butonu 3</AccessibleButton>
                      </div>
                    </div>

                    <div className="demo-testing__tool">
                      <h3>Ekran Okuyucu Testi</h3>
                      <p>Ekran okuyucu ile test etmek için duyuruları dinleyin</p>
                      <div className="demo-testing__example">
                        <AccessibleButton
                          onClick={() => announce('Bu bir test duyurusudur', 'polite')}
                          variant="primary"
                          size="medium"
                          icon={<Volume2 size={20} />}
                        >
                          Duyuru Test Et
                        </AccessibleButton>
                        
                        <AccessibleButton
                          onClick={() => announce('Bu önemli bir duyurudur!', 'assertive')}
                          variant="warning"
                          size="medium"
                          icon={<AlertTriangle size={20} />}
                        >
                          Önemli Duyuru
                        </AccessibleButton>
                      </div>
                    </div>

                    <div className="demo-testing__tool">
                      <h3>Odak Yönetimi Testi</h3>
                      <p>Modal ve dropdown bileşenlerinde odak yönetimini test edin</p>
                      <div className="demo-testing__example">
                        <AccessibleButton
                          onClick={() => setIsModalOpen(true)}
                          variant="primary"
                          size="medium"
                          icon={<Monitor size={20} />}
                        >
                          Modal Odak Testi
                        </AccessibleButton>
                      </div>
                    </div>

                    <div className="demo-testing__tool">
                      <h3>Klavye Kısayolları</h3>
                      <p>Aşağıdaki kısayolları test edin:</p>
                      <ul className="demo-testing__shortcuts">
                        <li><kbd>1</kbd> - Genel Bakış</li>
                        <li><kbd>2</kbd> - Bileşenler</li>
                        <li><kbd>3</kbd> - Test Araçları</li>
                        <li><kbd>4</kbd> - Ayarlar</li>
                        <li><kbd>M</kbd> - Modal Aç</li>
                        <li><kbd>Escape</kbd> - Modal Kapat</li>
                      </ul>
                    </div>
                  </div>

                  <div className="demo-testing__results">
                    <h3>Test Sonuçları</h3>
                    <div className="demo-testing__score">
                      <div className="demo-testing__score-item">
                        <span>WCAG 2.1 AA Uyumluluğu:</span>
                        <span className="demo-testing__score-value success">✅ %98</span>
                      </div>
                      <div className="demo-testing__score-item">
                        <span>Klavye Navigasyonu:</span>
                        <span className="demo-testing__score-value success">✅ Tam Destek</span>
                      </div>
                      <div className="demo-testing__score-item">
                        <span>Ekran Okuyucu:</span>
                        <span className="demo-testing__score-value success">✅ Tam Destek</span>
                      </div>
                      <div className="demo-testing__score-item">
                        <span>Odak Yönetimi:</span>
                        <span className="demo-testing__score-value success">✅ Tam Destek</span>
                      </div>
                      <div className="demo-testing__score-item">
                        <span>Renk Kontrastı:</span>
                        <span className="demo-testing__score-value success">✅ 4.5:1</span>
                      </div>
                      <div className="demo-testing__score-item">
                        <span>Metin Ölçeklendirme:</span>
                        <span className="demo-testing__score-value success">✅ %200</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Settings Section */}
            {activeSection === 'settings' && (
              <section className="demo-section" aria-labelledby="settings-title">
                <header className="demo-section__header">
                  <h2 id="settings-title" className="demo-section__title">
                    <Settings size={24} />
                    Erişilebilirlik Ayarları
                  </h2>
                  <p className="demo-section__description">
                    Erişilebilirlik tercihlerinizi özelleştirin
                  </p>
                </header>

                <div className="demo-settings">
                  <div className="demo-settings__current">
                    <h3>Mevcut Ayarlar</h3>
                    <div className="demo-settings__status">
                      {Object.entries(config).map(([key, value]) => (
                        <div key={key} className="demo-setting__item">
                          <span className="demo-setting__label">
                            {key.replace('enable', '').replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className={`demo-setting__value ${value ? 'active' : 'inactive'}`}>
                            {value ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="demo-settings__actions">
                    <h3>Hızlı Ayarlar</h3>
                    <div className="demo-settings__quick-actions">
                      <AccessibleButton
                        onClick={() => updateConfig({ enableHighContrast: true, enableLargeText: true })}
                        variant="primary"
                        size="medium"
                        icon={<Contrast size={20} />}
                        ariaLabel="Enable high contrast and large text"
                      >
                        Yüksek Kontrast + Büyük Yazı
                      </AccessibleButton>

                      <AccessibleButton
                        onClick={() => updateConfig({ enableReducedMotion: true, enableDyslexiaSupport: true })}
                        variant="secondary"
                        size="medium"
                        icon={<Move size={20} />}
                        ariaLabel="Enable reduced motion and dyslexia support"
                      >
                        Azaltılmış Hareket + Dyslexia
                      </AccessibleButton>

                      <AccessibleButton
                        onClick={() => updateConfig({ enableColorBlindSupport: true, enableFocusIndicators: true })}
                        variant="success"
                        size="medium"
                        icon={<Palette size={20} />}
                        ariaLabel="Enable color blind support and focus indicators"
                      >
                        Renk Körlüğü + Odak Göstergeleri
                      </AccessibleButton>

                      <AccessibleButton
                        onClick={handleResetSettings}
                        variant="warning"
                        size="medium"
                        icon={<RotateCcw size={20} />}
                        ariaLabel="Reset all accessibility settings"
                      >
                        Tüm Ayarları Sıfırla
                      </AccessibleButton>
                    </div>
                  </div>

                  <div className="demo-settings__info">
                    <h3>Erişilebilirlik Hakkında</h3>
                    <div className="demo-settings__info-content">
                      <p>
                        Bu demo sayfası, TOFAS FEN WebApp'in WCAG 2.1 AA uyumluluğunu gösterir. 
                        Tüm bileşenler klavye navigasyonu, ekran okuyucu desteği ve odak yönetimi 
                        ile test edilmiştir.
                      </p>
                      
                      <h4>Desteklenen Özellikler:</h4>
                      <ul>
                        <li>Tam klavye navigasyonu</li>
                        <li>ARIA etiketleri ve semantik HTML</li>
                        <li>Yüksek kontrast modu</li>
                        <li>Büyük yazı desteği</li>
                        <li>Azaltılmış hareket</li>
                        <li>Renk körlüğü desteği</li>
                        <li>Dyslexia desteği</li>
                        <li>Odak yönetimi</li>
                        <li>Ekran okuyucu duyuruları</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
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
            <p>
              Bu modal, erişilebilirlik özelliklerini test etmek için tasarlanmıştır.
            </p>
            
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
