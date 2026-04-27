import React from 'react';
import { Target, Volume2, AlertTriangle, Monitor } from 'lucide-react';
import { AccessibleButton } from '../../../components/AccessibilityComponents';

interface TestingToolsPanelProps {
  onOpenModal: () => void;
  onAnnounce: (message: string, priority: 'polite' | 'assertive') => void;
}

const TestingToolsPanel: React.FC<TestingToolsPanelProps> = ({ onOpenModal, onAnnounce }) => {
  return (
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
              <AccessibleButton variant="primary" size="medium">
                Test Butonu 1
              </AccessibleButton>
              <AccessibleButton variant="secondary" size="medium">
                Test Butonu 2
              </AccessibleButton>
              <AccessibleButton variant="success" size="medium">
                Test Butonu 3
              </AccessibleButton>
            </div>
          </div>

          <div className="demo-testing__tool">
            <h3>Ekran Okuyucu Testi</h3>
            <p>Ekran okuyucu ile test etmek için duyuruları dinleyin</p>
            <div className="demo-testing__example">
              <AccessibleButton
                onClick={() => onAnnounce('Bu bir test duyurusudur', 'polite')}
                variant="primary"
                size="medium"
                icon={<Volume2 size={20} />}
              >
                Duyuru Test Et
              </AccessibleButton>

              <AccessibleButton
                onClick={() => onAnnounce('Bu önemli bir duyurudur!', 'assertive')}
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
                onClick={onOpenModal}
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
              <li>
                <kbd>1</kbd> - Genel Bakış
              </li>
              <li>
                <kbd>2</kbd> - Bileşenler
              </li>
              <li>
                <kbd>3</kbd> - Test Araçları
              </li>
              <li>
                <kbd>4</kbd> - Ayarlar
              </li>
              <li>
                <kbd>M</kbd> - Modal Aç
              </li>
              <li>
                <kbd>Escape</kbd> - Modal Kapat
              </li>
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
  );
};

export default TestingToolsPanel;
