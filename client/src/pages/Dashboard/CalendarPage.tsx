import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Search, Settings } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { SecureAPI } from '../../utils/api';

import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import {
  MonthView,
  WeekView,
  DayView,
  AgendaView,
  EventModal,
  CalendarSettingsModal,
} from './calendar';
import type { CalendarEvent, Calendar, ViewType } from './calendar';
import './CalendarPage.css';

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

  // Fetch calendars and events
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch calendars
      const calendarsResponse = await SecureAPI.get('/api/calendar/calendars');
      const calendarsData = (calendarsResponse as { data: Calendar[] }).data;
      setCalendars(calendarsData);

      // Set visible calendars to all calendars initially
      const allCalendarIds = new Set(calendarsData.map((cal: Calendar) => cal.id));
      setVisibleCalendars(allCalendarIds as Set<string>);

      // Fetch events
      const eventsResponse = await SecureAPI.get('/api/calendar/events');
      const eventsData = (eventsResponse as { data: CalendarEvent[] }).data;
      setEvents(eventsData);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      setError('Takvim verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigation functions
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    switch (viewType) {
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    switch (viewType) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
    });
  };

  // Event filtering
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      !filters.search ||
      event.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      event.description?.toLowerCase().includes(filters.search.toLowerCase());

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
    const newVisible = new Set(visibleCalendars);
    if (newVisible.has(calendarId)) {
      newVisible.delete(calendarId);
    } else {
      newVisible.add(calendarId);
    }
    setVisibleCalendars(newVisible);
  };

  const handleCloseEventModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
  };

  const renderView = () => {
    switch (viewType) {
      case 'month':
        return (
          <MonthView
            currentDate={currentDate}
            filteredEvents={filteredEvents}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        );
      case 'week':
        return (
          <WeekView
            currentDate={currentDate}
            filteredEvents={filteredEvents}
            onEventClick={handleEventClick}
          />
        );
      case 'day':
        return (
          <DayView
            currentDate={currentDate}
            filteredEvents={filteredEvents}
            onEventClick={handleEventClick}
          />
        );
      case 'agenda':
        return <AgendaView filteredEvents={filteredEvents} onEventClick={handleEventClick} />;
      default:
        return (
          <MonthView
            currentDate={currentDate}
            filteredEvents={filteredEvents}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="centered-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <ModernDashboardLayout
        pageTitle="Takvim"
        breadcrumb={[
          { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
          { label: 'Takvim' },
        ]}
      >
        <div className="error-message">
          <h2>Hata</h2>
          <p>{error}</p>
          <button onClick={fetchData} className="btn-blue">
            Tekrar Dene
          </button>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout
      pageTitle="Takvim"
      breadcrumb={[{ label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` }, { label: 'Takvim' }]}
    >
      <div className="welcome-section">
        <div className="welcome-card">
          <div className="welcome-content">
            <div className="welcome-text">
              <h2>Takvim</h2>
              <p>Etkinliklerinizi takip edin ve yeni etkinlikler oluşturun.</p>
            </div>
            <div className="welcome-actions">
              <button onClick={() => setShowEventModal(true)} className="btn-blue">
                <Plus className="icon" />
                <span>Yeni Etkinlik</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="calendar-container">
          <div className="calendar-content">
            {/* Header */}
            <div className="calendar-header">
              <div className="calendar-header-left">
                <div className="calendar-navigation">
                  <button onClick={goToPrevious} className="calendar-nav-button">
                    <ChevronLeft className="icon-small" />
                  </button>
                  <button onClick={goToToday} className="calendar-today-button">
                    Bugün
                  </button>
                  <button onClick={goToNext} className="calendar-nav-button">
                    <ChevronRight className="icon-small" />
                  </button>
                  <span className="calendar-current-date">{formatDate(currentDate)}</span>
                </div>
              </div>

              <div className="calendar-header-right">
                <div className="calendar-view-buttons">
                  {(['month', 'week', 'day', 'agenda'] as ViewType[]).map((view) => (
                    <button
                      key={view}
                      className={`calendar-view-button ${viewType === view ? 'active' : ''}`}
                      onClick={() => setViewType(view)}
                    >
                      {view === 'month' && 'Ay'}
                      {view === 'week' && 'Hafta'}
                      {view === 'day' && 'Gün'}
                      {view === 'agenda' && 'Liste'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="calendar-filters">
              <div className="calendar-filters-left">
                <div className="calendar-search">
                  <Search className="calendar-search-icon" />
                  <input
                    type="text"
                    placeholder="Etkinlik ara..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="calendar-search-input"
                  />
                </div>

                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="calendar-filter-select"
                >
                  <option value="">Tüm Türler</option>
                  <option value="class">Ders</option>
                  <option value="exam">Sınav</option>
                  <option value="activity">Etkinlik</option>
                  <option value="meeting">Toplantı</option>
                  <option value="holiday">Tatil</option>
                  <option value="personal">Kişisel</option>
                  <option value="reminder">Hatırlatma</option>
                </select>

                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="calendar-filter-select"
                >
                  <option value="">Tüm Öncelikler</option>
                  <option value="low">Düşük</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yüksek</option>
                  <option value="urgent">Acil</option>
                </select>
              </div>

              <div className="calendar-filters-right">
                <button
                  onClick={() => setShowCalendarModal(true)}
                  className="calendar-settings-button"
                >
                  <Settings className="icon-small" />
                  Takvimler
                </button>
              </div>
            </div>

            {/* Calendar View */}
            <div className="calendar-view">{renderView()}</div>
          </div>
        </div>
      </div>

      <EventModal
        show={showEventModal}
        selectedEvent={selectedEvent}
        onClose={handleCloseEventModal}
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
