import React from 'react';
import { Accessibility, Target, BarChart3, Keyboard, Volume2, Check } from 'lucide-react';
import type { DemoStats } from './types';

interface DemoStatsPanelProps {
  demoStats: DemoStats;
}

const DemoStatsPanel: React.FC<DemoStatsPanelProps> = ({ demoStats }) => {
  return (
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
              <p className="demo-stat__value">
                {demoStats.screenReaderSupport ? 'Destekleniyor' : 'Desteklenmiyor'}
              </p>
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
  );
};

export default DemoStatsPanel;
