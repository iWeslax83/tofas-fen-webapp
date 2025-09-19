import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Search,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { SecureAPI } from '../../utils/api';
import BackButton from '../../components/BackButton';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import './CalendarPage.css';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string;
  type: 'class' | 'exam' | 'activity' | 'meeting' | 'holiday' | 'personal' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  color: string;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
    endAfter?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    monthOfYear?: number;
  };
  reminders: {
    type: 'email' | 'push' | 'sms';
    minutesBefore: number;
    sent: boolean;
  }[];
  attendees: {
    userId: string;
    role: 'organizer' | 'attendee' | 'optional';
    response: 'accepted' | 'declined' | 'pending' | 'tentative';
    user?: {
      adSoyad: string;
      email: string;
    };
  }[];
  resources?: {
    room?: string;
    equipment?: string[];
    materials?: string[];
  };
  tags: string[];
  isPublic: boolean;
  allowedRoles: string[];
  createdBy: string;
  calendarId: string;
  parentEventId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Calendar {
  id: string;
  name: string;
  description?: string;
  color: string;
  isDefault: boolean;
  isPublic: boolean;
  allowedRoles: string[];
  ownerId: string;
  sharedWith: {
    userId: string;
    permission: 'read' | 'write' | 'admin';
  }[];
  settings: {
    defaultView: 'month' | 'week' | 'day' | 'agenda';
    defaultReminder: number;
    workingHours: {
      start: string;
      end: string;
      days: number[];
    };
    timezone: string;
  };
  createdAt: string;
  updatedAt: string;
}

