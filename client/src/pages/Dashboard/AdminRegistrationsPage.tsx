import React, { useState, useEffect, useCallback } from 'react';
import { ModernDashboardLayout } from '../../components/ModernDashboardLayout';
import { apiClient } from '../../utils/api';
import { ClipboardList, Check, X, Eye, UserPlus, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Registration {
  _id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  studentName: string;
  studentBirthDate?: string;
  currentSchool?: string;
  targetClass: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'interview';
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdUserId?: string;
  createdAt: string;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  interview: number;
  total: number;
}

const statusLabels: Record<string, string> = {
  pending: 'Beklemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  interview: 'Mülakat',
};

const statusColors: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  interview: '#3b82f6',
};

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = filter ? `?status=${filter}` : '';
      const [regsRes, statsRes] = await Promise.all([
        apiClient.get(`/api/registrations${params}`),
        apiClient.get('/api/registrations/stats/summary'),
      ]);
      setRegistrations((regsRes.data as any).data || []);
      setStats(statsRes.data as Stats);
    } catch {
      toast.error('Başvurular yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    try {
      await apiClient.put(`/api/registrations/${id}/status`, {
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : undefined,
      });
      setRejectionReason('');
      setShowDetail(false);
      setSelectedReg(null);
      const statusMsg: Record<string, string> = {
        approved: 'onaylandı',
        rejected: 'reddedildi',
        interview: 'mülakat için seçildi',
      };
      toast.success(`Başvuru ${statusMsg[status] || 'güncellendi'}`);
      await fetchData();
    } catch {
      toast.error('Başvuru güncellenirken hata oluştu');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ModernDashboardLayout pageTitle="Yeni Kayıt Başvuruları">
      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <UserPlus size={28} />
          <h1 style={{ margin: 0, fontSize: 24 }}>Yeni Kayıt Başvuruları</h1>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            {[
              { label: 'Toplam', value: stats.total, color: '#6b7280' },
              { label: 'Beklemede', value: stats.pending, color: '#f59e0b' },
              { label: 'Onaylandı', value: stats.approved, color: '#10b981' },
              { label: 'Reddedildi', value: stats.rejected, color: '#ef4444' },
              { label: 'Mülakat', value: stats.interview, color: '#3b82f6' },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                  border: `2px solid ${s.color}20`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ color: '#6b7280', fontSize: 13 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['', 'pending', 'approved', 'rejected', 'interview'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                background: filter === f ? '#3b82f6' : '#f1f5f9',
                color: filter === f ? '#fff' : '#374151',
                fontWeight: 500,
                fontSize: 13,
              }}
            >
              {f === '' ? 'Tümü' : statusLabels[f]}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Yükleniyor...</div>
        ) : registrations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
            <ClipboardList size={48} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p>Başvuru bulunamadı</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: '#fff',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 13,
                      color: '#6b7280',
                      fontWeight: 600,
                    }}
                  >
                    Öğrenci
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 13,
                      color: '#6b7280',
                      fontWeight: 600,
                    }}
                  >
                    Başvuran
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 13,
                      color: '#6b7280',
                      fontWeight: 600,
                    }}
                  >
                    Sınıf
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 13,
                      color: '#6b7280',
                      fontWeight: 600,
                    }}
                  >
                    Tarih
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: 13,
                      color: '#6b7280',
                      fontWeight: 600,
                    }}
                  >
                    Durum
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      fontSize: 13,
                      color: '#6b7280',
                      fontWeight: 600,
                    }}
                  >
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg) => (
                  <tr key={reg._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>{reg.studentName}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>
                      <div>{reg.applicantName}</div>
                      <div style={{ color: '#9ca3af', fontSize: 12 }}>{reg.applicantEmail}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>{reg.targetClass}. Sınıf</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>
                      {new Date(reg.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: `${statusColors[reg.status]}15`,
                          color: statusColors[reg.status],
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {statusLabels[reg.status]}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setSelectedReg(reg);
                          setShowDetail(true);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: 'none',
                          cursor: 'pointer',
                          background: '#f1f5f9',
                          color: '#374151',
                          fontSize: 13,
                        }}
                      >
                        <Eye size={14} style={{ marginRight: 4 }} /> Detay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail Modal */}
        {showDetail && selectedReg && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 20,
            }}
            onClick={() => setShowDetail(false)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 32,
                maxWidth: 560,
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ margin: '0 0 20px', fontSize: 20 }}>Başvuru Detayı</h2>

              <div style={{ display: 'grid', gap: 12 }}>
                <InfoRow label="Öğrenci Adı" value={selectedReg.studentName} />
                <InfoRow label="Hedef Sınıf" value={`${selectedReg.targetClass}. Sınıf`} />
                {selectedReg.currentSchool && (
                  <InfoRow label="Mevcut Okul" value={selectedReg.currentSchool} />
                )}
                {selectedReg.studentBirthDate && (
                  <InfoRow
                    label="Doğum Tarihi"
                    value={new Date(selectedReg.studentBirthDate).toLocaleDateString('tr-TR')}
                  />
                )}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }} />
                <InfoRow label="Başvuran" value={selectedReg.applicantName} />
                <InfoRow label="E-posta" value={selectedReg.applicantEmail} />
                <InfoRow label="Telefon" value={selectedReg.applicantPhone} />
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }} />
                <InfoRow label="Veli Adı" value={selectedReg.parentName} />
                <InfoRow label="Veli Telefon" value={selectedReg.parentPhone} />
                {selectedReg.parentEmail && (
                  <InfoRow label="Veli E-posta" value={selectedReg.parentEmail} />
                )}
                {selectedReg.notes && (
                  <>
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }} />
                    <InfoRow label="Notlar" value={selectedReg.notes} />
                  </>
                )}
                {selectedReg.createdUserId && (
                  <InfoRow label="Oluşturulan Hesap ID" value={selectedReg.createdUserId} />
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20 }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: `${statusColors[selectedReg.status]}15`,
                    color: statusColors[selectedReg.status],
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {statusLabels[selectedReg.status]}
                </span>
              </div>

              {(selectedReg.status === 'pending' || selectedReg.status === 'interview') && (
                <div style={{ marginTop: 20 }}>
                  <textarea
                    placeholder="Ret sebebi (opsiyonel)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      fontSize: 14,
                      resize: 'vertical',
                      minHeight: 60,
                      marginBottom: 12,
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => updateStatus(selectedReg._id, 'approved')}
                      disabled={updating}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        background: '#10b981',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Check size={16} /> Onayla
                    </button>
                    <button
                      onClick={() => updateStatus(selectedReg._id, 'interview')}
                      disabled={updating}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        background: '#3b82f6',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <MessageSquare size={16} /> Mülakat
                    </button>
                    <button
                      onClick={() => updateStatus(selectedReg._id, 'rejected')}
                      disabled={updating}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        background: '#ef4444',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <X size={16} /> Reddet
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowDetail(false)}
                style={{
                  marginTop: 16,
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  background: '#fff',
                  color: '#374151',
                  fontSize: 14,
                }}
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ color: '#6b7280', fontSize: 13, minWidth: 120 }}>{label}:</span>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
