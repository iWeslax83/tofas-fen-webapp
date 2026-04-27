import React from 'react';
import { Settings, Contrast, Move, Palette, RotateCcw } from 'lucide-react';
import { AccessibleButton } from '../../../components/AccessibilityComponents';
import type { AccessibilityConfig } from '../../../utils/accessibility';

interface SettingsPanelProps {
  config: AccessibilityConfig;
  onUpdateConfig: (config: Partial<AccessibilityConfig>) => void;
  onResetSettings: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  onUpdateConfig,
  onResetSettings,
}) => {
  return (
    <section className="demo-section" aria-labelledby="settings-title">
      <header className="demo-section__header">
        <h2 id="settings-title" className="demo-section__title">
          <Settings size={24} />
          Erişilebilirlik Ayarları
        </h2>
        <p className="demo-section__description">Erişilebilirlik tercihlerinizi özelleştirin</p>
      </header>

      <div className="demo-settings">
        <div className="demo-settings__current">
          <h3>Mevcut Ayarlar</h3>
          <div className="demo-settings__status">
            {Object.entries(config).map(([key, value]) => (
              <div key={key} className="demo-setting__item">
                <span className="demo-setting__label">
                  {key
                    .replace('enable', '')
                    .replace(/([A-Z])/g, ' $1')
                    .trim()}
                  :
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
              onClick={() => onUpdateConfig({ enableHighContrast: true, enableLargeText: true })}
              variant="primary"
              size="medium"
              icon={<Contrast size={20} />}
              ariaLabel="Enable high contrast and large text"
            >
              Yüksek Kontrast + Büyük Yazı
            </AccessibleButton>

            <AccessibleButton
              onClick={() =>
                onUpdateConfig({ enableReducedMotion: true, enableDyslexiaSupport: true })
              }
              variant="secondary"
              size="medium"
              icon={<Move size={20} />}
              ariaLabel="Enable reduced motion and dyslexia support"
            >
              Azaltılmış Hareket + Dyslexia
            </AccessibleButton>

            <AccessibleButton
              onClick={() =>
                onUpdateConfig({ enableColorBlindSupport: true, enableFocusIndicators: true })
              }
              variant="success"
              size="medium"
              icon={<Palette size={20} />}
              ariaLabel="Enable color blind support and focus indicators"
            >
              Renk Körlüğü + Odak Göstergeleri
            </AccessibleButton>

            <AccessibleButton
              onClick={onResetSettings}
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
              Bu demo sayfası, TOFAS FEN WebApp'in WCAG 2.1 AA uyumluluğunu gösterir. Tüm bileşenler
              klavye navigasyonu, ekran okuyucu desteği ve odak yönetimi ile test edilmiştir.
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
  );
};

export default SettingsPanel;
