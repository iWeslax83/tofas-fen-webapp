import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, MapPin } from 'lucide-react';
import type { CalendarEvent } from './types';
import { formatTime } from './utils';

interface DayViewProps {
  currentDate: Date;
  filteredEvents: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export default function DayView({ currentDate, filteredEvents, onEventClick }: DayViewProps) {
  const dayEvents = filteredEvents.filter((event) => {
    const eventDate = new Date(event.startDate);
    return eventDate.toDateString() === currentDate.toDateString();
  });

  return (
    <div className="calendar-day-view">
      <div className="calendar-day-header">
        <h2>
          {currentDate.toLocaleDateString('tr-TR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </h2>
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
            .map((event) => (
              <motion.div
                key={event.id}
                className="calendar-day-event"
                style={{ borderLeftColor: event.color }}
                onClick={() => onEventClick(event)}
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
}
