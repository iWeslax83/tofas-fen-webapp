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

  const eventsForDay = (date: Date) =>
    filteredEvents
      .filter((e) => new Date(e.startDate).toDateString() === date.toDateString())
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-px bg-[var(--rule)] border border-[var(--rule)]">
      {days.map((date) => {
        const dayEvents = eventsForDay(date);
        const isToday = date.toDateString() === new Date().toDateString();
        return (
          <div key={date.toISOString()} className="bg-[var(--paper)] flex flex-col">
            <div
              className={`px-2 py-2 border-b border-[var(--rule)] flex items-baseline justify-between ${
                isToday ? 'bg-[var(--state)] text-white' : 'bg-[var(--surface)]'
              }`}
            >
              <span
                className={`font-mono text-[10px] uppercase tracking-wider ${
                  isToday ? 'text-white' : 'text-[var(--ink-dim)]'
                }`}
              >
                {formatDay(date)}
              </span>
              <span
                className={`font-serif text-base ${isToday ? 'text-white' : 'text-[var(--ink)]'}`}
              >
                {date.getDate()}
              </span>
            </div>
            <div className="flex-1 p-2 space-y-1 min-h-[120px]">
              {dayEvents.length === 0 ? (
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim-2)]">
                  —
                </span>
              ) : (
                dayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onEventClick(event)}
                    className="w-full text-left p-1.5 border-l-2 hover:bg-[var(--surface)] transition-colors"
                    style={{ borderLeftColor: event.color }}
                  >
                    <div className="font-serif text-xs text-[var(--ink)] truncate">
                      {event.title}
                    </div>
                    <div className="font-mono text-[10px] text-[var(--ink-dim)]">
                      {formatTime(event.startDate)} → {formatTime(event.endDate)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
