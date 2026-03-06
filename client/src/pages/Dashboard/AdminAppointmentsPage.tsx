import React, { useState, useEffect, useCallback } from 'react';
import { ModernDashboardLayout } from '../../components/ModernDashboardLayout';
import { apiClient } from '../../utils/api';
import { CalendarDays, Check, X, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Appointment {
  _id: string;
  applicantUserId: string;
  applicantName: string;
  applicantEmail: string;
  date: string;
  timeSlot: string;
  purpose: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  rejectionReason?: string;
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

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const params = filter ? `?status=${filter}` : '';
      const res = await apiClient.get(`/api/appointments${params}`);
      setAppointments((res.data as any).data || []);
    } catch {
      toast.error('Randevular yuklenirken hata olustu');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateStatus = async (id: string, status: string, reason?: string) => {
    setUpdating(id);
    try {
      await apiClient.put(`/api/appointments/${id}/status`, { status, rejectionReason: reason });
      const statusMsg: Record<string, string> = { approved: 'onaylandi', rejected: 'reddedildi', completed: 'tamamlandi' };
      toast.success(`Randevu ${statusMsg[status] || 'guncellendi'}`);
      setRejectingId(null);
      setRejectionReason('');
      await fetchData();
    } catch {
      toast.error('Randevu guncellenirken hata olustu');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <ModernDashboardLayout pageTitle="Randevu Basvurulari">
      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <CalendarDays size={28} />
          <h1 style={{ margin: 0, fontSize: 24 }}>Randevu Basvurulari</h1>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['', 'pending', 'approved', 'rejected', 'completed', 'cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: filter === f ? '#3b82f6' : '#f1f5f9',
              color: filter === f ? '#fff' : '#374151', fontWeight: 500, fontSize: 13
            }}>
              {f === '' ? 'Tumu' : statusLabels[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Yukleniyor...</div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
            <CalendarDays size={48} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p>Randevu bulunamadi</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {appointments.map(apt => (
              <div key={apt._id} style={{
                background: '#fff', borderRadius: 12, padding: 20,
                border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{apt.applicantName}</div>
                    <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>{apt.applicantEmail}</div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#374151' }}>
                        <CalendarDays size={14} />
                        {new Date(apt.date).toLocaleDateString('tr-TR')}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#374151' }}>
                        <Clock size={14} />
                        {apt.timeSlot}
                      </span>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 14, color: '#374151' }}>
                      <strong>Amac:</strong> {apt.purpose}
                    </div>
                    {apt.notes && (
                      <div style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
                        <strong>Not:</strong> {apt.notes}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: 6,
                      background: `${statusColors[apt.status]}15`, color: statusColors[apt.status],
                      fontSize: 12, fontWeight: 600
                    }}>
                      {statusLabels[apt.status]}
                    </span>

                    {apt.status === 'pending' && rejectingId !== apt._id && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => updateStatus(apt._id, 'approved')} disabled={updating === apt._id}
                          style={{ padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={14} /> Onayla
                        </button>
                        <button onClick={() => setRejectingId(apt._id)} disabled={updating === apt._id}
                          style={{ padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <X size={14} /> Reddet
                        </button>
                      </div>
                    )}

                    {rejectingId === apt._id && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
                        <textarea
                          placeholder="Ret sebebi (opsiyonel)"
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                          rows={2}
                          style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12, resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => updateStatus(apt._id, 'rejected', rejectionReason)} disabled={updating === apt._id}
                            style={{ flex: 1, padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600 }}>
                            Reddet
                          </button>
                          <button onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: 'pointer', background: '#fff', color: '#374151', fontSize: 12 }}>
                            Iptal
                          </button>
                        </div>
                      </div>
                    )}

                    {apt.status === 'approved' && (
                      <button onClick={() => updateStatus(apt._id, 'completed')} disabled={updating === apt._id}
                        style={{ padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#6b7280', color: '#fff', fontSize: 12, fontWeight: 600 }}>
                        Tamamlandi
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}
