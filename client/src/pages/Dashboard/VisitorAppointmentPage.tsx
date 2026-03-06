import React, { useState, useEffect, useCallback } from 'react';
import { ModernDashboardLayout } from '../../components/ModernDashboardLayout';
import { apiClient } from '../../utils/api';
import { CalendarDays, Clock, Check, AlertCircle } from 'lucide-react';

interface Appointment {
  _id: string;
  date: string;
  timeSlot: string;
  purpose: string;
  notes?: string;
  status: string;
  createdAt: string;
}

const statusLabels: Record<string, string> = {
  pending: 'Beklemede',
  approved: 'Onaylandi',
  rejected: 'Reddedildi',
  completed: 'Tamamlandi',
  cancelled: 'Iptal Edildi'
};

const statusColors: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  completed: '#6b7280',
  cancelled: '#9ca3af'
};

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
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/appointments/my');
      setAppointments(res.data as Appointment[]);
    } catch {
      // error
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
      setAvailableSlots((res.data as any).availableSlots || []);
    } catch {
      setAvailableSlots([]);
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
      setErrorMsg('Lutfen tum gerekli alanlari doldurun');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await apiClient.post('/api/appointments', { date, timeSlot, purpose, notes });
      setSuccessMsg('Randevu talebiniz basariyla olusturuldu!');
      setShowForm(false);
      setDate('');
      setTimeSlot('');
      setPurpose('');
      setNotes('');
      await fetchAppointments();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || 'Randevu olusturulurken hata olustu');
    } finally {
      setSubmitting(false);
    }
  };

  // Min date: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <ModernDashboardLayout pageTitle="Randevu Al">
      <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CalendarDays size={28} />
            <h1 style={{ margin: 0, fontSize: 24 }}>Randevu Al</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{
            padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 14
          }}>
            {showForm ? 'Iptal' : 'Yeni Randevu'}
          </button>
        </div>

        {successMsg && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={16} /> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* New Appointment Form */}
        {showForm && (
          <form onSubmit={handleSubmit} style={{
            background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24,
            border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>Yeni Randevu Talebi</h2>

            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Tarih *
                </label>
                <input type="date" value={date} onChange={handleDateChange} min={minDate}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Saat Dilimi *
                </label>
                {!date ? (
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>Once bir tarih secin</p>
                ) : loadingSlots ? (
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>Musait saatler yukleniyor...</p>
                ) : availableSlots.length === 0 ? (
                  <p style={{ color: '#ef4444', fontSize: 13 }}>Bu tarihte musait saat bulunmuyor</p>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {availableSlots.map(slot => (
                      <button type="button" key={slot} onClick={() => setTimeSlot(slot)}
                        style={{
                          padding: '8px 14px', borderRadius: 8, border: '1px solid',
                          cursor: 'pointer', fontSize: 13, fontWeight: 500,
                          borderColor: timeSlot === slot ? '#3b82f6' : '#e5e7eb',
                          background: timeSlot === slot ? '#eff6ff' : '#fff',
                          color: timeSlot === slot ? '#3b82f6' : '#374151'
                        }}>
                        <Clock size={12} style={{ marginRight: 4 }} />
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Randevu Amaci *
                </label>
                <select value={purpose} onChange={e => setPurpose(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' }}>
                  <option value="">Secin...</option>
                  <option value="Okul Tanitimi">Okul Tanitimi</option>
                  <option value="Kayit Islemi">Kayit Islemi</option>
                  <option value="Bilgi Alma">Bilgi Alma</option>
                  <option value="Mulakat">Mulakat</option>
                  <option value="Diger">Diger</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Ek Notlar
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Eklemek istediginiz notlar..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <button type="submit" disabled={submitting || !date || !timeSlot || !purpose}
                style={{
                  padding: '12px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: (date && timeSlot && purpose) ? '#3b82f6' : '#e5e7eb',
                  color: (date && timeSlot && purpose) ? '#fff' : '#9ca3af',
                  fontWeight: 600, fontSize: 14
                }}>
                {submitting ? 'Gonderiliyor...' : 'Randevu Talebi Olustur'}
              </button>
            </div>
          </form>
        )}

        {/* Existing Appointments */}
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Randevularim</h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Yukleniyor...</div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9' }}>
            <CalendarDays size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
            <p>Henuz randevunuz bulunmuyor</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {appointments.map(apt => (
              <div key={apt._id} style={{
                background: '#fff', borderRadius: 12, padding: 16,
                border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: 12
              }}>
                <div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 4 }}>
                    <CalendarDays size={16} style={{ color: '#6b7280' }} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {new Date(apt.date).toLocaleDateString('tr-TR')} - {apt.timeSlot}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#374151', marginLeft: 28 }}>{apt.purpose}</div>
                  {apt.notes && <div style={{ fontSize: 13, color: '#9ca3af', marginLeft: 28 }}>{apt.notes}</div>}
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: 6,
                  background: `${statusColors[apt.status] || '#6b7280'}15`,
                  color: statusColors[apt.status] || '#6b7280',
                  fontSize: 12, fontWeight: 600
                }}>
                  {statusLabels[apt.status] || apt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}
