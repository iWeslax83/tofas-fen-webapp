import React, { useState, useRef } from 'react';
// import { Link } from 'react-router-dom'; // Not used
import { User, Calendar, FileText, CheckCircle } from 'lucide-react'; // ArrowLeft, Mail, Lock, Phone, MapPin removed
import { toast } from 'react-hot-toast';
import { 
  FormField, 
  Form, 
  FormFieldGroup, 
  SearchField, 
  ValidationRule,
  FormFieldRef
} from '../../components/FormComponents';

export default function FormUXDemoPage() {
  const [activeSection, setActiveSection] = useState('basic');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    birthDate: '',
    website: '',
    bio: ''
  });
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs for form fields
  const nameRef = useRef<FormFieldRef>(null);
  const emailRef = useRef<FormFieldRef>(null);
  const passwordRef = useRef<FormFieldRef>(null);

  // Validation rules
  const nameValidation: ValidationRule[] = [
    { type: 'required', message: 'Ad alanı zorunludur' },
    { type: 'minLength', value: 2, message: 'Ad en az 2 karakter olmalıdır' },
    { type: 'maxLength', value: 50, message: 'Ad en fazla 50 karakter olabilir' }
  ];

  const emailValidation: ValidationRule[] = [
    { type: 'required', message: 'E-posta alanı zorunludur' },
    { type: 'email', message: 'Geçerli bir e-posta adresi giriniz' }
  ];

  const passwordValidation: ValidationRule[] = [
    { type: 'required', message: 'Şifre alanı zorunludur' },
    { type: 'minLength', value: 8, message: 'Şifre en az 8 karakter olmalıdır' },
    { type: 'custom', message: 'Şifre güvenlik gereksinimlerini karşılamıyor', validator: (value) => {
      // Simple password validation
      return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value);
    }}
  ];

  const phoneValidation: ValidationRule[] = [
    { type: 'phone', message: 'Geçerli bir telefon numarası giriniz' }
  ];

  const websiteValidation: ValidationRule[] = [
    { type: 'url', message: 'Geçerli bir URL giriniz' }
  ];

  // Handle form submission
  const handleSubmit = async () => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // const data = Object.fromEntries(formData.entries()); // Not used
    // Form data processed
    
    toast.success('Form başarıyla gönderildi!');
    setIsLoading(false);
  };

  // Handle form reset
  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      address: '',
      birthDate: '',
      website: '',
      bio: ''
    });
    toast.success('Form sıfırlandı');
  };

  // Handle search
  const handleSearch = (value: string) => {
    // Search functionality
    toast.success(`"${value}" için arama yapılıyor...`);
  };

  // Simulate field validation
  const simulateValidation = async () => {
    if (nameRef.current) {
      // const result = await nameRef.current.validate(); // Not used
      // Validation completed
    }
  };

  // Navigation sections
  const sections = [
    { id: 'basic', label: 'Temel Alanlar', icon: User },
    { id: 'validation', label: 'Doğrulama', icon: CheckCircle },
    { id: 'advanced', label: 'Gelişmiş', icon: FileText },
    { id: 'search', label: 'Arama', icon: Calendar }
  ];

  return (
    <div className="form-ux-demo-page">
      {/* Header */}
      <div className="form-ux-demo-header">
        <div className="form-ux-demo-header__left">
          <h1 className="form-ux-demo-title">Form UX Demo</h1>
        </div>
      </div>

      {/* Navigation */}
      <div className="form-ux-demo-nav">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`form-ux-demo-nav-button ${activeSection === section.id ? 'active' : ''}`}
          >
            <section.icon size={18} />
            {section.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="form-ux-demo-content">
        {/* Basic Fields Section */}
        {activeSection === 'basic' && (
          <div className="form-ux-demo-section">
            <h2 className="form-ux-demo-section-title">Temel Form Alanları</h2>
            <p className="form-ux-demo-section-description">
              Temel form alanları ve farklı boyutlar ile varyantlar
            </p>

            <Form onSubmit={handleSubmit} onReset={handleReset} showReset loading={isLoading}>
              <FormFieldGroup title="Kişisel Bilgiler" description="Temel kişisel bilgileri giriniz" columns={2}>
                <FormField
                  id="name"
                  name="name"
                  label="Ad Soyad"
                  type="text"
                  value={formData.name}
                  onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                  placeholder="Adınızı ve soyadınızı giriniz"
                  required
                  validationRules={nameValidation}
                  validateOnBlur
                  ref={nameRef}
                />

                <FormField
                  id="email"
                  name="email"
                  label="E-posta"
                  type="email"
                  value={formData.email}
                  onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
                  placeholder="ornek@email.com"
                  required
                  validationRules={emailValidation}
                  validateOnBlur
                  ref={emailRef}
                />

                <FormField
                  id="phone"
                  name="phone"
                  label="Telefon"
                  type="tel"
                  value={formData.phone}
                  onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                  placeholder="+90 5XX XXX XX XX"
                  validationRules={phoneValidation}
                  validateOnBlur
                />

                <FormField
                  id="birthDate"
                  name="birthDate"
                  label="Doğum Tarihi"
                  type="date"
                  value={formData.birthDate}
                  onChange={(value) => setFormData(prev => ({ ...prev, birthDate: value }))}
                />
              </FormFieldGroup>

              <FormFieldGroup title="Güvenlik" description="Hesap güvenlik bilgileri" columns={1}>
                <FormField
                  id="password"
                  name="password"
                  label="Şifre"
                  type="password"
                  value={formData.password}
                  onChange={(value) => setFormData(prev => ({ ...prev, password: value }))}
                  placeholder="Güçlü bir şifre oluşturun"
                  required
                  showPasswordToggle
                  validationRules={passwordValidation}
                  validateOnBlur
                  ref={passwordRef}
                />

                <FormField
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Şifre Tekrar"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(value) => setFormData(prev => ({ ...prev, confirmPassword: value }))}
                  placeholder="Şifrenizi tekrar giriniz"
                  required
                  showPasswordToggle
                  validationRules={[
                    { type: 'required', message: 'Şifre tekrarı zorunludur' },
                    { type: 'custom', message: 'Şifreler eşleşmiyor', validator: (value) => value === formData.password }
                  ]}
                  validateOnBlur
                />
              </FormFieldGroup>
            </Form>
          </div>
        )}

        {/* Validation Section */}
        {activeSection === 'validation' && (
          <div className="form-ux-demo-section">
            <h2 className="form-ux-demo-section-title">Doğrulama Örnekleri</h2>
            <p className="form-ux-demo-section-description">
              Farklı doğrulama türleri ve gerçek zamanlı doğrulama
            </p>

            <div className="form-ux-demo-validation-examples">
              <FormFieldGroup title="Gerçek Zamanlı Doğrulama" description="Alanlar değiştikçe doğrulanır" columns={2}>
                <FormField
                  id="email-realtime"
                  name="emailRealtime"
                  label="E-posta (Gerçek Zamanlı)"
                  type="email"
                  value={formData.email}
                  onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
                  placeholder="ornek@email.com"
                  validationRules={emailValidation}
                  validateOnChange
                  validateOnBlur
                />

                <FormField
                  id="phone-realtime"
                  name="phoneRealtime"
                  label="Telefon (Gerçek Zamanlı)"
                  type="tel"
                  value={formData.phone}
                  onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                  placeholder="+90 5XX XXX XX XX"
                  validationRules={phoneValidation}
                  validateOnChange
                  validateOnBlur
                />
              </FormFieldGroup>

              <FormFieldGroup title="Özel Doğrulama" description="Özel doğrulama kuralları" columns={1}>
                <FormField
                  id="website"
                  name="website"
                  label="Website"
                  type="url"
                  value={formData.website}
                  onChange={(value) => setFormData(prev => ({ ...prev, website: value }))}
                  placeholder="https://example.com"
                  validationRules={websiteValidation}
                  validateOnBlur
                  hint="Geçerli bir URL giriniz (https:// ile başlamalı)"
                />

                <FormField
                  id="bio"
                  name="bio"
                  label="Biyografi"
                  type="text"
                  value={formData.bio}
                  onChange={(value) => setFormData(prev => ({ ...prev, bio: value }))}
                  placeholder="Kendinizden bahsedin"
                  maxLength={200}
                  validationRules={[
                    { type: 'minLength', value: 10, message: 'Biyografi en az 10 karakter olmalıdır' },
                    { type: 'maxLength', value: 200, message: 'Biyografi en fazla 200 karakter olabilir' }
                  ]}
                  validateOnBlur
                  hint={`${formData.bio.length}/200 karakter`}
                />
              </FormFieldGroup>

              <div className="form-ux-demo-actions">
                <button onClick={simulateValidation} className="form-ux-demo-button">
                  Manuel Doğrulama Test Et
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Section */}
        {activeSection === 'advanced' && (
          <div className="form-ux-demo-section">
            <h2 className="form-ux-demo-section-title">Gelişmiş Özellikler</h2>
            <p className="form-ux-demo-section-description">
              Farklı boyutlar, varyantlar ve durumlar
            </p>

            <FormFieldGroup title="Boyut Varyantları" description="Farklı boyutlarda form alanları" columns={3}>
              <FormField
                id="name-small"
                name="nameSmall"
                label="Küçük Boyut"
                type="text"
                value=""
                onChange={() => {}}
                placeholder="Küçük alan"
                size="small"
              />

              <FormField
                id="name-medium"
                name="nameMedium"
                label="Orta Boyut"
                type="text"
                value=""
                onChange={() => {}}
                placeholder="Orta alan"
                size="medium"
              />

              <FormField
                id="name-large"
                name="nameLarge"
                label="Büyük Boyut"
                type="text"
                value=""
                onChange={() => {}}
                placeholder="Büyük alan"
                size="large"
              />
            </FormFieldGroup>

            <FormFieldGroup title="Varyant Türleri" description="Farklı stil varyantları" columns={2}>
              <FormField
                id="name-default"
                name="nameDefault"
                label="Varsayılan Varyant"
                type="text"
                value=""
                onChange={() => {}}
                placeholder="Varsayılan stil"
                variant="default"
              />

              <FormField
                id="name-outlined"
                name="nameOutlined"
                label="Çerçeveli Varyant"
                type="text"
                value=""
                onChange={() => {}}
                placeholder="Çerçeveli stil"
                variant="outlined"
              />

              <FormField
                id="name-filled"
                name="nameFilled"
                label="Dolu Varyant"
                type="text"
                value=""
                onChange={() => {}}
                placeholder="Dolu stil"
                variant="filled"
              />

              <FormField
                id="name-disabled"
                name="nameDisabled"
                label="Devre Dışı Alan"
                type="text"
                value="Devre dışı değer"
                onChange={() => {}}
                disabled
              />
            </FormFieldGroup>

            <FormFieldGroup title="Durum Örnekleri" description="Farklı durumlar" columns={2}>
              <FormField
                id="name-error"
                name="nameError"
                label="Hata Durumu"
                type="text"
                value=""
                onChange={() => {}}
                placeholder="Hata örneği"
                error="Bu alan zorunludur"
              />

              <FormField
                id="name-success"
                name="nameSuccess"
                label="Başarı Durumu"
                type="text"
                value="Başarılı değer"
                onChange={() => {}}
                success="Geçerli değer"
              />

              <FormField
                id="name-hint"
                name="nameHint"
                label="İpucu Durumu"
                type="text"
                value=""
                onChange={() => {}}
                placeholder="İpucu örneği"
                hint="Bu alan için yardımcı bilgi"
              />

              <FormField
                id="name-readonly"
                name="nameReadonly"
                label="Salt Okunur"
                type="text"
                value="Salt okunur değer"
                onChange={() => {}}
                readOnly
              />
            </FormFieldGroup>
          </div>
        )}

        {/* Search Section */}
        {activeSection === 'search' && (
          <div className="form-ux-demo-section">
            <h2 className="form-ux-demo-section-title">Arama Bileşenleri</h2>
            <p className="form-ux-demo-section-description">
              Gelişmiş arama alanları ve filtreleme
            </p>

            <div className="form-ux-demo-search-examples">
              <FormFieldGroup title="Temel Arama" description="Basit arama alanı" columns={1}>
                <SearchField
                  value={searchValue}
                  onChange={setSearchValue}
                  onSearch={handleSearch}
                  placeholder="Kullanıcı, dosya veya içerik ara..."
                />
              </FormFieldGroup>

              <FormFieldGroup title="Arama Durumları" description="Farklı arama durumları" columns={2}>
                <SearchField
                  value=""
                  onChange={() => {}}
                  placeholder="Normal arama"
                />

                <SearchField
                  value=""
                  onChange={() => {}}
                  placeholder="Devre dışı arama"
                  disabled
                />

                <SearchField
                  value="Arama terimi"
                  onChange={() => {}}
                  placeholder="Temizleme butonu ile"
                />

                <SearchField
                  value=""
                  onChange={() => {}}
                  placeholder="Yükleniyor..."
                  loading
                />
              </FormFieldGroup>

              <div className="form-ux-demo-search-info">
                <h3>Arama Özellikleri</h3>
                <ul>
                  <li>Gerçek zamanlı arama</li>
                  <li>Temizleme butonu</li>
                  <li>Yükleme durumu</li>
                  <li>Devre dışı durumu</li>
                  <li>Enter tuşu ile arama</li>
                  <li>Responsive tasarım</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="form-ux-demo-footer">
        <div className="form-ux-demo-footer__content">
          <h3>Form UX Bileşenleri</h3>
          <p>
            Bu demo sayfası, TOFAS FEN WebApp için geliştirilen gelişmiş form bileşenlerini göstermektedir. 
            Tüm bileşenler erişilebilirlik standartlarına uygun olarak tasarlanmıştır.
          </p>
        </div>
      </div>
    </div>
  );
}
