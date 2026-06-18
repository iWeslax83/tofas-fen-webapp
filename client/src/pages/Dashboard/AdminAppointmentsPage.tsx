import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Check, X, Clock, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip, type ChipProps } from '../../components/ui/Chip';
import { apiClient } from '../../utils/api';
import { cn } from '../../utils/cn';

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

type StatusKey = Appointment['status'];
type FilterKey = '' | StatusKey;

const STATUS_LABELS: Record<StatusKey, string> = {
  pending: 'Beklemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  completed: 'Tamamlandı',
  cancelled: 'İptal Edildi',
};

const STATUS_TONES: Record<StatusKey, ChipProps['tone']> = {
  pending: 'default',
  approved: 'black',
  rejected: 'state',
  completed: 'outline',
  cancelled: 'default',
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: '', label: 'Tümü' },
  { key: 'pending', label: 'Beklemede' },
  { key: 'approved', label: 'Onaylandı' },
  { key: 'completed', label: 'Tamamlandı' },
  { key: 'rejected', label: 'Reddedildi' },
  { key: 'cancelled', label: 'İptal Edildi' },
];

const formatDate = (raw: string | undefined): string => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = filter ? `?status=${filter}` : '';
      const res = await apiClient.get(`/api/appointments${params}`);
      setAppointments((res.data as { data?: Appointment[] }).data || []);
    } catch {
      toast.error('Randevular yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateStatus = async (id: string, status: StatusKey, reason?: string) => {
    setUpdating(true);
    try {
      await apiClient.put(`/api/appointments/${id}/status`, { status, rejectionReason: reason });
      const verb: Record<string, string> = {
        approved: 'onaylandı',
        rejected: 'reddedildi',
        completed: 'tamamlandı',
      };
      toast.success(`Randevu ${verb[status] || 'güncellendi'}`);
      setSelected(null);
      setRejectionReason('');
      await fetchData();
    } catch {
      toast.error('Randevu güncellenirken hata oluştu');
    } finally {
      setUpdating(false);
    }
  };

  const columns = useMemo<ColumnDef<Appointment>[]>(
    () => [
      {
        id: 'applicant',
        header: 'Başvuran',
        accessorFn: (r) => r.applicantName,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-serif text-[var(--ink)]">{row.original.applicantName}</span>
            <span className="font-mono text-[10px] text-[var(--ink-dim)]">
              {row.original.applicantEmail}
            </span>
          </div>
        ),
        filterFn: 'includesString',
      },
      {
        accessorKey: 'date',
        header: 'Tarih',
        cell: (info) => (
          <span className="font-mono text-xs text-[var(--ink-dim)]">
            {formatDate(info.getValue<string>())}
          </span>
        ),
      },
      {
        accessorKey: 'timeSlot',
        header: 'Saat',
        cell: (info) => (
          <span className="font-mono text-xs text-[var(--ink-dim)] uppercase tracking-wider">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'purpose',
        header: 'Amaç',
        cell: (info) => <span className="text-[var(--ink-2)]">{info.getValue<string>()}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Durum',
        cell: (info) => {
          const status = info.getValue<StatusKey>();
          return <Chip tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Chip>;
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelected(row.original);
                setRejectionReason('');
              }}
            >
              <CalendarDays size={14} />
              Detay
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const breadcrumb = [{ label: 'Ana Sayfa', path: '/admin' }, { label: 'Randevu Başvuruları' }];

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Randevu Başvuruları" breadcrumb={breadcrumb}>
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Randevu Başvuruları" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Belge No. {new Date().getFullYear()}/R
          </div>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Randevu Başvuruları</h1>
        </header>

        <DataTable
          caption="Tablo I — Randevu Listesi"
          columns={columns}
          data={appointments}
          emptyState="Seçilen kriterlere uygun randevu bulunamadı."
          toolbar={
            <div className="flex items-center gap-2 flex-wrap">
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <button
                    key={f.key || 'all'}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      'h-8 px-3 text-xs font-mono uppercase tracking-wider border transition-colors',
                      active
                        ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                        : 'bg-transparent text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]',
                    )}
                    aria-pressed={active}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          }
        />
      </div>

      {selected && (
        <AppointmentDetailModal
          apt={selected}
          updating={updating}
          rejectionReason={rejectionReason}
          onRejectionChange={setRejectionReason}
          onClose={() => setSelected(null)}
          onUpdateStatus={updateStatus}
        />
      )}
    </ModernDashboardLayout>
  );
}

interface AppointmentDetailModalProps {
  apt: Appointment;
  updating: boolean;
  rejectionReason: string;
  onRejectionChange: (v: string) => void;
  onClose: () => void;
  onUpdateStatus: (id: string, status: StatusKey, reason?: string) => void;
}

function AppointmentDetailModal({
  apt,
  updating,
  rejectionReason,
  onRejectionChange,
  onClose,
  onUpdateStatus,
}: AppointmentDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <Card
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto"
        contentClassName="p-0"
      >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
              Randevu Detayı · No. {apt._id.slice(-6).toUpperCase()}
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

          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Chip tone={STATUS_TONES[apt.status]}>{STATUS_LABELS[apt.status]}</Chip>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                {formatDate(apt.createdAt)}
              </span>
            </div>

            <Section title="Başvuran">
              <InfoRow label="Adı Soyadı" value={apt.applicantName} />
              <InfoRow label="E-posta" value={apt.applicantEmail} mono />
            </Section>

            <Section title="Randevu">
              <InfoRow label="Tarih" value={formatDate(apt.date)} mono />
              <InfoRow label="Saat" value={apt.timeSlot} mono />
              <InfoRow label="Amaç" value={apt.purpose} />
              {apt.notes && <InfoRow label="Not" value={apt.notes} />}
              {apt.rejectionReason && <InfoRow label="Ret Sebebi" value={apt.rejectionReason} />}
            </Section>

            {apt.status === 'pending' && (
              <div className="pt-3 border-t border-[var(--rule)] space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
                    Ret Sebebi (opsiyonel)
                  </span>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => onRejectionChange(e.target.value)}
                    rows={2}
                    placeholder="Reddedilirse açıklama…"
                    className={cn(
                      'w-full bg-transparent border-0 border-b border-[var(--rule)] px-1 py-2',
                      'text-[var(--ink)] placeholder:text-[var(--ink-dim)]',
                      'focus:outline-none focus:border-[var(--state)] focus:border-b-2 focus:pb-[7px]',
                      'transition-colors resize-y min-h-[3rem]',
                    )}
                  />
                </label>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onUpdateStatus(apt._id, 'approved')}
                    loading={updating}
                  >
                    <Check size={14} />
                    Onayla
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onUpdateStatus(apt._id, 'rejected', rejectionReason)}
                    loading={updating}
                  >
                    <X size={14} />
                    Reddet
                  </Button>
                </div>
              </div>
            )}

            {apt.status === 'approved' && (
              <div className="pt-3 border-t border-[var(--rule)] flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onUpdateStatus(apt._id, 'completed')}
                  loading={updating}
                >
                  <Clock size={14} />
                  Tamamlandı İşaretle
                </Button>
              </div>
            )}

            <div className="flex justify-end pt-2">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)] border-b border-[var(--rule)] pb-1">
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-sm">
      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)] pt-0.5">
        {label}
      </span>
      <span className={cn('text-[var(--ink)]', mono ? 'font-mono text-xs' : 'font-serif')}>
        {value}
      </span>
    </div>
  );
}
