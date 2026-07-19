import { useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Chip } from '../../components/ui/Chip';
import { cn } from '../../utils/cn';
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
  Search,
} from 'lucide-react';

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
    answer:
      'Ana sayfadaki giriş formunu kullanarak e-posta adresiniz ve şifrenizle giriş yapabilirsiniz. Şifrenizi unuttuysanız "Şifremi Unuttum" linkini kullanabilirsiniz.',
    category: 'giris',
  },
  {
    id: '2',
    question: 'Şifremi nasıl değiştirebilirim?',
    answer:
      'Şifre değiştirme özelliği kaldırılmıştır. Sistem artık T.C. Kimlik Numarası (TCKN) ile giriş yapmaktadır.',
    category: 'hesap',
  },
  {
    id: '3',
    question: 'Ödevlerimi nasıl takip edebilirim?',
    answer:
      'Dashboard\'da "Ödevler" butonuna tıklayarak tüm ödevlerinizi görüntüleyebilir, teslim tarihlerini takip edebilir ve durumlarını kontrol edebilirsiniz.',
    category: 'odevler',
  },
  {
    id: '4',
    question: 'Ders programımı nasıl görüntüleyebilirim?',
    answer:
      'Ana sayfada "Ders Programı" butonuna tıklayarak haftalık ders programınızı görüntüleyebilir ve ders saatlerini takip edebilirsiniz.',
    category: 'ders-programi',
  },
  {
    id: '5',
    question: 'Duyuruları nasıl takip edebilirim?',
    answer:
      'Dashboard\'da "Duyurular" bölümünden okul yönetimi tarafından yayınlanan tüm duyuruları takip edebilirsiniz.',
    category: 'duyurular',
  },
  {
    id: '6',
    question: 'Kulüplere nasıl katılabilirim?',
    answer:
      'Kulüpler sayfasından mevcut kulüpleri görüntüleyebilir ve katılmak istediğiniz kulübe başvuru yapabilirsiniz.',
    category: 'kulup',
  },
  {
    id: '7',
    question: 'Teknik destek için kime başvurabilirim?',
    answer:
      'Teknik sorunlar için IT departmanına e-posta gönderebilir veya aşağıdaki iletişim bilgilerini kullanabilirsiniz.',
    category: 'destek',
  },
  {
    id: '8',
    question: 'Mobil uygulamayı nasıl indirebilirim?',
    answer:
      "Mobil uygulama henüz geliştirme aşamasındadır. Yakında App Store ve Google Play'de yayınlanacaktır.",
    category: 'mobil',
  },
];

const categories = [
  {
    key: 'giris',
    label: 'Giriş ve Hesap',
    icon: Users,
    description: 'Hesap yönetimi ve giriş işlemleri',
  },
  {
    key: 'odevler',
    label: 'Ödevler',
    icon: BookOpen,
    description: 'Ödev takibi ve teslim işlemleri',
  },
  {
    key: 'ders-programi',
    label: 'Ders Programı',
    icon: FileText,
    description: 'Haftalık ders programı',
  },
  { key: 'duyurular', label: 'Duyurular', icon: MessageCircle, description: 'Okul duyuruları' },
  { key: 'kulup', label: 'Kulüpler', icon: Users, description: 'Kulüp faaliyetleri' },
  { key: 'destek', label: 'Teknik Destek', icon: Settings, description: 'Teknik sorunlar' },
  { key: 'mobil', label: 'Mobil Uygulama', icon: Phone, description: 'Mobil erişim' },
];

const contactInfo = [
  {
    title: 'IT Destek',
    email: 'it@tofas.edu.tr',
    phone: '+90 224 123 45 67',
    description: 'Teknik sorunlar için',
  },
  {
    title: 'Öğrenci İşleri',
    email: 'ogrenci@tofas.edu.tr',
    phone: '+90 224 123 45 68',
    description: 'Öğrenci belgeleri ve işlemleri',
  },
  {
    title: 'Genel Sekreterlik',
    email: 'sekreter@tofas.edu.tr',
    phone: '+90 224 123 45 69',
    description: 'Genel bilgi ve yönlendirme',
  },
];

