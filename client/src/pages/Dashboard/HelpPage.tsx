// import { motion } from 'framer-motion'; // Not used
import { useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
// import NotificationBell from '../../components/NotificationBell'; // Not used
import BackButton from '../../components/BackButton';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { 
  HelpCircle, 
  BookOpen, 
  Users, 
  Settings, 
  MessageCircle, 
  Phone, 
  Mail, 
  FileText,
  ChevronDown,
  ChevronUp,
  // ExternalLink, // Not used
  // ArrowLeft // Not used
} from 'lucide-react';
import './HelpPage.css';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'Sisteme nasıl giriş yapabilirim?',
    answer: 'Ana sayfadaki giriş formunu kullanarak e-posta adresiniz ve şifrenizle giriş yapabilirsiniz. Şifrenizi unuttuysanız "Şifremi Unuttum" linkini kullanabilirsiniz.',
    category: 'giris'
  },
  {
    id: '2',
    question: 'Şifremi nasıl değiştirebilirim?',
    answer: 'Profil sayfasından "Şifre Değiştir" seçeneğini kullanarak şifrenizi güncelleyebilirsiniz. Güvenlik için güçlü bir şifre seçmeyi unutmayın.',
    category: 'hesap'
  },
  {
    id: '3',
    question: 'Ödevlerimi nasıl takip edebilirim?',
    answer: 'Dashboard\'da "Ödevler" butonuna tıklayarak tüm ödevlerinizi görüntüleyebilir, teslim tarihlerini takip edebilir ve durumlarını kontrol edebilirsiniz.',
    category: 'odevler'
  },
  {
    id: '4',
    question: 'Ders programımı nasıl görüntüleyebilirim?',
    answer: 'Ana sayfada "Ders Programı" butonuna tıklayarak haftalık ders programınızı görüntüleyebilir ve ders saatlerini takip edebilirsiniz.',
    category: 'ders-programi'
  },
  {
    id: '5',
    question: 'Duyuruları nasıl takip edebilirim?',
    answer: 'Dashboard\'da "Duyurular" bölümünden okul yönetimi tarafından yayınlanan tüm duyuruları takip edebilirsiniz.',
    category: 'duyurular'
  },
  {
    id: '6',
    question: 'Kulüplere nasıl katılabilirim?',
    answer: 'Kulüpler sayfasından mevcut kulüpleri görüntüleyebilir ve katılmak istediğiniz kulübe başvuru yapabilirsiniz.',
    category: 'kulup'
  },
  {
    id: '7',
    question: 'Teknik destek için kime başvurabilirim?',
    answer: 'Teknik sorunlar için IT departmanına e-posta gönderebilir veya aşağıdaki iletişim bilgilerini kullanabilirsiniz.',
    category: 'destek'
  },
  {
    id: '8',
    question: 'Mobil uygulamayı nasıl indirebilirim?',
    answer: 'Mobil uygulama henüz geliştirme aşamasındadır. Yakında App Store ve Google Play\'de yayınlanacaktır.',
    category: 'mobil'
  }
];

const categories = [
  { key: 'giris', label: 'Giriş ve Hesap', icon: Users, description: 'Hesap yönetimi ve giriş işlemleri' },
  { key: 'odevler', label: 'Ödevler', icon: BookOpen, description: 'Ödev takibi ve teslim işlemleri' },
  { key: 'ders-programi', label: 'Ders Programı', icon: FileText, description: 'Haftalık ders programı' },
  { key: 'duyurular', label: 'Duyurular', icon: MessageCircle, description: 'Okul duyuruları' },
  { key: 'kulup', label: 'Kulüpler', icon: Users, description: 'Kulüp faaliyetleri' },
  { key: 'destek', label: 'Teknik Destek', icon: Settings, description: 'Teknik sorunlar' },
  { key: 'mobil', label: 'Mobil Uygulama', icon: Phone, description: 'Mobil erişim' }
];

export default function HelpPage() {
  const { user } = useAuthContext();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFAQs = faqData.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const contactInfo = [
    {
      title: 'IT Destek',
      email: 'it@tofas.edu.tr',
      phone: '+90 224 123 45 67',
      description: 'Teknik sorunlar için'
    },
    {
      title: 'Öğrenci İşleri',
      email: 'ogrenci@tofas.edu.tr',
      phone: '+90 224 123 45 68',
      description: 'Öğrenci belgeleri ve işlemleri'
    },
    {
      title: 'Genel Sekreterlik',
      email: 'sekreter@tofas.edu.tr',
      phone: '+90 224 123 45 69',
      description: 'Genel bilgi ve yönlendirme'
    }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Yardım Merkezi"
      breadcrumb={[
        { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
        { label: 'Yardım Merkezi' }
      ]}
    >
      <div className="welcome-section">
        <BackButton />
        <div className="welcome-card">
          <div className="welcome-content">
            <div className="welcome-text">
              <h2>Yardım Merkezi</h2>
              <p>Sık sorulan sorular ve destek bilgileri</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="help-content">
          {/* Search Section */}
          <div className="search-section">
            <h2 className="search-title">
              <HelpCircle />
              <span>Soru Ara</span>
            </h2>
            <input
              type="text"
              placeholder="Aradığınız soruyu yazın..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Categories Section */}
          <div className="categories-section">
            <h2 className="categories-title">
              <BookOpen />
              <span>Kategoriler</span>
            </h2>
            <div className="help-categories-grid">
              <div 
                className={`category-card ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                <HelpCircle className="category-icon" />
                <h3 className="category-title">Tüm Kategoriler</h3>
                <p className="category-description">Tüm soruları görüntüle</p>
              </div>
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <div 
                    key={category.key}
                    className={`category-card ${selectedCategory === category.key ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category.key)}
                  >
                    <IconComponent className="category-icon" />
                    <h3 className="category-title">{category.label}</h3>
                    <p className="category-description">{category.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="faq-section">
            <h2 className="faq-title">
              <MessageCircle />
              <span>Sık Sorulan Sorular ({filteredFAQs.length})</span>
            </h2>
            
            <div className="faq-list">
              {filteredFAQs.map((faq) => (
                <div
                  key={faq.id}
                  className={`faq-item ${expandedItems.has(faq.id) ? 'active' : ''}`}
                >
                  <button
                    onClick={() => toggleExpanded(faq.id)}
                    className="faq-question"
                  >
                    <span className="faq-question-text">{faq.question}</span>
                    {expandedItems.has(faq.id) ? (
                      <ChevronUp className="faq-arrow" />
                    ) : (
                      <ChevronDown className="faq-arrow" />
                    )}
                  </button>
                  
                  {expandedItems.has(faq.id) && (
                    <div className="faq-answer">
                      <p className="faq-answer-text">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Section */}
          <div className="contact-section">
            <h2 className="contact-title">
              <Phone />
              <span>İletişim Bilgileri</span>
            </h2>
            
            <div className="contact-info">
              {contactInfo.map((contact) => (
                <div key={contact.title} className="contact-item">
                  <Mail className="contact-icon" />
                  <div className="contact-text">
                    <strong>{contact.title}</strong><br />
                    {contact.description}<br />
                    <a href={`mailto:${contact.email}`}>{contact.email}</a><br />
                    <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ModernDashboardLayout>
  );
}
