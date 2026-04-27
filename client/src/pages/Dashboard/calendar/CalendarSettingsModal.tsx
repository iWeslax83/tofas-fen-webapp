import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
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
  return (
    <AnimatePresence>
      {show && (
        <div className="calendar-modal-overlay" onClick={onClose}>
          <motion.div
            className="calendar-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="calendar-settings-content">
              <h2>Takvim Ayarları</h2>
              <div className="calendar-settings-list">
                {calendars.map((calendar) => (
                  <div key={calendar.id} className="calendar-settings-item">
                    <div className="calendar-settings-item-info">
                      <div
                        className="calendar-settings-item-color"
                        style={{ backgroundColor: calendar.color }}
                      />
                      <span>{calendar.name}</span>
                    </div>
                    <button
                      onClick={() => onToggleCalendar(calendar.id)}
                      className="calendar-settings-item-toggle"
                    >
                      {visibleCalendars.has(calendar.id) ? (
                        <Eye className="icon-small" />
                      ) : (
                        <EyeOff className="icon-small" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
              <div className="calendar-settings-actions">
                <button onClick={onClose} className="calendar-event-action-button">
                  Kapat
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
