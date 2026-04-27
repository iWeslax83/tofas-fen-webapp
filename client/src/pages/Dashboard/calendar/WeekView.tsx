import { motion } from 'framer-motion';
import type { CalendarEvent } from './types';
import { formatTime, formatDay } from './utils';

interface WeekViewProps {
  currentDate: Date;
  filteredEvents: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export default function WeekView({ currentDate, filteredEvents, onEventClick }: WeekViewProps) {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    days.push(date);
  }

  const getEventsForDay = (date: Date) => {
    return filteredEvents.filter((event) => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  return (
    <div className="calendar-week-view">
      <div className="calendar-week-header">
        <div className="calendar-week-time-header"></div>
        {days.map((date) => (
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
        {days.map((date) => (
          <div key={date.toISOString()} className="calendar-week-day-column">
            {getEventsForDay(date).map((event) => (
              <motion.div
                key={event.id}
                className="calendar-week-event"
                style={{ backgroundColor: event.color }}
                onClick={() => onEventClick(event)}
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
}
