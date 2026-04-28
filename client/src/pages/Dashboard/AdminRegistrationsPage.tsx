import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Check, X, Eye, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip, type ChipProps } from '../../components/ui/Chip';
import { apiClient } from '../../utils/api';
import { cn } from '../../utils/cn';

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

type StatusKey = Registration['status'];
type FilterKey = '' | StatusKey;

const STATUS_LABELS: Record<StatusKey, string> = {
  pending: 'Beklemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  interview: 'Mülakat',
};

const STATUS_TONES: Record<StatusKey, ChipProps['tone']> = {
  pending: 'default',
  approved: 'black',
  rejected: 'state',
  interview: 'outline',
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: '', label: 'Tümü' },
  { key: 'pending', label: 'Beklemede' },
  { key: 'approved', label: 'Onaylandı' },
  { key: 'interview', label: 'Mülakat' },
  { key: 'rejected', label: 'Reddedildi' },
];

const formatDate = (raw: string | undefined): string => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('');
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = filter ? `?status=${filter}` : '';
      const [regsRes, statsRes] = await Promise.all([
        apiClient.get(`/api/registrations${params}`),
        apiClient.get('/api/registrations/stats/summary'),
      ]);
      setRegistrations((regsRes.data as { data?: Registration[] }).data || []);
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

  const updateStatus = async (id: string, status: StatusKey) => {
    setUpdating(true);
    try {
      await apiClient.put(`/api/registrations/${id}/status`, {
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : undefined,
      });
      setRejectionReason('');
      setSelectedReg(null);
      const verb: Record<StatusKey, string> = {
        approved: 'onaylandı',
        rejected: 'reddedildi',
        interview: 'mülakat için seçildi',
        pending: 'güncellendi',
      };
      toast.success(`Başvuru ${verb[status]}`);
      await fetchData();
    } catch {
      toast.error('Başvuru güncellenirken hata oluştu');
    } finally {
      setUpdating(false);
    }
  };

  const columns = useMemo<ColumnDef<Registration>[]>(
    () => [
      {
        accessorKey: 'studentName',
        header: 'Öğrenci',
        cell: (info) => (
          <span className="font-serif text-[var(--ink)]">{info.getValue<string>()}</span>
        ),
        filterFn: 'includesString',
      },
      {
        id: 'applicant',
        header: 'Başvuran',
        accessorFn: (r) => r.applicantName,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-[var(--ink-2)]">{row.original.applicantName}</span>
            <span className="font-mono text-[10px] text-[var(--ink-dim)]">
              {row.original.applicantEmail}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'targetClass',
        header: 'Sınıf',
        cell: (info) => (
          <span className="font-mono text-xs text-[var(--ink-dim)] uppercase tracking-wider">
            {info.getValue<string>()}. Sınıf
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Tarih',
        cell: (info) => (
          <span className="font-mono text-xs text-[var(--ink-dim)]">
            {formatDate(info.getValue<string>())}
          </span>
        ),
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
                setSelectedReg(row.original);
                setRejectionReason('');
              }}
            >
              <Eye size={14} />
              Detay
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const breadcrumb = [{ label: 'Ana Sayfa', path: '/admin' }, { label: 'Yeni Kayıt Başvuruları' }];

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Yeni Kayıt Başvuruları" breadcrumb={breadcrumb}>
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Yeni Kayıt Başvuruları" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Belge No. {new Date().getFullYear()}/K
          </div>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Yeni Kayıt Başvuruları</h1>
        </header>

        {stats && <StatsBar stats={stats} />}

        <DataTable
          caption="Tablo I — Başvuru Listesi"
          columns={columns}
          data={registrations}
          emptyState="Seçilen kriterlere uygun başvuru bulunamadı."
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

      {selectedReg && (
        <RegistrationDetailModal
          reg={selectedReg}
          updating={updating}
          rejectionReason={rejectionReason}
          onRejectionChange={setRejectionReason}
          onClose={() => setSelectedReg(null)}
          onUpdateStatus={updateStatus}
        />
      )}
    </ModernDashboardLayout>
  );
}

function StatsBar({ stats }: { stats: Stats }) {
  const items: { label: string; value: number; tone: ChipProps['tone'] }[] = [
    { label: 'Toplam', value: stats.total, tone: 'outline' },
    { label: 'Beklemede', value: stats.pending, tone: 'default' },
    { label: 'Onaylandı', value: stats.approved, tone: 'black' },
    { label: 'Mülakat', value: stats.interview, tone: 'outline' },
    { label: 'Reddedildi', value: stats.rejected, tone: 'state' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-[var(--rule)] border border-[var(--rule)]">
      {items.map((s) => (
        <div key={s.label} className="bg-[var(--paper)] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
            {s.label}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-serif text-2xl text-[var(--ink)]">{s.value}</span>
            <Chip tone={s.tone}>{s.label}</Chip>
          </div>
        </div>
      ))}
    </div>
  );
}

interface RegistrationDetailModalProps {
  reg: Registration;
  updating: boolean;
  rejectionReason: string;
  onRejectionChange: (v: string) => void;
  onClose: () => void;
  onUpdateStatus: (id: string, status: StatusKey) => void;
}

function RegistrationDetailModal({
  reg,
  updating,
  rejectionReason,
  onRejectionChange,
  onClose,
  onUpdateStatus,
}: RegistrationDetailModalProps) {
  const canDecide = reg.status === 'pending' || reg.status === 'interview';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <Card
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        contentClassName="p-0"
      >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
              Başvuru Detayı · No. {reg._id.slice(-6).toUpperCase()}
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
              <Chip tone={STATUS_TONES[reg.status]}>{STATUS_LABELS[reg.status]}</Chip>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                {formatDate(reg.createdAt)}
              </span>
            </div>

            <Section title="Öğrenci Bilgileri">
              <InfoRow label="Adı Soyadı" value={reg.studentName} />
              <InfoRow label="Hedef Sınıf" value={`${reg.targetClass}. Sınıf`} />
              {reg.currentSchool && <InfoRow label="Mevcut Okul" value={reg.currentSchool} />}
              {reg.studentBirthDate && (
                <InfoRow label="Doğum Tarihi" value={formatDate(reg.studentBirthDate)} />
              )}
            </Section>

            <Section title="Başvuran">
              <InfoRow label="Adı Soyadı" value={reg.applicantName} />
              <InfoRow label="E-posta" value={reg.applicantEmail} mono />
              <InfoRow label="Telefon" value={reg.applicantPhone} mono />
            </Section>

            <Section title="Veli Bilgileri">
              <InfoRow label="Adı Soyadı" value={reg.parentName} />
              <InfoRow label="Telefon" value={reg.parentPhone} mono />
              {reg.parentEmail && <InfoRow label="E-posta" value={reg.parentEmail} mono />}
            </Section>

            {reg.notes && (
              <Section title="Notlar">
                <p className="font-serif text-sm text-[var(--ink-2)] leading-relaxed">
                  {reg.notes}
                </p>
              </Section>
            )}

            {reg.createdUserId && (
              <Section title="Sistem">
                <InfoRow label="Hesap ID" value={reg.createdUserId} mono />
              </Section>
            )}

            {canDecide && (
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
                    onClick={() => onUpdateStatus(reg._id, 'approved')}
                    loading={updating}
                  >
                    <Check size={14} />
                    Onayla
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onUpdateStatus(reg._id, 'interview')}
                    loading={updating}
                  >
                    <MessageSquare size={14} />
                    Mülakat
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onUpdateStatus(reg._id, 'rejected')}
                    loading={updating}
                  >
                    <X size={14} />
                    Reddet
                  </Button>
                </div>
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
