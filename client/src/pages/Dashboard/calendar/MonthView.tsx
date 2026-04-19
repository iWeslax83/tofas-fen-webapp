import { motion } from 'framer-motion';
import type { CalendarEvent, ViewType } from './types';

interface MonthViewProps {
  currentDate: Date;
  filteredEvents: CalendarEvent[];
  onDayClick: (date: Date, view: ViewType) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export default function MonthView({
  currentDate,
  filteredEvents,
  onDayClick,
  onEventClick,
}: MonthViewProps) {
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startDate = new Date(startOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    days.push(date);
  }

  const getEventsForDay = (date: Date) => {
    return filteredEvents.filter((event) => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  return (
    <div className="calendar-month-view">
      <div className="calendar-month-header">
        {['Pzr', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map((day) => (
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
              onClick={() => onDayClick(date, 'day')}
            >
              <div className="calendar-month-day-number">{date.getDate()}</div>
              <div className="calendar-month-day-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="calendar-month-event"
                    style={{ backgroundColor: event.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="calendar-month-more-events">+{dayEvents.length - 3} daha</div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
