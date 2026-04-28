import { Calendar as CalendarIcon } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
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

  if (sortedEvents.length === 0) {
    return (
      <Card contentClassName="p-10 flex flex-col items-center text-center gap-3">
        <CalendarIcon size={32} className="text-[var(--ink-dim)]" />
        <p className="font-serif text-sm text-[var(--ink-2)]">Etkinlik bulunamadı</p>
      </Card>
    );
  }

  return (
    <Card contentClassName="p-0">
      <ul className="divide-y divide-[var(--rule)]">
        {sortedEvents.map((event) => (
          <li key={event.id}>
            <button
              type="button"
              onClick={() => onEventClick(event)}
              className="w-full p-4 flex items-center gap-4 text-left hover:bg-[var(--surface)] transition-colors border-l-4"
              style={{ borderLeftColor: event.color }}
            >
              <div className="min-w-[100px]">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                  {new Date(event.startDate).toLocaleDateString('tr-TR', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="font-mono text-[10px] text-[var(--ink-dim-2)]">
                  {formatTime(event.startDate)} → {formatTime(event.endDate)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-base text-[var(--ink)]">{event.title}</h3>
                {event.description && (
                  <p className="font-serif text-sm text-[var(--ink-2)] mt-0.5 truncate">
                    {event.description}
                  </p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
