import type { CalendarEvent, ViewType } from './types';
import { cn } from '../../../utils/cn';

interface MonthViewProps {
  currentDate: Date;
  filteredEvents: CalendarEvent[];
  onDayClick: (date: Date, view: ViewType) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const WEEKDAYS = ['Pzr', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

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

  const eventsForDay = (date: Date) =>
    filteredEvents.filter((e) => new Date(e.startDate).toDateString() === date.toDateString());

  return (
    <div className="border border-[var(--rule)]">
      <div className="grid grid-cols-7 bg-[var(--surface)] border-b border-[var(--rule)]">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)] text-center"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-[var(--rule)]">
        {days.map((date, i) => {
          const dayEvents = eventsForDay(date);
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = date.toDateString() === new Date().toDateString();
          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick(date, 'day')}
              className={cn(
                'min-h-[88px] bg-[var(--paper)] p-2 text-left flex flex-col gap-1',
                'hover:bg-[var(--surface)] transition-colors',
                !isCurrentMonth && 'opacity-50',
                isToday && 'border-2 border-[var(--state)]',
              )}
            >
              <span
                className={cn(
                  'font-mono text-xs',
                  isToday ? 'text-[var(--state)] font-semibold' : 'text-[var(--ink)]',
                )}
              >
                {date.getDate()}
              </span>
              <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => (
                  <span
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className="block w-full px-1 py-0.5 text-[10px] font-serif truncate text-white cursor-pointer"
                    style={{ backgroundColor: event.color }}
                  >
                    {event.title}
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className="font-mono text-[10px] text-[var(--ink-dim)]">
                    +{dayEvents.length - 3} daha
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
