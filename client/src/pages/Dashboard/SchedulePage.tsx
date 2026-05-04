import { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPin, User, BookOpen, Plus, Edit, Trash2, Search, X } from 'lucide-react';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip, type ChipProps } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { ScheduleService } from '../../utils/apiService';
import { cn } from '../../utils/cn';
import { safeConsoleError } from '../../utils/safeLogger';

interface ScheduleItem {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  location: string;
  teacher: string;
  subject: string;
  classLevel: string;
  classSection: string;
  type: 'class' | 'exam' | 'activity' | 'meeting';
  isRecurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
}

interface ScheduleFilters {
  date: string;
  subject: string;
  teacher: string;
  classLevel: string;
  type: string;
}

type ScheduleType = ScheduleItem['type'];

const TYPE_LABELS: Record<ScheduleType, string> = {
  class: 'Ders',
  exam: 'Sınav',
  activity: 'Etkinlik',
  meeting: 'Toplantı',
};

const TYPE_TONES: Record<ScheduleType, ChipProps['tone']> = {
  class: 'default',
  exam: 'state',
  activity: 'outline',
  meeting: 'black',
};

const TYPE_ICONS: Record<
  ScheduleType,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  class: BookOpen,
  exam: Edit,
  activity: Calendar,
  meeting: User,
};

