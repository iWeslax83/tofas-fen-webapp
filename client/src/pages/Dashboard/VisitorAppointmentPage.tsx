import React, { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Clock, AlertCircle, XCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ModernDashboardLayout } from '../../components/ModernDashboardLayout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip, type ChipProps } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { apiClient } from '../../utils/api';
import { cn } from '../../utils/cn';

interface Appointment {
  _id: string;
  date: string;
  timeSlot: string;
  purpose: string;
  notes?: string;
  status: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  completed: 'Tamamlandı',
  cancelled: 'İptal Edildi',
};

const STATUS_TONES: Record<string, ChipProps['tone']> = {
  pending: 'default',
  approved: 'black',
  rejected: 'state',
  completed: 'outline',
  cancelled: 'default',
};

const PURPOSES = ['Okul Tanıtımı', 'Kayıt İşlemi', 'Bilgi Alma', 'Mülakat', 'Diğer'];

const selectClasses = cn(
  'w-full bg-transparent border-0 border-b border-[var(--rule)] px-1 py-2',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--state)] focus:border-b-2 focus:pb-[7px]',
  'transition-colors',
);

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}

const Field = ({ label, htmlFor, required, children }: FieldProps) => (
  <label htmlFor={htmlFor} className="flex flex-col gap-1">
    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
      {label}
      {required && <span className="text-[var(--state)] ml-1">*</span>}
    </span>
    {children}
  </label>
);

export default function VisitorAppointmentPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/appointments/my');
      setAppointments(res.data as Appointment[]);
    } catch {
      toast.error('Randevular yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const fetchSlots = async (selectedDate: string) => {
    setLoadingSlots(true);
    setTimeSlot('');
    try {
      const res = await apiClient.get(`/api/appointments/available-slots?date=${selectedDate}`);
      setAvailableSlots((res.data as { availableSlots?: string[] }).availableSlots || []);
    } catch {
      setAvailableSlots([]);
      toast.error('Müsait saatler alınırken hata oluştu');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDate(val);
    if (val) fetchSlots(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !timeSlot || !purpose) {
      setErrorMsg('Lütfen tüm gerekli alanları doldurun');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiClient.post('/api/appointments', { date, timeSlot, purpose, notes });
      setSuccessMsg('Randevu talebiniz başarıyla oluşturuldu.');
      setShowForm(false);
      setDate('');
      setTimeSlot('');
      setPurpose('');
      setNotes('');
      await fetchAppointments();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string } } };
      setErrorMsg(e2?.response?.data?.error || 'Randevu oluşturulurken hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelAppointment = async (id: string) => {
    setCancelling(id);
    try {
      await apiClient.put(`/api/appointments/my/${id}/cancel`);
      toast.success('Randevu iptal edildi');
      await fetchAppointments();
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string } } };
      toast.error(e2?.response?.data?.error || 'Randevu iptal edilirken hata oluştu');
    } finally {
      setCancelling(null);
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <ModernDashboardLayout pageTitle="Randevu Al">
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
              Belge No. {new Date().getFullYear()}/R-Z
            </div>
            <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Randevu Al</h1>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'İptal' : 'Yeni Randevu'}
          </Button>
        </header>

        {successMsg && (
          <Card contentClassName="px-4 py-2 flex items-center gap-2">
            <Chip tone="black">Bildirim</Chip>
            <span className="font-serif text-sm text-[var(--ink)] flex-1 inline-flex items-center gap-1">
              <CheckCircle size={12} />
              {successMsg}
            </span>
          </Card>
        )}

        {errorMsg && (
          <Card contentClassName="px-4 py-2 flex items-center gap-2 border-l-4 border-[var(--state)]">
            <Chip tone="state">Hata</Chip>
            <span className="font-serif text-sm text-[var(--ink)] flex-1 inline-flex items-center gap-1">
              <AlertCircle size={12} />
              {errorMsg}
            </span>
          </Card>
        )}

        {showForm && (
          <Card>
            <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center gap-2">
              <CalendarDays size={12} />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
                Yeni Randevu Talebi
              </span>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Tarih" htmlFor="apt-date" required>
                  <Input
                    id="apt-date"
                    type="date"
                    value={date}
                    onChange={handleDateChange}
                    min={minDate}
                  />
                </Field>
                <Field label="Randevu Amacı" htmlFor="apt-purpose" required>
                  <select
                    id="apt-purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className={selectClasses}
                  >
                    <option value="">Seçin…</option>
                    {PURPOSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Saat Dilimi" required>
                {!date ? (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                    Önce bir tarih seçin
                  </span>
                ) : loadingSlots ? (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                    Müsait saatler yükleniyor…
                  </span>
                ) : availableSlots.length === 0 ? (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--state)]">
                    Bu tarihte müsait saat bulunmuyor
                  </span>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {availableSlots.map((slot) => {
                      const active = timeSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setTimeSlot(slot)}
                          aria-pressed={active}
                          className={cn(
                            'h-8 px-3 text-xs font-mono uppercase tracking-wider border transition-colors flex items-center gap-1',
                            active
                              ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                              : 'bg-transparent text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]',
                          )}
                        >
                          <Clock size={10} />
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Field>

              <Field label="Ek Notlar" htmlFor="apt-notes">
                <textarea
                  id="apt-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Eklemek istediğiniz notlar…"
                  rows={3}
                  className={cn(selectClasses, 'resize-y min-h-[5rem]')}
                />
              </Field>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={submitting}
                  disabled={submitting || !date || !timeSlot || !purpose}
                >
                  Randevu Talebi Oluştur
                </Button>
              </div>
            </form>
          </Card>
        )}

        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-[var(--rule)] pb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
              Bölüm I
            </span>
            <h2 className="font-serif text-base text-[var(--ink)]">Randevularım</h2>
          </div>

          {loading ? (
            <div className="px-4 py-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
              Yükleniyor…
            </div>
          ) : appointments.length === 0 ? (
            <Card contentClassName="p-10 flex flex-col items-center text-center gap-3">
              <CalendarDays size={32} className="text-[var(--ink-dim)]" />
              <p className="font-serif text-sm text-[var(--ink-2)]">Henüz randevunuz bulunmuyor.</p>
            </Card>
          ) : (
            <Card contentClassName="p-0">
              <ul className="divide-y divide-[var(--rule)]">
                {appointments.map((apt) => (
                  <li key={apt._id} className="p-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                        <CalendarDays size={10} />
                        {new Date(apt.date).toLocaleDateString('tr-TR')} · {apt.timeSlot}
                      </div>
                      <h3 className="font-serif text-base text-[var(--ink)] mt-0.5">
                        {apt.purpose}
                      </h3>
                      {apt.notes && (
                        <p className="font-serif text-sm text-[var(--ink-2)] mt-1">{apt.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip tone={STATUS_TONES[apt.status] ?? 'default'}>
                        {STATUS_LABELS[apt.status] || apt.status}
                      </Chip>
                      {apt.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelAppointment(apt._id)}
                          disabled={cancelling === apt._id}
                          loading={cancelling === apt._id}
                          className="text-[var(--state)]"
                        >
                          <XCircle size={12} />
                          İptal Et
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>
    </ModernDashboardLayout>
  );
}
