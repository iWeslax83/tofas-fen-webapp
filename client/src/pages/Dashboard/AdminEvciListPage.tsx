import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Plus,
  Trash2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Settings2,
  BarChart3,
  Download,
  Filter,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip, type ChipProps } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { EvciService, UserService } from '../../utils/apiService';
import { cn } from '../../utils/cn';

interface EvciTalep {
  _id: string;
  studentId: string;
  studentName?: string;
  startDate: string;
  endDate: string;
  destination: string;
  createdAt: string;
  willGo: boolean;
  parentApproval?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  weekOf?: string;
  status?: string;
}

interface Student {
  id: string;
  adSoyad: string;
  sinif: string;
  sube: string;
  oda?: string;
  pansiyon?: boolean;
}

type ApprovalKey = NonNullable<EvciTalep['parentApproval']>;

const APPROVAL_LABELS: Record<ApprovalKey, string> = {
  pending: 'Veli Bekliyor',
  approved: 'Veli Onayladı',
  rejected: 'Veli Reddetti',
};

const APPROVAL_TONES: Record<ApprovalKey, ChipProps['tone']> = {
  pending: 'default',
  approved: 'black',
  rejected: 'state',
};

const APPROVAL_FILTERS: { key: 'All' | ApprovalKey; label: string }[] = [
  { key: 'All', label: 'Tümü' },
  { key: 'pending', label: 'Beklemede' },
  { key: 'approved', label: 'Onaylandı' },
  { key: 'rejected', label: 'Reddedildi' },
];

const selectClasses = cn(
  'h-10 bg-transparent border-0 border-b border-[var(--rule)] px-1 text-sm',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--state)] focus:border-b-2',
  'transition-colors',
);

interface FieldProps {
  label: string;
  children: React.ReactNode;
}
const Field = ({ label, children }: FieldProps) => (
  <label className="flex flex-col gap-1">
    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
      {label}
    </span>
    {children}
  </label>
);

