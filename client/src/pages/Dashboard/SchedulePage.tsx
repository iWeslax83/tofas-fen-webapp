import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  BookOpen, 
  Plus,
  Edit,
  Trash2,
  Search,
  Filter
} from 'lucide-react';
import { ScheduleService } from '../../utils/apiService';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';

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

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ScheduleFilters>({
    date: '',
    subject: '',
    teacher: '',
    classLevel: '',
    type: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await ScheduleService.getSchedule();
      if (error) {
        setError(error);
      } else {
        setSchedule(Array.isArray(data) ? data as ScheduleItem[] : []);
      }
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError('Ders programı yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const filteredSchedule = schedule.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.teacher.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !filters.date || item.date === filters.date;
    const matchesSubject = !filters.subject || item.subject === filters.subject;
    const matchesTeacher = !filters.teacher || item.teacher === filters.teacher;
    const matchesClassLevel = !filters.classLevel || item.classLevel === filters.classLevel;
    const matchesType = !filters.type || item.type === filters.type;

    return matchesSearch && matchesDate && matchesSubject && matchesTeacher && matchesClassLevel && matchesType;
  });

  const groupedSchedule = filteredSchedule.reduce((groups, item) => {
    const date = item.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {} as Record<string, ScheduleItem[]>);

  const sortedDates = Object.keys(groupedSchedule).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'class': return 'schedule-item-type-class';
      case 'exam': return 'schedule-item-type-exam';
      case 'activity': return 'schedule-item-type-activity';
      case 'meeting': return 'schedule-item-type-meeting';
      default: return 'schedule-item-type-class';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'class': return <BookOpen className="icon-small" />;
      case 'exam': return <Edit className="icon-small" />;
      case 'activity': return <Calendar className="icon-small" />;
      case 'meeting': return <User className="icon-small" />;
      default: return <Calendar className="icon-small" />;
    }
  };

  if (loading) {
    return (
      <div className="schedule-loading">
        <div className="schedule-loading-content">
          <div className="schedule-loading-skeleton">
            <div className="schedule-loading-title"></div>
            <div className="schedule-loading-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="schedule-loading-card"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="schedule-error">
        <div className="schedule-error-content">
          <div className="schedule-error-card">
            <h2 className="schedule-error-title">Hata</h2>
            <p className="schedule-error-message">{error}</p>
            <button
              onClick={fetchSchedule}
              className="schedule-error-button"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  const breadcrumb = [
    { label: 'Ana Sayfa', path: '/' },
    { label: 'Ders Programı' }
  ];

  const headerActions = (
    <button
      onClick={() => setShowAddForm(true)}
      className="schedule-add-button"
    >
      <Plus className="icon-small" />
      Yeni Etkinlik
    </button>
  );

  return (
    <ModernDashboardLayout
      pageTitle="Ders Programı"
      breadcrumb={breadcrumb}
      customHeaderActions={headerActions}
    >
      <div className="schedule-container">
        <div className="schedule-content">
          {/* Page Description */}
          <div className="schedule-description">
            <p>Günlük ders programı ve etkinlik takvimi</p>
          </div>

        {/* Search and Filters */}
        <div className="schedule-filters">
          <div className="schedule-filters-grid">
            {/* Search */}
            <div className="schedule-filters-search">
              <div className="relative">
                <Search className="schedule-filters-search-icon" />
                <input
                  type="text"
                  placeholder="Ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="schedule-filters-input"
                />
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                className="schedule-filters-input"
              />
            </div>

            {/* Subject Filter */}
            <div>
              <select
                value={filters.subject}
                onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                className="schedule-filters-select"
              >
                <option value="">Tüm Dersler</option>
                {Array.from(new Set(schedule.map(item => item.subject))).map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            {/* Teacher Filter */}
            <div>
              <select
                value={filters.teacher}
                onChange={(e) => setFilters({ ...filters, teacher: e.target.value })}
                className="schedule-filters-select"
              >
                <option value="">Tüm Öğretmenler</option>
                {Array.from(new Set(schedule.map(item => item.teacher))).map(teacher => (
                  <option key={teacher} value={teacher}>{teacher}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="schedule-filters-select"
              >
                <option value="">Tüm Türler</option>
                <option value="class">Ders</option>
                <option value="exam">Sınav</option>
                <option value="activity">Etkinlik</option>
                <option value="meeting">Toplantı</option>
              </select>
            </div>
          </div>
        </div>

        {/* Schedule Display */}
        {sortedDates.length === 0 ? (
          <div className="schedule-empty">
            <Calendar className="schedule-empty-icon" />
            <h3 className="schedule-empty-title">Henüz etkinlik yok</h3>
            <p className="schedule-empty-description">Yeni etkinlik ekleyerek başlayın</p>
          </div>
        ) : (
          <div className="schedule-days">
            {sortedDates.map(date => (
                              <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="schedule-day-card"
                >
                  <div className="schedule-day-header">
                    <h2 className="schedule-day-title">{formatDate(date)}</h2>
                  </div>
                  
                  <div className="schedule-day-content">
                  <div className="schedule-day-events-list">
                    {groupedSchedule[date]
                      .sort((a, b) => new Date(`2000-01-01T${a.startTime}`).getTime() - new Date(`2000-01-01T${b.startTime}`).getTime())
                      .map(item => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="schedule-item"
                        >
                          <div className="schedule-item-time">
                            {/* Time */}
                            <div className="schedule-item-time-start">
                              <div className="schedule-item-time-start-label">Başlangıç</div>
                              <div className="schedule-item-time-start-value">{formatTime(item.startTime)}</div>
                              <div className="schedule-item-time-end">{formatTime(item.endTime)}</div>
                            </div>

                            {/* Divider */}
                            <div className="schedule-item-time-divider"></div>

                            {/* Content */}
                            <div className="schedule-item-content">
                              <div className="schedule-item-header">
                                <span className={`schedule-item-type ${getTypeColor(item.type)}`}>
                                  {getTypeIcon(item.type)}
                                  {item.type === 'class' ? 'Ders' : 
                                   item.type === 'exam' ? 'Sınav' : 
                                   item.type === 'activity' ? 'Etkinlik' : 
                                   item.type === 'meeting' ? 'Toplantı' : item.type}
                                </span>
                                <span className="schedule-item-subject">{item.subject}</span>
                              </div>
                              
                              <h3 className="schedule-item-title">{item.title}</h3>
                              {item.description && (
                                <p className="schedule-item-description">{item.description}</p>
                              )}
                              
                              <div className="schedule-item-meta">
                                <div className="schedule-item-meta-item">
                                  <User className="icon-small" />
                                  {item.teacher}
                                </div>
                                <div className="schedule-item-meta-item">
                                  <MapPin className="icon-small" />
                                  {item.location}
                                </div>
                                <div className="schedule-item-meta-item">
                                  <BookOpen className="icon-small" />
                                  {item.classLevel}/{item.classSection}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="schedule-item-actions">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="schedule-item-action-button"
                            >
                              <Edit className="icon-small" />
                            </button>
                            <button
                              onClick={() => {/* Handle delete */}}
                              className="schedule-item-action-button schedule-item-action-button-delete"
                            >
                              <Trash2 className="icon-small" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="schedule-modal-overlay">
            <div className="schedule-modal">
              <h2 className="schedule-modal-title">Yeni Etkinlik Ekle</h2>
              {/* Form content would go here */}
              <div className="schedule-modal-actions">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="schedule-modal-button schedule-modal-button-cancel"
                >
                  İptal
                </button>
                <button className="schedule-modal-button schedule-modal-button-save">
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </ModernDashboardLayout>
  );
}
