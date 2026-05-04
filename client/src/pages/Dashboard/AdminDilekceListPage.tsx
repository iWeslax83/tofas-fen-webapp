import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { FileText, Search, Eye, X } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip, type ChipProps } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { apiClient } from '../../utils/api';
import { cn } from '../../utils/cn';
import { safeConsoleError } from '../../utils/safeLogger';

interface Dilekce {
  _id: string;
  userId: string;
  userName: string;
  userRole: string;
  type: 'izin' | 'rapor' | 'nakil' | 'diger';
  subject: string;
  content: string;
  attachments?: string[];
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';
  priority: 'low' | 'medium' | 'high';
  category?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  response?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

type DilekceType = Dilekce['type'];
type Priority = Dilekce['priority'];
type Status = Dilekce['status'];

const TYPE_LABELS: Record<DilekceType, string> = {
  izin: 'İzin',
  rapor: 'Rapor',
  nakil: 'Nakil',
  diger: 'Diğer',
};

const STATUS_LABELS: Record<Status, string> = {
  pending: 'Beklemede',
  in_review: 'İnceleniyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  completed: 'Tamamlandı',
};

const STATUS_TONES: Record<Status, ChipProps['tone']> = {
  pending: 'default',
  in_review: 'outline',
  approved: 'black',
  rejected: 'state',
  completed: 'black',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};

const PRIORITY_TONES: Record<Priority, ChipProps['tone']> = {
  low: 'default',
  medium: 'outline',
  high: 'state',
};

const ROLE_LABELS: Record<string, string> = {
  student: 'Öğrenci',
  parent: 'Veli',
  teacher: 'Öğretmen',
};

type StatusFilter = 'all' | Status;
type TypeFilter = 'all' | DilekceType;
type PriorityFilter = 'all' | Priority;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Tüm Durumlar' },
  { key: 'pending', label: 'Beklemede' },
  { key: 'in_review', label: 'İnceleniyor' },
  { key: 'approved', label: 'Onaylandı' },
  { key: 'rejected', label: 'Reddedildi' },
  { key: 'completed', label: 'Tamamlandı' },
];

const selectClasses = cn(
  'w-full bg-transparent border-0 border-b border-[var(--rule)] px-1 py-2',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--state)] focus:border-b-2 focus:pb-[7px]',
  'transition-colors',
);

const formatDate = (raw: string): string =>
  new Date(raw).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

const formatDateTime = (raw: string): string =>
  new Date(raw).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

interface ReviewIntent {
  status: Status;
  noteLabel: string;
  buttonLabel: string;
  buttonVariant: 'primary' | 'secondary' | 'danger';
  responseField?: boolean;
}

const REVIEW_ACTIONS: Record<string, ReviewIntent> = {
  in_review: {
    status: 'in_review',
    noteLabel: 'İnceleme Notu (opsiyonel)',
    buttonLabel: 'İncelemeye Al',
    buttonVariant: 'secondary',
  },
  approved: {
    status: 'approved',
    noteLabel: 'Onay Notu (opsiyonel)',
    buttonLabel: 'Onayla',
    buttonVariant: 'primary',
  },
  rejected: {
    status: 'rejected',
    noteLabel: 'Red Nedeni',
    buttonLabel: 'Reddet',
    buttonVariant: 'danger',
  },
  completed: {
    status: 'completed',
    noteLabel: 'Yanıt',
    buttonLabel: 'Tamamla',
    buttonVariant: 'primary',
    responseField: true,
  },
};

