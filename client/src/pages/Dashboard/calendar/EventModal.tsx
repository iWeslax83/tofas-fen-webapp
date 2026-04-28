import { Clock, MapPin, Users, X } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import type { CalendarEvent } from './types';
import { formatTime } from './utils';

interface EventModalProps {
  show: boolean;
  selectedEvent: CalendarEvent | null;
  onClose: () => void;
}

export default function EventModal({ show, selectedEvent, onClose }: EventModalProps) {
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
              {selectedEvent ? 'Etkinlik Detayı' : 'Yeni Etkinlik'}
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

          {selectedEvent ? (
            <div className="p-6 space-y-4">
              <h2 className="font-serif text-xl text-[var(--ink)]">{selectedEvent.title}</h2>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                  <Clock size={10} />
                  <span className="text-[var(--ink-2)]">
                    {formatTime(selectedEvent.startDate)} → {formatTime(selectedEvent.endDate)}
                  </span>
                </li>
                {selectedEvent.location && (
                  <li className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                    <MapPin size={10} />
                    <span className="text-[var(--ink-2)]">{selectedEvent.location}</span>
                  </li>
                )}
                <li className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                  <Users size={10} />
                  <span className="text-[var(--ink-2)]">
                    {selectedEvent.attendees.length} katılımcı
                  </span>
                </li>
              </ul>
              {selectedEvent.description && (
                <p className="font-serif text-sm text-[var(--ink-2)] leading-relaxed border-t border-[var(--rule)] pt-3">
                  {selectedEvent.description}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--rule)]">
                <Button variant="secondary" size="sm">
                  Düzenle
                </Button>
                <Button variant="danger" size="sm">
                  Sil
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-3">
              <p className="font-serif text-sm text-[var(--ink-2)]">
                Etkinlik formu yakında eklenecek.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Kapat
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
