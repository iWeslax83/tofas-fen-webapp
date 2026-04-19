import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Users } from 'lucide-react';
import type { CalendarEvent } from './types';
import { formatTime } from './utils';

interface EventModalProps {
  show: boolean;
  selectedEvent: CalendarEvent | null;
  onClose: () => void;
}

export default function EventModal({ show, selectedEvent, onClose }: EventModalProps) {
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
            {selectedEvent ? (
              <div className="calendar-event-details">
                <h2>{selectedEvent.title}</h2>
                <div className="calendar-event-meta">
                  <div className="calendar-event-meta-item">
                    <Clock className="icon-small" />
                    {formatTime(selectedEvent.startDate)} - {formatTime(selectedEvent.endDate)}
                  </div>
                  {selectedEvent.location && (
                    <div className="calendar-event-meta-item">
                      <MapPin className="icon-small" />
                      {selectedEvent.location}
                    </div>
                  )}
                  <div className="calendar-event-meta-item">
                    <Users className="icon-small" />
                    {selectedEvent.attendees.length} katılımcı
                  </div>
                </div>
                {selectedEvent.description && (
                  <p className="calendar-event-description">{selectedEvent.description}</p>
                )}
                <div className="calendar-event-actions">
                  <button className="calendar-event-action-button">Düzenle</button>
                  <button className="calendar-event-action-button calendar-event-action-button-delete">
                    Sil
                  </button>
                </div>
              </div>
            ) : (
              <div className="calendar-event-form">
                <h2>Yeni Etkinlik</h2>
                {/* Event form would go here */}
                <div className="calendar-event-form-actions">
                  <button onClick={onClose} className="calendar-event-action-button">
                    İptal
                  </button>
                  <button className="calendar-event-action-button calendar-event-action-button-save">
                    Kaydet
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