const selectClasses = cn(
  'h-10 bg-transparent border-0 border-b border-[var(--rule)] px-1 text-sm',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--state)] focus:border-b-2',
  'transition-colors',
);

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ScheduleFilters>({
    date: '',
    subject: '',
    teacher: '',
    classLevel: '',
    type: '',
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: apiError } = await ScheduleService.getSchedule();
      if (apiError) {
        setError(apiError);
      } else {
        setSchedule(Array.isArray(data) ? (data as ScheduleItem[]) : []);
      }
    } catch (err) {
      safeConsoleError('Error fetching schedule:', err);
      setError('Ders programı yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const filtered = useMemo(
    () =>
      schedule.filter((item) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !q ||
          item.title.toLowerCase().includes(q) ||
          item.subject.toLowerCase().includes(q) ||
          item.teacher.toLowerCase().includes(q);
        return (
          matchesSearch &&
          (!filters.date || item.date === filters.date) &&
          (!filters.subject || item.subject === filters.subject) &&
          (!filters.teacher || item.teacher === filters.teacher) &&
          (!filters.classLevel || item.classLevel === filters.classLevel) &&
          (!filters.type || item.type === filters.type)
        );
      }),
    [schedule, filters, searchTerm],
  );

  const grouped = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {};
    filtered.forEach((item) => {
      (map[item.date] = map[item.date] || []).push(item);
    });
    return map;
  }, [filtered]);

  const sortedDates = useMemo(
    () => Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
    [grouped],
  );

  const formatTime = (time: string) =>
    new Date(`2000-01-01T${time}`).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const breadcrumb = [{ label: 'Ana Sayfa', path: '/' }, { label: 'Ders Programı' }];

  const subjects = useMemo(
    () => Array.from(new Set(schedule.map((s) => s.subject))).filter(Boolean),
    [schedule],
  );
  const teachers = useMemo(
    () => Array.from(new Set(schedule.map((s) => s.teacher))).filter(Boolean),
    [schedule],
  );

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Ders Programı" breadcrumb={breadcrumb}>
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  if (error) {
    return (
      <ModernDashboardLayout pageTitle="Ders Programı" breadcrumb={breadcrumb}>
        <div className="p-6 max-w-xl">
          <Card contentClassName="px-4 py-3 flex items-center gap-2 border-l-4 border-[var(--state)]">
            <Chip tone="state">Hata</Chip>
            <span className="font-serif text-sm text-[var(--ink)] flex-1">{error}</span>
            <Button variant="secondary" size="sm" onClick={fetchSchedule}>
              Tekrar Dene
            </Button>
          </Card>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Ders Programı" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
              Belge No. {new Date().getFullYear()}/D-S
            </div>
            <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Ders Programı</h1>
            <p className="font-serif text-sm text-[var(--ink-2)] mt-1">
              Günlük ders programı ve etkinlik takvimi
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowAddForm(true)}>
            <Plus size={14} />
            Yeni Etkinlik
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-1 top-1/2 -translate-y-1/2 text-[var(--ink-dim)] pointer-events-none"
            />
            <Input
              placeholder="Ara…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-5"
            />
          </div>
          <Input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            aria-label="Tarih filtrele"
          />
          <select
            value={filters.subject}
            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
            className={selectClasses}
            aria-label="Ders filtrele"
          >
            <option value="">Tüm Dersler</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filters.teacher}
            onChange={(e) => setFilters({ ...filters, teacher: e.target.value })}
            className={selectClasses}
            aria-label="Öğretmen filtrele"
          >
            <option value="">Tüm Öğretmenler</option>
            {teachers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className={selectClasses}
            aria-label="Tür filtrele"
          >
            <option value="">Tüm Türler</option>
            {(Object.keys(TYPE_LABELS) as ScheduleType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {sortedDates.length === 0 ? (
          <Card contentClassName="p-10 flex flex-col items-center text-center gap-3">
            <Calendar size={40} className="text-[var(--ink-dim)]" />
            <h3 className="font-serif text-lg text-[var(--ink)]">Henüz etkinlik yok</h3>
            <p className="font-serif text-sm text-[var(--ink-2)]">
              Yeni etkinlik ekleyerek başlayın.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date) => (
              <Card key={date} contentClassName="p-0">
                <div className="px-4 py-2 border-b border-[var(--rule)] flex items-center gap-2">
                  <Calendar size={12} className="text-[var(--ink-dim)]" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
                    Bölüm
                  </span>
                  <h2 className="font-serif text-base text-[var(--ink)]">{formatDate(date)}</h2>
                </div>
                <ul className="divide-y divide-[var(--rule)]">
                  {grouped[date]
                    .sort(
                      (a, b) =>
                        new Date(`2000-01-01T${a.startTime}`).getTime() -
                        new Date(`2000-01-01T${b.startTime}`).getTime(),
                    )
                    .map((item) => {
                      const Icon = TYPE_ICONS[item.type];
                      return (
                        <li key={item.id} className="p-4 flex items-start gap-4 flex-wrap">
                          <div className="flex flex-col items-center text-center min-w-[64px]">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                              Başlangıç
                            </span>
                            <span className="font-serif text-base text-[var(--ink)]">
                              {formatTime(item.startTime)}
                            </span>
                            <span className="font-mono text-[10px] text-[var(--ink-dim)] mt-0.5">
                              → {formatTime(item.endTime)}
                            </span>
                          </div>

                          <div className="border-l border-[var(--rule)] self-stretch" />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Chip tone={TYPE_TONES[item.type]}>
                                <Icon size={10} />
                                {TYPE_LABELS[item.type]}
                              </Chip>
                              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                                {item.subject}
                              </span>
                            </div>
                            <h3 className="font-serif text-base text-[var(--ink)]">{item.title}</h3>
                            {item.description && (
                              <p className="font-serif text-sm text-[var(--ink-2)] mt-1">
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 flex-wrap text-xs">
                              <span className="inline-flex items-center gap-1 text-[var(--ink-dim)]">
                                <User size={10} />
                                {item.teacher}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[var(--ink-dim)]">
                                <MapPin size={10} />
                                {item.location}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[var(--ink-dim)]">
                                <BookOpen size={10} />
                                {item.classLevel}/{item.classSection}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="text-[var(--ink-dim)] hover:text-[var(--ink)] p-1"
                              aria-label="Düzenle"
                              title="Düzenle"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              className="text-[var(--ink-dim)] hover:text-[var(--state)] p-1"
                              aria-label="Sil"
                              title="Sil"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showAddForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowAddForm(false)}
          role="presentation"
        >
          <Card className="relative w-full max-w-md" contentClassName="p-0">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
                  Yeni Etkinlik Ekle
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-white hover:opacity-80"
                  aria-label="Kapat"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-3">
                <p className="font-serif text-sm text-[var(--ink-2)]">
                  Etkinlik formu yakında eklenecek.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                    Kapat
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </ModernDashboardLayout>
  );
}