export default function HelpPage() {
  const { user } = useAuthContext();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredFAQs = faqData.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      faq.question.toLowerCase().includes(term) || faq.answer.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  return (
    <ModernDashboardLayout
      pageTitle="Yardım Merkezi"
      breadcrumb={[
        { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
        { label: 'Yardım Merkezi' },
      ]}
    >
      <div className="p-6 space-y-8">
        <header>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Yardım Merkezi</h1>
          <p className="font-serif text-sm text-[var(--ink-2)] mt-1">
            Sık sorulan sorular ve destek bilgileri
          </p>
        </header>

        {/* Search */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-serif text-lg text-[var(--ink)]">
            <HelpCircle size={18} className="text-[var(--ink-dim)]" />
            Soru Ara
          </h2>
          <div className="relative max-w-lg">
            <Search
              size={16}
              className="absolute left-1 top-1/2 -translate-y-1/2 text-[var(--ink-dim)]"
            />
            <Input
              type="text"
              placeholder="Aradığınız soruyu yazın…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-6"
            />
          </div>
        </section>

        {/* Categories */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-serif text-lg text-[var(--ink)]">
            <BookOpen size={18} className="text-[var(--ink-dim)]" />
            Kategoriler
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--rule)] border border-[var(--rule)] rounded-[var(--radius)] overflow-hidden">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'text-left bg-[var(--paper)] p-4 flex items-start gap-3 transition-colors hover:bg-[var(--surface)]',
                selectedCategory === 'all' &&
                  'bg-[var(--surface)] border-l-4 border-l-[var(--accent)]',
              )}
            >
              <HelpCircle size={18} className="text-[var(--accent)] shrink-0 mt-0.5" />
              <div>
                <div className="font-serif text-sm text-[var(--ink)]">Tüm Kategoriler</div>
                <div className="text-xs font-medium text-[var(--ink-dim)] mt-0.5">
                  Tüm soruları görüntüle
                </div>
              </div>
            </button>
            {categories.map((category) => {
              const IconComponent = category.icon;
              const active = selectedCategory === category.key;
              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setSelectedCategory(category.key)}
                  className={cn(
                    'text-left bg-[var(--paper)] p-4 flex items-start gap-3 transition-colors hover:bg-[var(--surface)]',
                    active && 'bg-[var(--surface)] border-l-4 border-l-[var(--accent)]',
                  )}
                >
                  <IconComponent size={18} className="text-[var(--accent)] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-serif text-sm text-[var(--ink)]">{category.label}</div>
                    <div className="text-xs font-medium text-[var(--ink-dim)] mt-0.5">
                      {category.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-serif text-lg text-[var(--ink)]">
            <MessageCircle size={18} className="text-[var(--ink-dim)]" />
            Sık Sorulan Sorular
            <Chip tone="default">{filteredFAQs.length}</Chip>
          </h2>

          <Card contentClassName="p-0">
            {filteredFAQs.length === 0 ? (
              <div className="p-8 text-center font-serif text-sm text-[var(--ink-dim)]">
                Aramanızla eşleşen bir soru bulunamadı.
              </div>
            ) : (
              <div className="divide-y divide-[var(--rule)]">
                {filteredFAQs.map((faq) => {
                  const isOpen = expandedItems.has(faq.id);
                  return (
                    <div key={faq.id}>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(faq.id)}
                        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface)] transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="font-serif text-sm text-[var(--ink)]">{faq.question}</span>
                        <ChevronDown
                          size={16}
                          className={cn(
                            'text-[var(--ink-dim)] transition-transform shrink-0',
                            isOpen && 'rotate-180',
                          )}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4">
                          <p className="font-serif text-sm text-[var(--ink-2)] leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </section>

        {/* Contact */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-serif text-lg text-[var(--ink)]">
            <Phone size={18} className="text-[var(--ink-dim)]" />
            İletişim Bilgileri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--rule)] border border-[var(--rule)] rounded-[var(--radius)] overflow-hidden">
            {contactInfo.map((contact) => (
              <div key={contact.title} className="bg-[var(--paper)] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-[var(--accent)] shrink-0" />
                  <span className="font-serif text-sm text-[var(--ink)]">{contact.title}</span>
                </div>
                <p className="text-xs font-medium text-[var(--ink-dim)]">{contact.description}</p>
                <div className="space-y-1 pt-1">
                  <a
                    href={`mailto:${contact.email}`}
                    className="block text-sm text-[var(--ink-2)] hover:text-[var(--accent)] transition-colors"
                  >
                    {contact.email}
                  </a>
                  <a
                    href={`tel:${contact.phone}`}
                    className="block font-mono text-xs text-[var(--ink-dim)] hover:text-[var(--accent)] transition-colors"
                  >
                    {contact.phone}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ModernDashboardLayout>
  );
}
