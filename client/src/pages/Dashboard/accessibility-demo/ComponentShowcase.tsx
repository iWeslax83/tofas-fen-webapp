import React from 'react';
import {
  Settings,
  Plus,
  Edit,
  Trash,
  Check,
  AlertTriangle,
  Monitor,
  ChevronDown,
  User,
  HelpCircle,
  Info,
  Mail,
  Lock,
  RotateCcw,
} from 'lucide-react';
import {
  AccessibleButton,
  AccessibleDropdown,
  AccessibleTooltip,
} from '../../../components/AccessibilityComponents';
import { FormField, Form, FormFieldGroup } from '../../../components/FormComponents';
import type { FormData } from './types';

interface ComponentShowcaseProps {
  isDropdownOpen: boolean;
  onDropdownToggle: () => void;
  onOpenModal: () => void;
  formData: FormData;
  onFormDataChange: (data: FormData) => void;
  onFormSubmit: () => Promise<void>;
  onAnnounce: (message: string, priority: 'polite' | 'assertive') => void;
}

const ComponentShowcase: React.FC<ComponentShowcaseProps> = ({
  isDropdownOpen,
  onDropdownToggle,
  onOpenModal,
  formData,
  onFormDataChange,
  onFormSubmit,
  onAnnounce,
}) => {
  return (
    <section className="demo-section" aria-labelledby="components-title">
      <header className="demo-section__header">
        <h2 id="components-title" className="demo-section__title">
          <Settings size={24} />
          Erişilebilir Bileşenler
        </h2>
        <p className="demo-section__description">WCAG 2.1 AA uyumlu bileşenleri test edin</p>
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
              onClick={onOpenModal}
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
              onToggle={onDropdownToggle}
              placement="bottom"
            >
              <div className="demo-dropdown__content">
                <button
                  className="demo-dropdown__item"
                  onClick={() => onAnnounce('Option 1 selected', 'polite')}
                >
                  <User size={16} />
                  Seçenek 1
                </button>
                <button
                  className="demo-dropdown__item"
                  onClick={() => onAnnounce('Option 2 selected', 'polite')}
                >
                  <Settings size={16} />
                  Seçenek 2
                </button>
                <button
                  className="demo-dropdown__item"
                  onClick={() => onAnnounce('Option 3 selected', 'polite')}
                >
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
            <Form onSubmit={onFormSubmit} className="demo-form">
              <FormFieldGroup>
                <FormField
                  id="demo-name"
                  name="name"
                  label="Ad Soyad"
                  type="text"
                  value={formData.name}
                  onChange={(value) => onFormDataChange({ ...formData, name: value })}
                  required={true}
                  icon={<User size={18} />}
                  placeholder="Adınızı ve soyadınızı girin"
                  validationRules={[
                    { type: 'required', message: 'Ad soyad gereklidir' },
                    { type: 'minLength', value: 2, message: 'En az 2 karakter olmalıdır' },
                  ]}
                />

                <FormField
                  id="demo-email"
                  name="email"
                  label="E-posta"
                  type="email"
                  value={formData.email}
                  onChange={(value) => onFormDataChange({ ...formData, email: value })}
                  required={true}
                  icon={<Mail size={18} />}
                  placeholder="E-posta adresinizi girin"
                  validationRules={[
                    { type: 'required', message: 'E-posta gereklidir' },
                    { type: 'email', message: 'Geçerli bir e-posta adresi girin' },
                  ]}
                />

                <FormField
                  id="demo-password"
                  name="password"
                  label="Şifre"
                  type="password"
                  value={formData.password}
                  onChange={(value) => onFormDataChange({ ...formData, password: value })}
                  required={true}
                  icon={<Lock size={18} />}
                  showPasswordToggle={true}
                  placeholder="Şifrenizi girin"
                  validationRules={[
                    { type: 'required', message: 'Şifre gereklidir' },
                    { type: 'minLength', value: 8, message: 'En az 8 karakter olmalıdır' },
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
                  onClick={() =>
                    onFormDataChange({
                      name: '',
                      email: '',
                      password: '',
                      message: '',
                      category: '',
                      priority: 'medium',
                    })
                  }
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
  );
};

export default ComponentShowcase;