export default function AdminEvciListPage() {
  const { user: authUser } = useAuthGuard(['admin', 'teacher']);
  const [requests, setRequests] = useState<EvciTalep[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newReq, setNewReq] = useState<Partial<EvciTalep>>({ willGo: true });
  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterRoom, setFilterRoom] = useState<string>('All');
  const [filterParentApproval, setFilterParentApproval] = useState<'All' | ApprovalKey>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideWeekOf, setOverrideWeekOf] = useState('');
  const [overrideIsOpen, setOverrideIsOpen] = useState(true);
  const [overrideReason, setOverrideReason] = useState('');

  const fetchData = useCallback(async (currentPage: number) => {
    try {
      setIsLoading(true);
      const { data: requestsData, error: requestsError } = await EvciService.getEvciRequests(
        currentPage,
        50,
      );
      if (requestsError) {
        toast.error('Talepler yüklenirken hata oluştu');
      } else {
        const resp = requestsData as unknown;
        if (
          resp &&
          typeof resp === 'object' &&
          'requests' in resp &&
          Array.isArray((resp as { requests: unknown }).requests)
        ) {
          const typed = resp as {
            requests: EvciTalep[];
            pagination?: { totalPages?: number; total?: number };
          };
          setRequests(typed.requests);
          setTotalPages(typed.pagination?.totalPages ?? 1);
          setTotalCount(typed.pagination?.total ?? typed.requests.length);
        } else if (Array.isArray(resp)) {
          setRequests(resp as EvciTalep[]);
          setTotalPages(1);
          setTotalCount(resp.length);
        } else {
          setRequests([]);
          setTotalPages(1);
          setTotalCount(0);
        }
      }

      const { data: studentsData, error: studentsError } =
        await UserService.getUsersByRole('student');
      if (!studentsError) {
        setStudents(Array.isArray(studentsData) ? (studentsData as Student[]) : []);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error fetching data:', err);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) fetchData(page);
  }, [authUser, page, fetchData]);

  const saveNew = async () => {
    if (
      !(
        newReq.studentId &&
        newReq.studentName &&
        newReq.startDate &&
        newReq.endDate &&
        newReq.destination &&
        typeof newReq.willGo === 'boolean'
      )
    ) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error: apiError } = await EvciService.createEvciRequest({
        studentId: newReq.studentId,
        willGo: newReq.willGo,
        startDate: newReq.startDate,
        endDate: newReq.endDate,
        destination: newReq.destination,
      });
      if (apiError) {
        toast.error(apiError);
      } else {
        toast.success('Evci talebi başarıyla eklendi');
        await fetchData(page);
        setShowForm(false);
        setNewReq({ willGo: true });
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error creating evci request:', err);
      toast.error('Evci talebi oluşturulurken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Bu talebi silmek istediğinize emin misiniz?')) return;
    try {
      const { error: apiError } = await EvciService.deleteEvciRequest(id);
      if (apiError) {
        toast.error(apiError);
      } else {
        setRequests((reqs) => reqs.filter((r) => r._id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.success('Evci talebi başarıyla silindi');
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error deleting evci request:', err);
      toast.error('Evci talebi silinirken hata oluştu');
    }
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkAction = async (status: 'approved' | 'rejected') => {
    if (selectedIds.size === 0) return;
    const label = status === 'approved' ? 'onaylamak' : 'reddetmek';
    if (!window.confirm(`Seçili ${selectedIds.size} talebi ${label} istediğinize emin misiniz?`))
      return;
    try {
      const result = (await EvciService.bulkUpdateStatus(Array.from(selectedIds), status)) as {
        error?: string;
      };
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${selectedIds.size} talep başarıyla güncellendi`);
        setSelectedIds(new Set());
        await fetchData(page);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error bulk updating:', err);
      toast.error('Toplu güncelleme sırasında hata oluştu');
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setShowExportMenu(false);
    try {
      const response = await EvciService.exportEvciRequests(format);
      const blob = new Blob([response.data], {
        type:
          format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evci-talepleri.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} dosyası indirildi`);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error exporting:', err);
      toast.error('Dışa aktarma sırasında hata oluştu');
    }
  };

  const handleAdminAction = useCallback(
    async (id: string, action: 'approve' | 'reject') => {
      const label = action === 'approve' ? 'onaylamak' : 'reddetmek';
      if (!window.confirm(`Bu talebi ${label} istediğinize emin misiniz?`)) return;
      try {
        const { error: apiError } = await EvciService.adminApproveEvciRequest(id, action);
        if (apiError) {
          toast.error(apiError);
        } else {
          toast.success(`Talep ${action === 'approve' ? 'onaylandı' : 'reddedildi'}`);
          await fetchData(page);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Error admin action:', err);
        toast.error('İşlem sırasında hata oluştu');
      }
    },
    [fetchData, page],
  );

  const handleWindowOverride = async () => {
    if (!overrideWeekOf) {
      toast.error('Hafta başlangıç tarihi seçin');
      return;
    }
    try {
      const result = (await EvciService.setWindowOverride(
        overrideWeekOf,
        overrideIsOpen,
        overrideReason,
      )) as { error?: string };
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Pencere override ${overrideIsOpen ? 'açık' : 'kapalı'} olarak ayarlandı`);
        setShowOverride(false);
        setOverrideReason('');
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error setting override:', err);
      toast.error('Override ayarlanırken hata oluştu');
    }
  };

  const studentMap = useMemo(() => {
    const m = new Map<string, Student>();
    students.forEach((s) => m.set(s.id, s));
    return m;
  }, [students]);

  const classes = useMemo(
    () =>
      Array.from(
        new Set(requests.map((r) => studentMap.get(r.studentId)?.sinif || '').filter(Boolean)),
      ),
    [requests, studentMap],
  );

  const rooms = useMemo(
    () =>
      Array.from(
        new Set(
          requests
            .map((r) => {
              const st = studentMap.get(r.studentId);
              return st?.pansiyon ? String(st.oda) : '';
            })
            .filter(Boolean),
        ),
      ),
    [requests, studentMap],
  );

  const filteredRequests = useMemo(
    () =>
      requests.filter((r) => {
        const st = studentMap.get(r.studentId);
        if (!st) return false;
        if (filterClass !== 'All' && st.sinif !== filterClass) return false;
        if (filterRoom !== 'All' && String(st.oda) !== filterRoom) return false;
        if (
          filterParentApproval !== 'All' &&
          (r.parentApproval || 'pending') !== filterParentApproval
        )
          return false;
        return true;
      }),
    [requests, studentMap, filterClass, filterRoom, filterParentApproval],
  );

  const allSelected = filteredRequests.length > 0 && selectedIds.size === filteredRequests.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequests.map((r) => r._id)));
    }
  };

  const columns = useMemo<ColumnDef<EvciTalep>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-[var(--ink-2)]"
            aria-label={allSelected ? 'Seçimi kaldır' : 'Tümünü seç'}
          >
            {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
          </button>
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const checked = selectedIds.has(row.original._id);
          return (
            <button
              type="button"
              onClick={() => toggleSelect(row.original._id)}
              className="text-[var(--ink-2)]"
              aria-label={checked ? 'Seçimi kaldır' : 'Seç'}
            >
              {checked ? <CheckSquare size={14} /> : <Square size={14} />}
            </button>
          );
        },
      },
      {
        accessorKey: 'studentName',
        header: 'Öğrenci',
        cell: ({ row }) => {
          const r = row.original;
          const st = studentMap.get(r.studentId);
          return (
            <div className="flex flex-col">
              <span className="font-serif text-[var(--ink)]">
                {r.studentName || st?.adSoyad || '—'}
              </span>
              <span className="font-mono text-[10px] text-[var(--ink-dim)]">{r.studentId}</span>
            </div>
          );
        },
      },
      {
        id: 'class',
        header: 'Sınıf',
        accessorFn: (r) => {
          const st = studentMap.get(r.studentId);
          return st?.sinif ? `${st.sinif}${st.sube || ''}` : '—';
        },
        cell: (info) => (
          <span className="font-mono text-xs uppercase text-[var(--ink-dim)]">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        id: 'room',
        header: 'Oda',
        accessorFn: (r) => {
          const st = studentMap.get(r.studentId);
          return st?.pansiyon ? st.oda || '—' : '—';
        },
        cell: (info) => (
          <span className="font-mono text-xs text-[var(--ink-dim)]">{info.getValue<string>()}</span>
        ),
      },
      {
        id: 'period',
        header: 'Çıkış / Dönüş',
        accessorFn: (r) => `${r.startDate || '—'} → ${r.endDate || '—'}`,
        cell: (info) => (
          <span className="font-serif text-sm text-[var(--ink-2)]">{info.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'destination',
        header: 'Yer',
        cell: (info) => (
          <span className="font-serif text-sm text-[var(--ink-2)]">
            {info.getValue<string>() || '—'}
          </span>
        ),
      },
      {
        id: 'willGo',
        header: 'Durum',
        accessorFn: (r) => r.willGo,
        cell: ({ row }) => (
          <Chip tone={row.original.willGo ? 'outline' : 'default'}>
            {row.original.willGo ? 'Gidecek' : 'Gitmeyecek'}
          </Chip>
        ),
      },
      {
        id: 'parentApproval',
        header: 'Veli',
        accessorFn: (r) => r.parentApproval || 'pending',
        cell: ({ row }) => {
          const k = (row.original.parentApproval || 'pending') as ApprovalKey;
          return <Chip tone={APPROVAL_TONES[k]}>{APPROVAL_LABELS[k]}</Chip>;
        },
      },
      {
        id: 'adminStatus',
        header: 'Yönetici',
        accessorFn: (r) => r.status || 'pending',
        cell: ({ row }) => {
          const s = row.original.status;
          if (!s || s === 'pending') return <Chip tone="default">Beklemede</Chip>;
          if (s === 'approved') return <Chip tone="black">Onaylandı</Chip>;
          if (s === 'rejected') return <Chip tone="state">Reddedildi</Chip>;
          return <Chip tone="default">{s}</Chip>;
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          const adminPending = !r.status || r.status === 'pending';
          return (
            <div className="flex items-center justify-end gap-1">
              {adminPending && (
                <>
                  <button
                    type="button"
                    onClick={() => handleAdminAction(r._id, 'approve')}
                    className="text-[var(--ink-dim)] hover:text-[var(--ink)] p-1"
                    aria-label="Onayla"
                    title="Onayla"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdminAction(r._id, 'reject')}
                    className="text-[var(--ink-dim)] hover:text-[var(--state)] p-1"
                    aria-label="Reddet"
                    title="Reddet"
                  >
                    <X size={14} />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => handleDelete(r._id)}
                className="text-[var(--ink-dim)] hover:text-[var(--state)] p-1"
                aria-label="Sil"
                title="Sil"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        },
      },
    ],
    [allSelected, handleAdminAction, handleDelete, selectedIds, studentMap, toggleSelect],
  );

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${authUser?.rol || 'admin'}` },
    { label: 'Evci Talepleri Yönetimi' },
  ];

  if (isLoading) {
    return (
      <ModernDashboardLayout pageTitle="Evci Talepleri Yönetimi" breadcrumb={breadcrumb}>
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Evci Talepleri Yönetimi" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
              Belge No. {new Date().getFullYear()}/E-Y
            </div>
            <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Evci Talepleri Yönetimi</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/${authUser?.rol || 'admin'}/evci-istatistik`}>
              <Button variant="secondary" size="sm">
                <BarChart3 size={14} />
                İstatistikler
              </Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={() => setShowOverride((v) => !v)}>
              <Settings2 size={14} />
              Pencere
            </Button>
            <div className="relative">
              <Button variant="secondary" size="sm" onClick={() => setShowExportMenu((v) => !v)}>
                <Download size={14} />
                Dışa Aktar
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 z-20 bg-[var(--paper)] border border-[var(--rule)] shadow-lg min-w-[140px]">
                  <button
                    type="button"
                    onClick={() => handleExport('excel')}
                    className="block w-full text-left px-3 py-2 font-mono text-xs uppercase tracking-wider text-[var(--ink)] hover:bg-[var(--surface)]"
                  >
                    Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('pdf')}
                    className="block w-full text-left px-3 py-2 font-mono text-xs uppercase tracking-wider text-[var(--ink)] hover:bg-[var(--surface)] border-t border-[var(--rule)]"
                  >
                    PDF
                  </button>
                </div>
              )}
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus size={14} />
              {showForm ? 'Formu Gizle' : 'Evci Ekle'}
            </Button>
          </div>
        </header>

        {selectedIds.size > 0 && (
          <Card accentBar contentClassName="px-4 py-2 flex items-center gap-2 flex-wrap">
            <Chip tone="black">{selectedIds.size} seçili</Chip>
            <div className="flex-1" />
            <Button variant="primary" size="sm" onClick={() => handleBulkAction('approved')}>
              <Check size={14} />
              Toplu Onayla
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleBulkAction('rejected')}>
              <X size={14} />
              Toplu Reddet
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Seçimi Temizle
            </Button>
          </Card>
        )}

        {showOverride && (
          <Card>
            <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center gap-2">
              <Settings2 size={12} />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
                Talep Penceresi Override
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Hafta Başlangıcı (Pazartesi)">
                <Input
                  type="date"
                  value={overrideWeekOf}
                  onChange={(e) => setOverrideWeekOf(e.target.value)}
                />
              </Field>
              <Field label="Pencere Durumu">
                <select
                  value={overrideIsOpen ? 'true' : 'false'}
                  onChange={(e) => setOverrideIsOpen(e.target.value === 'true')}
                  className={selectClasses}
                >
                  <option value="true">Açık</option>
                  <option value="false">Kapalı</option>
                </select>
              </Field>
              <Field label="Sebep">
                <Input
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Tatil, sınav haftası…"
                  maxLength={500}
                />
              </Field>
            </div>
            <div className="px-4 pb-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowOverride(false)}>
                İptal
              </Button>
              <Button variant="primary" size="sm" onClick={handleWindowOverride}>
                Kaydet
              </Button>
            </div>
          </Card>
        )}

        {showForm && (
          <Card>
            <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center gap-2">
              <Plus size={12} />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
                Yeni Evci Talebi
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Öğrenci ID">
                <Input
                  value={newReq.studentId || ''}
                  onChange={(e) => setNewReq({ ...newReq, studentId: e.target.value })}
                  placeholder="Öğrenci ID"
                />
              </Field>
              <Field label="Öğrenci Adı">
                <Input
                  value={newReq.studentName || ''}
                  onChange={(e) => setNewReq({ ...newReq, studentName: e.target.value })}
                  placeholder="Öğrenci Adı"
                />
              </Field>
              <Field label="Başlangıç">
                <Input
                  type="date"
                  value={newReq.startDate || ''}
                  onChange={(e) => setNewReq({ ...newReq, startDate: e.target.value })}
                />
              </Field>
              <Field label="Bitiş">
                <Input
                  type="date"
                  value={newReq.endDate || ''}
                  onChange={(e) => setNewReq({ ...newReq, endDate: e.target.value })}
                />
              </Field>
              <Field label="Gideceği Yer">
                <Input
                  value={newReq.destination || ''}
                  onChange={(e) => setNewReq({ ...newReq, destination: e.target.value })}
                  placeholder="Gideceği yer"
                />
              </Field>
              <Field label="Durum">
                <select
                  value={newReq.willGo ? 'true' : 'false'}
                  onChange={(e) => setNewReq({ ...newReq, willGo: e.target.value === 'true' })}
                  className={selectClasses}
                >
                  <option value="true">Gidecek</option>
                  <option value="false">Gitmeyecek</option>
                </select>
              </Field>
            </div>
            <div className="px-4 pb-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewReq({ willGo: true });
                  setShowForm(false);
                }}
              >
                İptal
              </Button>
              <Button variant="primary" size="sm" onClick={saveNew} loading={isSubmitting}>
                Kaydet
              </Button>
            </div>
          </Card>
        )}

        <DataTable
          caption="Tablo I — Evci Talepleri"
          columns={columns}
          data={filteredRequests}
          paginated={false}
          emptyState="Filtrelenen kriterlere uygun evci talebi bulunamadı."
          toolbar={
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={12} className="text-[var(--ink-dim)]" />
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className={cn(selectClasses, 'h-8 min-w-[120px]')}
                aria-label="Sınıf filtrele"
              >
                <option value="All">Tüm Sınıflar</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                className={cn(selectClasses, 'h-8 min-w-[120px]')}
                aria-label="Oda filtrele"
              >
                <option value="All">Tüm Odalar</option>
                {rooms.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1 flex-wrap">
                {APPROVAL_FILTERS.map((f) => {
                  const active = filterParentApproval === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFilterParentApproval(f.key)}
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
              Sayfa {page} / {totalPages} · Toplam {totalCount} talep
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={14} />
                Önceki
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Sonraki
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {filteredRequests.some((r) => r.parentApproval === 'rejected' && r.rejectionReason) && (
          <Card contentClassName="p-4 space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)] border-b border-[var(--rule)] pb-1">
              Red Sebepleri
            </div>
            <ul className="space-y-1">
              {filteredRequests
                .filter((r) => r.parentApproval === 'rejected' && r.rejectionReason)
                .map((r) => {
                  const st = studentMap.get(r.studentId);
                  return (
                    <li key={r._id} className="flex items-start gap-2 text-sm">
                      <AlertCircle size={12} className="text-[var(--state)] mt-1 shrink-0" />
                      <span className="font-serif text-[var(--ink)]">
                        <strong>{r.studentName || st?.adSoyad || r.studentId}</strong>:{' '}
                        <span className="text-[var(--ink-2)]">{r.rejectionReason}</span>
                      </span>
                    </li>
                  );
                })}
            </ul>
          </Card>
        )}
      </div>
    </ModernDashboardLayout>
  );
}