const AdminDilekceListPage: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const [dilekceler, setDilekceler] = useState<Dilekce[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterType, setFilterType] = useState<TypeFilter>('all');
  const [filterPriority, setFilterPriority] = useState<PriorityFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Dilekce | null>(null);

  useEffect(() => {
    if (!user || user.rol !== 'admin') {
      navigate('/login');
      return;
    }
    loadDilekceler();
  }, [user, navigate]);

  const loadDilekceler = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/dilekce');
      if (response.data.success) {
        setDilekceler(response.data.dilekceler || []);
      }
    } catch (error) {
      safeConsoleError('Error loading dilekce:', error);
      toast.error('Dilekçeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = useCallback(
    async (id: string, status: Status, reviewNote?: string, response?: string) => {
      try {
        const r = await apiClient.put(`/api/dilekce/${id}/status`, {
          status,
          reviewNote,
          response,
        });
        if (r.data.success) {
          toast.success('Dilekçe durumu güncellendi');
          await loadDilekceler();
          setSelected(null);
        }
      } catch (error: unknown) {
        safeConsoleError('Error updating status:', error);
        const msg =
          (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'İşlem başarısız';
        toast.error(msg);
      }
    },
    [],
  );

  const filteredDilekceler = useMemo(
    () =>
      dilekceler.filter((d) => {
        if (filterStatus !== 'all' && d.status !== filterStatus) return false;
        if (filterType !== 'all' && d.type !== filterType) return false;
        if (filterPriority !== 'all' && d.priority !== filterPriority) return false;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          if (!d.subject.toLowerCase().includes(q) && !d.userName.toLowerCase().includes(q)) {
            return false;
          }
        }
        return true;
      }),
    [dilekceler, filterStatus, filterType, filterPriority, searchTerm],
  );

  const columns = useMemo<ColumnDef<Dilekce>[]>(
    () => [
      {
        accessorKey: 'subject',
        header: 'Konu',
        cell: (info) => (
          <span className="font-serif text-[var(--ink)]">{info.getValue<string>()}</span>
        ),
        filterFn: 'includesString',
      },
      {
        id: 'sender',
        header: 'Gönderen',
        accessorFn: (d) => d.userName,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-[var(--ink-2)]">{row.original.userName}</span>
            <span className="font-mono text-[10px] uppercase text-[var(--ink-dim)]">
              {ROLE_LABELS[row.original.userRole] || row.original.userRole}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Tür',
        cell: (info) => (
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--ink-dim)]">
            {TYPE_LABELS[info.getValue<DilekceType>()]}
          </span>
        ),
      },
      {
        accessorKey: 'priority',
        header: 'Öncelik',
        cell: (info) => {
          const p = info.getValue<Priority>();
          return <Chip tone={PRIORITY_TONES[p]}>{PRIORITY_LABELS[p]}</Chip>;
        },
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
          const s = info.getValue<Status>();
          return <Chip tone={STATUS_TONES[s]}>{STATUS_LABELS[s]}</Chip>;
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={() => setSelected(row.original)}>
              <Eye size={14} />
              Detay
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const breadcrumb = [{ label: 'Ana Sayfa', path: '/admin' }, { label: 'Dilekçe Yönetimi' }];

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Dilekçe Yönetimi" breadcrumb={breadcrumb}>
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Dilekçe Yönetimi" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Belge No. {new Date().getFullYear()}/D-Y
          </div>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Dilekçe Yönetimi</h1>
        </header>

        <DataTable
          caption="Tablo I — Başvuru Listesi"
          columns={columns}
          data={filteredDilekceler}
          emptyState="Filtrelenen kriterlere uygun dilekçe bulunamadı."
          toolbar={
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search
                    size={14}
                    className="absolute left-1 top-1/2 -translate-y-1/2 text-[var(--ink-dim)] pointer-events-none"
                  />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Konu veya kullanıcı ara…"
                    className="pl-6"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as TypeFilter)}
                  className={cn(selectClasses, 'h-10 w-auto min-w-[120px]')}
                  aria-label="Tür filtrele"
                >
                  <option value="all">Tüm Türler</option>
                  {(Object.keys(TYPE_LABELS) as DilekceType[]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as PriorityFilter)}
                  className={cn(selectClasses, 'h-10 w-auto min-w-[120px]')}
                  aria-label="Öncelik filtrele"
                >
                  <option value="all">Tüm Öncelikler</option>
                  {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {STATUS_FILTERS.map((f) => {
                  const active = filterStatus === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFilterStatus(f.key)}
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
            </div>
          }
        />
      </div>

      {selected && (
        <DilekceReviewModal
          dilekce={selected}
          onClose={() => setSelected(null)}
          onUpdateStatus={handleStatusUpdate}
        />
      )}
    </ModernDashboardLayout>
  );
};

export default AdminDilekceListPage;

interface DilekceReviewModalProps {
  dilekce: Dilekce;
  onClose: () => void;
  onUpdateStatus: (id: string, status: Status, reviewNote?: string, response?: string) => void;
}

function DilekceReviewModal({ dilekce, onClose, onUpdateStatus }: DilekceReviewModalProps) {
  const [intent, setIntent] = useState<keyof typeof REVIEW_ACTIONS | null>(null);
  const [note, setNote] = useState('');
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const availableIntents = useMemo<(keyof typeof REVIEW_ACTIONS)[]>(() => {
    if (dilekce.status === 'pending') return ['in_review', 'approved', 'rejected'];
    if (dilekce.status === 'in_review') return ['completed', 'rejected'];
    if (dilekce.status === 'approved') return ['completed'];
    return [];
  }, [dilekce.status]);

  const submit = async () => {
    if (!intent) return;
    const action = REVIEW_ACTIONS[intent];
    setSubmitting(true);
    try {
      await onUpdateStatus(
        dilekce._id,
        action.status,
        note || undefined,
        action.responseField ? response || undefined : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  };

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
              Dilekçe İncelemesi · No. {dilekce._id.slice(-6).toUpperCase()}
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
            <div className="flex items-center gap-2 flex-wrap">
              <Chip tone={STATUS_TONES[dilekce.status]}>{STATUS_LABELS[dilekce.status]}</Chip>
              <Chip tone={PRIORITY_TONES[dilekce.priority]}>
                {PRIORITY_LABELS[dilekce.priority]} öncelik
              </Chip>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)] ml-auto">
                {formatDateTime(dilekce.createdAt)}
              </span>
            </div>

            <header>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                {TYPE_LABELS[dilekce.type]}
                {dilekce.category && ` · ${dilekce.category}`}
              </div>
              <h2 className="font-serif text-xl text-[var(--ink)] mt-1">{dilekce.subject}</h2>
            </header>

            <Section title="Gönderen">
              <p className="font-serif text-sm text-[var(--ink)]">
                {dilekce.userName}
                {ROLE_LABELS[dilekce.userRole] && (
                  <span className="text-[var(--ink-dim)]"> · {ROLE_LABELS[dilekce.userRole]}</span>
                )}
              </p>
            </Section>

            <Section title="İçerik">
              <p className="font-serif text-sm text-[var(--ink-2)] leading-relaxed whitespace-pre-wrap">
                {dilekce.content}
              </p>
            </Section>

            {dilekce.attachments && dilekce.attachments.length > 0 && (
              <Section title="Ek Dosyalar">
                <ul className="space-y-1">
                  {dilekce.attachments.map((file, i) => (
                    <li key={i}>
                      <a
                        href={file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-[var(--ink)] hover:text-[var(--state)]"
                      >
                        <FileText size={12} />
                        Dosya {i + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {dilekce.reviewNote && (
              <Section title="Önceki İnceleme Notu">
                <p className="font-serif text-sm text-[var(--ink-2)] leading-relaxed">
                  {dilekce.reviewNote}
                </p>
              </Section>
            )}

            {dilekce.response && (
              <Section title="Yanıt">
                <p className="font-serif text-sm text-[var(--ink-2)] leading-relaxed">
                  {dilekce.response}
                </p>
              </Section>
            )}

            {availableIntents.length > 0 && (
              <div className="border-t border-[var(--rule)] pt-4 space-y-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
                  İşlem
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {availableIntents.map((key) => {
                    const action = REVIEW_ACTIONS[key];
                    const active = intent === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setIntent(key);
                          setNote('');
                          setResponse('');
                        }}
                        className={cn(
                          'h-8 px-3 text-xs font-mono uppercase tracking-wider border transition-colors',
                          active
                            ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                            : 'bg-transparent text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]',
                        )}
                        aria-pressed={active}
                      >
                        {action.buttonLabel}
                      </button>
                    );
                  })}
                </div>

                {intent && (
                  <div className="space-y-3">
                    <label className="flex flex-col gap-1">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
                        {REVIEW_ACTIONS[intent].noteLabel}
                      </span>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        className={cn(selectClasses, 'resize-y min-h-[4rem]')}
                      />
                    </label>
                    {REVIEW_ACTIONS[intent].responseField && (
                      <label className="flex flex-col gap-1">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
                          Resmi Yanıt
                        </span>
                        <textarea
                          value={response}
                          onChange={(e) => setResponse(e.target.value)}
                          rows={3}
                          className={cn(selectClasses, 'resize-y min-h-[4rem]')}
                        />
                      </label>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    Kapat
                  </Button>
                  {intent && (
                    <Button
                      variant={REVIEW_ACTIONS[intent].buttonVariant}
                      size="sm"
                      onClick={submit}
                      loading={submitting}
                    >
                      {REVIEW_ACTIONS[intent].buttonLabel}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {availableIntents.length === 0 && (
              <div className="flex justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Kapat
                </Button>
              </div>
            )}
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
      <div>{children}</div>
    </div>
  );
}
