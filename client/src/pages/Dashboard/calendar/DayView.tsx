import { Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import type { CalendarEvent } from './types';
import { formatTime } from './utils';

interface DayViewProps {
  currentDate: Date;
  filteredEvents: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export default function DayView({ currentDate, filteredEvents, onEventClick }: DayViewProps) {
  const dayEvents = filteredEvents
    .filter((e) => new Date(e.startDate).toDateString() === currentDate.toDateString())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return (
    <div className="space-y-3">
      <header className="px-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Bölüm
        </div>
        <h2 className="font-serif text-xl text-[var(--ink)]">
          {currentDate.toLocaleDateString('tr-TR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </h2>
      </header>

      {dayEvents.length === 0 ? (
        <Card contentClassName="p-10 flex flex-col items-center text-center gap-3">
          <CalendarIcon size={32} className="text-[var(--ink-dim)]" />
          <p className="font-serif text-sm text-[var(--ink-2)]">Bu gün için etkinlik yok</p>
        </Card>
      ) : (
        <Card contentClassName="p-0">
          <ul className="divide-y divide-[var(--rule)]">
            {dayEvents.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onEventClick(event)}
                  className="w-full p-4 flex items-start gap-4 text-left hover:bg-[var(--surface)] transition-colors border-l-4"
                  style={{ borderLeftColor: event.color }}
                >
                  <div className="min-w-[120px]">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                      {formatTime(event.startDate)}
                    </div>
                    <div className="font-mono text-[10px] text-[var(--ink-dim-2)]">
                      → {formatTime(event.endDate)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-base text-[var(--ink)]">{event.title}</h3>
                    {event.description && (
                      <p className="font-serif text-sm text-[var(--ink-2)] mt-1">
                        {event.description}
                      </p>
                    )}
                    {event.location && (
                      <div className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                        <MapPin size={10} />
                        {event.location}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
