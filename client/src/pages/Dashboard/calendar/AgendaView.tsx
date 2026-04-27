import { motion } from 'framer-motion';
import type { CalendarEvent } from './types';
import { formatTime } from './utils';

interface AgendaViewProps {
  filteredEvents: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export default function AgendaView({ filteredEvents, onEventClick }: AgendaViewProps) {
  const sortedEvents = [...filteredEvents].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  return (
    <div className="calendar-agenda-view">
      {sortedEvents.map((event) => (
        <motion.div
          key={event.id}
          className="calendar-agenda-event"
          style={{ borderLeftColor: event.color }}
          onClick={() => onEventClick(event)}
          whileHover={{ scale: 1.02 }}
        >
          <div className="calendar-agenda-event-date">
            {new Date(event.startDate).toLocaleDateString('tr-TR', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
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
}
