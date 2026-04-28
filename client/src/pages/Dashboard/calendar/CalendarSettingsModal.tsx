import { Eye, EyeOff, X } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import type { Calendar } from './types';

interface CalendarSettingsModalProps {
  show: boolean;
  calendars: Calendar[];
  visibleCalendars: Set<string>;
  onToggleCalendar: (calendarId: string) => void;
  onClose: () => void;
}

export default function CalendarSettingsModal({
  show,
  calendars,
  visibleCalendars,
  onToggleCalendar,
  onClose,
}: CalendarSettingsModalProps) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <Card className="relative w-full max-w-md" contentClassName="p-0">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
              Takvim Ayarları
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:opacity-80"
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {calendars.length === 0 ? (
              <p className="font-serif text-sm text-[var(--ink-2)]">Takvim bulunamadı.</p>
            ) : (
              <ul className="divide-y divide-[var(--rule)]">
                {calendars.map((calendar) => {
                  const visible = visibleCalendars.has(calendar.id);
                  return (
                    <li key={calendar.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-block w-3 h-3 shrink-0 border border-[var(--rule)]"
                          style={{ backgroundColor: calendar.color }}
                          aria-hidden="true"
                        />
                        <span className="font-serif text-sm text-[var(--ink)] truncate">
                          {calendar.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleCalendar(calendar.id)}
                        className="text-[var(--ink-dim)] hover:text-[var(--ink)] p-1"
                        aria-label={visible ? 'Gizle' : 'Göster'}
                        aria-pressed={visible}
                      >
                        {visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex justify-end pt-2 border-t border-[var(--rule)]">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Kapat
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
