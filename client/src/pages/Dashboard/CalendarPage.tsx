import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Search, Settings } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { SecureAPI } from '../../utils/api';
import { cn } from '../../utils/cn';
import {
  MonthView,
  WeekView,
  DayView,
  AgendaView,
  EventModal,
  CalendarSettingsModal,
} from './calendar';
import type { CalendarEvent, Calendar, ViewType } from './calendar';
import { safeConsoleError } from '../../utils/safeLogger';

const VIEWS: { key: ViewType; label: string }[] = [
  { key: 'month', label: 'Ay' },
  { key: 'week', label: 'Hafta' },
  { key: 'day', label: 'Gün' },
  { key: 'agenda', label: 'Liste' },
];

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'class', label: 'Ders' },
  { value: 'exam', label: 'Sınav' },
  { value: 'activity', label: 'Etkinlik' },
  { value: 'meeting', label: 'Toplantı' },
  { value: 'holiday', label: 'Tatil' },
  { value: 'personal', label: 'Kişisel' },
  { value: 'reminder', label: 'Hatırlatma' },
];

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'low', label: 'Düşük' },
  { value: 'medium', label: 'Orta' },
  { value: 'high', label: 'Yüksek' },
  { value: 'urgent', label: 'Acil' },
];

const selectClasses = cn(
  'h-10 bg-transparent border-0 border-b border-[var(--rule)] px-1 text-sm',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--state)] focus:border-b-2',
  'transition-colors',
);

export default function CalendarPage() {
  const { user } = useAuthContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    priority: '',
    calendarId: '',
    showCompleted: false,
  });
  const [visibleCalendars, setVisibleCalendars] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const calendarsResponse = await SecureAPI.get('/api/calendar/calendars');
      const calendarsData = (calendarsResponse as { data: Calendar[] }).data;
      setCalendars(calendarsData);
      setVisibleCalendars(new Set(calendarsData.map((c) => c.id)));

      const eventsResponse = await SecureAPI.get('/api/calendar/events');
      const eventsData = (eventsResponse as { data: CalendarEvent[] }).data;
      setEvents(eventsData);
    } catch (err) {
      safeConsoleError('Error fetching calendar data:', err);
      setError('Takvim verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else if (viewType === 'week') newDate.setDate(newDate.getDate() - 7);
    else if (viewType === 'day') newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else if (viewType === 'week') newDate.setDate(newDate.getDate() + 7);
    else if (viewType === 'day') newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const formatDate = (date: Date) =>
    date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });

  const filteredEvents = events.filter((event) => {
    const q = filters.search.toLowerCase();
    const matchesSearch =
      !q || event.title.toLowerCase().includes(q) || event.description?.toLowerCase().includes(q);
    const matchesType = !filters.type || event.type === filters.type;
    const matchesPriority = !filters.priority || event.priority === filters.priority;
    const matchesCalendar = !filters.calendarId || event.calendarId === filters.calendarId;
    const matchesStatus = filters.showCompleted || event.status !== 'completed';
    const isVisible = visibleCalendars.has(event.calendarId);
    return (
      matchesSearch &&
      matchesType &&
      matchesPriority &&
      matchesCalendar &&
      matchesStatus &&
      isVisible
    );
  });

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleDayClick = (date: Date, view: ViewType) => {
    setCurrentDate(date);
    setViewType(view);
  };

  const handleToggleCalendar = (calendarId: string) => {
    setVisibleCalendars((prev) => {
      const next = new Set(prev);
      if (next.has(calendarId)) next.delete(calendarId);
      else next.add(calendarId);
      return next;
    });
  };

  const renderView = () => {
    if (viewType === 'month') {
      return (
        <MonthView
          currentDate={currentDate}
          filteredEvents={filteredEvents}
          onDayClick={handleDayClick}
          onEventClick={handleEventClick}
        />
      );
    }
    if (viewType === 'week') {
      return (
        <WeekView
          currentDate={currentDate}
          filteredEvents={filteredEvents}
          onEventClick={handleEventClick}
        />
      );
    }
    if (viewType === 'day') {
      return (
        <DayView
          currentDate={currentDate}
          filteredEvents={filteredEvents}
          onEventClick={handleEventClick}
        />
      );
    }
    return <AgendaView filteredEvents={filteredEvents} onEventClick={handleEventClick} />;
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Takvim' },
  ];

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Takvim" breadcrumb={breadcrumb}>
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  if (error) {
    return (
      <ModernDashboardLayout pageTitle="Takvim" breadcrumb={breadcrumb}>
        <div className="p-6 max-w-xl">
          <Card contentClassName="px-4 py-3 flex items-center gap-2 border-l-4 border-[var(--state)]">
            <Chip tone="state">Hata</Chip>
            <span className="font-serif text-sm text-[var(--ink)] flex-1">{error}</span>
            <Button variant="secondary" size="sm" onClick={fetchData}>
              Tekrar Dene
            </Button>
          </Card>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Takvim" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
              Belge No. {new Date().getFullYear()}/T-K
            </div>
            <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Takvim</h1>
            <p className="font-serif text-sm text-[var(--ink-2)] mt-1">
              Etkinliklerinizi takip edin ve yeni etkinlikler oluşturun.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowEventModal(true)}>
            <Plus size={14} />
            Yeni Etkinlik
          </Button>
        </header>

        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[var(--rule)] pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPrevious}
              className="p-2 text-[var(--ink-dim)] hover:text-[var(--ink)] border border-[var(--rule)] hover:border-[var(--ink)] transition-colors"
              aria-label="Önceki"
            >
              <ChevronLeft size={14} />
            </button>
            <Button variant="secondary" size="sm" onClick={goToToday}>
              Bugün
            </Button>
            <button
              type="button"
              onClick={goToNext}
              className="p-2 text-[var(--ink-dim)] hover:text-[var(--ink)] border border-[var(--rule)] hover:border-[var(--ink)] transition-colors"
              aria-label="Sonraki"
            >
              <ChevronRight size={14} />
            </button>
            <span className="ml-2 font-serif text-base text-[var(--ink)]">
              {formatDate(currentDate)}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {VIEWS.map((v) => {
              const active = viewType === v.key;
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setViewType(v.key)}
                  className={cn(
                    'h-8 px-3 text-xs font-mono uppercase tracking-wider border transition-colors',
                    active
                      ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                      : 'bg-transparent text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]',
                  )}
                  aria-pressed={active}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={12}
              className="absolute left-1 top-1/2 -translate-y-1/2 text-[var(--ink-dim)] pointer-events-none"
            />
            <Input
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Etkinlik ara…"
              className="pl-5"
            />
          </div>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className={cn(selectClasses, 'min-w-[120px]')}
            aria-label="Tür filtrele"
          >
            <option value="">Tüm Türler</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className={cn(selectClasses, 'min-w-[120px]')}
            aria-label="Öncelik filtrele"
          >
            <option value="">Tüm Öncelikler</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={() => setShowCalendarModal(true)}>
            <Settings size={14} />
            Takvimler
          </Button>
        </div>

        {renderView()}
      </div>

      <EventModal
        show={showEventModal}
        selectedEvent={selectedEvent}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
        }}
      />

      <CalendarSettingsModal
        show={showCalendarModal}
        calendars={calendars}
        visibleCalendars={visibleCalendars}
        onToggleCalendar={handleToggleCalendar}
        onClose={() => setShowCalendarModal(false)}
      />
    </ModernDashboardLayout>
  );
}