type ViewType = 'month' | 'week' | 'day' | 'agenda';

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
    showCompleted: false
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

  // Date formatting functions
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDay = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      weekday: 'short',
      day: 'numeric'
    });
  };

  // Event filtering
  const filteredEvents = events.filter(event => {
    const matchesSearch = !filters.search || 
      event.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      event.description?.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesType = !filters.type || event.type === filters.type;
    const matchesPriority = !filters.priority || event.priority === filters.priority;
    const matchesCalendar = !filters.calendarId || event.calendarId === filters.calendarId;
    const matchesStatus = filters.showCompleted || event.status !== 'completed';
    const isVisible = visibleCalendars.has(event.calendarId);

    return matchesSearch && matchesType && matchesPriority && matchesCalendar && matchesStatus && isVisible;
  });

  // Calendar view components
  const MonthView = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    // const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0); // Not used
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }

    const getEventsForDay = (date: Date) => {
      return filteredEvents.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate.toDateString() === date.toDateString();
      });
    };

    return (
      <div className="calendar-month-view">
        <div className="calendar-month-header">
          {['Pzr', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map(day => (
            <div key={day} className="calendar-month-day-header">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-month-grid">
          {days.map((date, index) => {
            const dayEvents = getEventsForDay(date);
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <motion.div
                key={index}
                className={`calendar-month-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  setCurrentDate(date);
                  setViewType('day');
                }}
              >
                <div className="calendar-month-day-number">{date.getDate()}</div>
                <div className="calendar-month-day-events">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className="calendar-month-event"
                      style={{ backgroundColor: event.color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                        setShowEventModal(true);
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="calendar-month-more-events">
                      +{dayEvents.length - 3} daha
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  const WeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }

    const getEventsForDay = (date: Date) => {
      return filteredEvents.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate.toDateString() === date.toDateString();
      });
    };

    return (
      <div className="calendar-week-view">
        <div className="calendar-week-header">
          <div className="calendar-week-time-header"></div>
          {days.map(date => (
            <div key={date.toISOString()} className="calendar-week-day-header">
              <div className="calendar-week-day-name">{formatDay(date)}</div>
              <div className="calendar-week-day-number">{date.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="calendar-week-grid">
          <div className="calendar-week-time-column">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="calendar-week-time-slot">
                {i}:00
              </div>
            ))}
          </div>
          {days.map(date => (
            <div key={date.toISOString()} className="calendar-week-day-column">
              {getEventsForDay(date).map(event => (
                <motion.div
                  key={event.id}
                  className="calendar-week-event"
                  style={{ backgroundColor: event.color }}
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowEventModal(true);
                  }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="calendar-week-event-title">{event.title}</div>
                  <div className="calendar-week-event-time">
                    {formatTime(event.startDate)} - {formatTime(event.endDate)}
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const DayView = () => {
    const dayEvents = filteredEvents.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === currentDate.toDateString();
    });

    return (
      <div className="calendar-day-view">
        <div className="calendar-day-header">
          <h2>{currentDate.toLocaleDateString('tr-TR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</h2>
        </div>
        <div className="calendar-day-events">
          {dayEvents.length === 0 ? (
            <div className="calendar-day-empty">
              <CalendarIcon className="calendar-day-empty-icon" />
              <p>Bu gün için etkinlik yok</p>
            </div>
          ) : (
            dayEvents
              .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
              .map(event => (
                <motion.div
                  key={event.id}
                  className="calendar-day-event"
                  style={{ borderLeftColor: event.color }}
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowEventModal(true);
                  }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="calendar-day-event-time">
                    {formatTime(event.startDate)} - {formatTime(event.endDate)}
                  </div>
                  <div className="calendar-day-event-content">
                    <h3>{event.title}</h3>
                    {event.description && <p>{event.description}</p>}
                    {event.location && (
                      <div className="calendar-day-event-location">
                        <MapPin className="icon-small" />
                        {event.location}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
          )}
        </div>
      </div>
    );
  };

  const AgendaView = () => {
    const sortedEvents = filteredEvents
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    return (
      <div className="calendar-agenda-view">
        {sortedEvents.map(event => (
          <motion.div
            key={event.id}
            className="calendar-agenda-event"
            style={{ borderLeftColor: event.color }}
            onClick={() => {
              setSelectedEvent(event);
              setShowEventModal(true);
            }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="calendar-agenda-event-date">
              {new Date(event.startDate).toLocaleDateString('tr-TR', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </div>
            <div className="calendar-agenda-event-time">
              {formatTime(event.startDate)} - {formatTime(event.endDate)}
            </div>
            <div className="calendar-agenda-event-content">
              <h3>{event.title}</h3>
              {event.description && <p>{event.description}</p>}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // Render current view
  const renderView = () => {
    switch (viewType) {
      case 'month':
        return <MonthView />;
      case 'week':
        return <WeekView />;
      case 'day':
        return <DayView />;
      case 'agenda':
        return <AgendaView />;
      default:
        return <MonthView />;
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
          { label: 'Takvim' }
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
      breadcrumb={[
        { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
        { label: 'Takvim' }
      ]}
    >
      <div className="welcome-section">
        <BackButton />
        <div className="welcome-card">
          <div className="welcome-content">
            <div className="welcome-text">
              <h2>Takvim</h2>
              <p>Etkinliklerinizi takip edin ve yeni etkinlikler oluşturun.</p>
            </div>
            <div className="welcome-actions">
              <button
                onClick={() => setShowEventModal(true)}
                className="btn-blue"
              >
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
                  {(['month', 'week', 'day', 'agenda'] as ViewType[]).map(view => (
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
            <div className="calendar-view">
              {renderView()}
            </div>
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <div className="calendar-modal-overlay" onClick={() => setShowEventModal(false)}>
            <motion.div
              className="calendar-modal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              {selectedEvent ? (
                <div className="calendar-event-details">
                  <h2>{selectedEvent.title}</h2>
                  <div className="calendar-event-meta">
                    <div className="calendar-event-meta-item">
                      <Clock className="icon-small" />
                      {formatTime(selectedEvent.startDate)} - {formatTime(selectedEvent.endDate)}
                    </div>
                    {selectedEvent.location && (
                      <div className="calendar-event-meta-item">
                        <MapPin className="icon-small" />
                        {selectedEvent.location}
                      </div>
                    )}
                    <div className="calendar-event-meta-item">
                      <Users className="icon-small" />
                      {selectedEvent.attendees.length} katılımcı
                    </div>
                  </div>
                  {selectedEvent.description && (
                    <p className="calendar-event-description">{selectedEvent.description}</p>
                  )}
                  <div className="calendar-event-actions">
                    <button className="calendar-event-action-button">Düzenle</button>
                    <button className="calendar-event-action-button calendar-event-action-button-delete">Sil</button>
                  </div>
                </div>
              ) : (
                <div className="calendar-event-form">
                  <h2>Yeni Etkinlik</h2>
                  {/* Event form would go here */}
                  <div className="calendar-event-form-actions">
                    <button
                      onClick={() => setShowEventModal(false)}
                      className="calendar-event-action-button"
                    >
                      İptal
                    </button>
                    <button className="calendar-event-action-button calendar-event-action-button-save">
                      Kaydet
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Calendar Settings Modal */}
      <AnimatePresence>
        {showCalendarModal && (
          <div className="calendar-modal-overlay" onClick={() => setShowCalendarModal(false)}>
            <motion.div
              className="calendar-modal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="calendar-settings-content">
                <h2>Takvim Ayarları</h2>
                <div className="calendar-settings-list">
                  {calendars.map(calendar => (
                    <div key={calendar.id} className="calendar-settings-item">
                      <div className="calendar-settings-item-info">
                        <div
                          className="calendar-settings-item-color"
                          style={{ backgroundColor: calendar.color }}
                        />
                        <span>{calendar.name}</span>
                      </div>
                      <button
                        onClick={() => {
                          const newVisible = new Set(visibleCalendars);
                          if (newVisible.has(calendar.id)) {
                            newVisible.delete(calendar.id);
                          } else {
                            newVisible.add(calendar.id);
                          }
                          setVisibleCalendars(newVisible);
                        }}
                        className="calendar-settings-item-toggle"
                      >
                        {visibleCalendars.has(calendar.id) ? (
                          <Eye className="icon-small" />
                        ) : (
                          <EyeOff className="icon-small" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="calendar-settings-actions">
                  <button
                    onClick={() => setShowCalendarModal(false)}
                    className="calendar-event-action-button"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModernDashboardLayout>
  );
}
