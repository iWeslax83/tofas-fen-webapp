import { useEffect, useState, useCallback, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Calendar, Download, Trash2, Upload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DormitoryService } from '../../utils/apiService';
import { cn } from '../../utils/cn';
import { safeConsoleError } from '../../utils/safeLogger';

interface SupervisorList {
  _id: string;
  month: string;
  year: number;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

const MONTHS: { value: string; label: string }[] = [
  { value: '01', label: 'Ocak' },
  { value: '02', label: 'Şubat' },
  { value: '03', label: 'Mart' },
  { value: '04', label: 'Nisan' },
  { value: '05', label: 'Mayıs' },
  { value: '06', label: 'Haziran' },
  { value: '07', label: 'Temmuz' },
  { value: '08', label: 'Ağustos' },
  { value: '09', label: 'Eylül' },
  { value: '10', label: 'Ekim' },
  { value: '11', label: 'Kasım' },
  { value: '12', label: 'Aralık' },
];

const MONTH_LABEL = MONTHS.reduce<Record<string, string>>((acc, m) => {
  acc[m.value] = m.label;
  return acc;
}, {});

const selectClasses = cn(
  'h-10 bg-transparent border-0 border-b border-[var(--rule)] px-1 text-sm',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--state)] focus:border-b-2',
  'transition-colors',
);

interface FieldProps {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}
const Field = ({ label, htmlFor, children }: FieldProps) => (
  <label htmlFor={htmlFor} className="flex flex-col gap-1">
    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
      {label}
    </span>
    {children}
  </label>
);

export default function SupervisorListPage() {
  const { user } = useAuthGuard(['admin', 'teacher', 'parent', 'student']);
  const [supervisorLists, setSupervisorLists] = useState<SupervisorList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMonth, setUploadMonth] = useState('');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = user?.rol === 'admin';

  const fetchSupervisorLists = useCallback(async () => {
    try {
      const { data, error: apiError } = await DormitoryService.getSupervisors({
        month: selectedMonth,
        year: selectedYear,
      });
      if (apiError) {
        toast.error(apiError);
      } else {
        setSupervisorLists((data as SupervisorList[]) || []);
      }
    } catch (err) {
      safeConsoleError('Error fetching supervisor lists:', err);
      toast.error('Belletmen listeleri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchSupervisorLists();
  }, [fetchSupervisorLists]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSupervisorLists();
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadMonth || !uploadYear) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('month', uploadMonth);
    formData.append('year', uploadYear.toString());
    try {
      const { error: apiError } = await DormitoryService.createSupervisor(formData);
      if (apiError) {
        toast.error(apiError);
      } else {
        toast.success('Belletmen listesi başarıyla yüklendi');
        setSelectedFile(null);
        setUploadMonth('');
        setUploadYear(new Date().getFullYear());
        const fileInput = document.getElementById(
          'supervisor-file-upload',
        ) as HTMLInputElement | null;
        if (fileInput) fileInput.value = '';
        await fetchSupervisorLists();
      }
    } catch (err) {
      safeConsoleError('Error uploading file:', err);
      toast.error('Dosya yüklenirken hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id: string, month: string, year: number) => {
    try {
      const response = await DormitoryService.downloadSupervisor(id);
      const blob = new Blob([(response as { data: BlobPart }).data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `belletmen-listesi-${month || 'tum'}-${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Dosya indiriliyor…');
    } catch (err) {
      safeConsoleError('Error downloading file:', err);
      toast.error('Dosya indirilirken hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Bu listeyi silmek istediğinize emin misiniz?')) return;
    try {
      const { error: apiError } = await DormitoryService.deleteSupervisor(id);
      if (apiError) {
        toast.error(apiError);
      } else {
        toast.success('Liste başarıyla silindi');
        setSupervisorLists((lists) => lists.filter((l) => l._id !== id));
      }
    } catch (err) {
      safeConsoleError('Error deleting supervisor list:', err);
      toast.error('Liste silinirken hata oluştu');
    }
  }, []);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const columns = useMemo<ColumnDef<SupervisorList>[]>(
    () => [
      {
        id: 'period',
        header: 'Dönem',
        accessorFn: (m) => `${MONTH_LABEL[m.month] || m.month} ${m.year}`,
        cell: (info) => (
          <span className="font-serif text-[var(--ink)]">{info.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'uploadedAt',
        header: 'Yükleme',
        cell: (info) => (
          <span className="font-mono text-xs text-[var(--ink-dim)]">
            {formatDate(info.getValue<string>())}
          </span>
        ),
      },
      {
        accessorKey: 'uploadedBy',
        header: 'Yükleyen',
        cell: (info) => (
          <span className="font-serif text-sm text-[var(--ink-2)]">{info.getValue<string>()}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(r._id, r.month, r.year)}
              >
                <Download size={14} />
                İndir
              </Button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDelete(r._id)}
                  className="text-[var(--ink-dim)] hover:text-[var(--state)] p-1"
                  aria-label="Sil"
                  title="Sil"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [handleDelete, isAdmin],
  );

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Belletmen Listesi' },
  ];

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Belletmen Listesi" breadcrumb={breadcrumb}>
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  const yearsBack = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const yearsForward = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() + i);

  return (
    <ModernDashboardLayout pageTitle="Belletmen Listesi" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
              Belge No. {new Date().getFullYear()}/B-L
            </div>
            <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Belletmen Listesi</h1>
          </div>
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Yenile
          </Button>
        </header>

        {isAdmin && (
          <Card>
            <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center gap-2">
              <Upload size={12} />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
                Yeni Belletmen Listesi Yükle
              </span>
            </div>
            <form onSubmit={handleFileUpload} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Ay" htmlFor="supervisor-upload-month">
                <select
                  id="supervisor-upload-month"
                  value={uploadMonth}
                  onChange={(e) => setUploadMonth(e.target.value)}
                  className={selectClasses}
                  required
                >
                  <option value="">Ay seçin</option>
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Yıl" htmlFor="supervisor-upload-year">
                <select
                  id="supervisor-upload-year"
                  value={uploadYear}
                  onChange={(e) => setUploadYear(Number(e.target.value))}
                  className={selectClasses}
                  required
                >
                  {yearsForward.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Dosya" htmlFor="supervisor-file-upload">
                <input
                  id="supervisor-file-upload"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx"
                  required
                  className="font-serif text-sm text-[var(--ink-2)] file:mr-3 file:px-3 file:py-1 file:border file:border-[var(--ink)] file:bg-transparent file:text-[var(--ink)] file:font-medium file:cursor-pointer"
                />
              </Field>
              <div className="md:col-span-3 flex justify-end">
                <Button type="submit" variant="primary" size="sm" loading={uploading}>
                  <Upload size={14} />
                  Belletmen Listesi Yükle
                </Button>
              </div>
            </form>
          </Card>
        )}

        <DataTable
          caption="Tablo I — Belletmen Listeleri"
          columns={columns}
          data={supervisorLists}
          emptyState="Filtrelenen kriterlere uygun belletmen listesi bulunamadı."
          toolbar={
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2">
                <Calendar size={12} className="text-[var(--ink-dim)]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
                  Ay
                </span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={cn(selectClasses, 'h-8 min-w-[100px]')}
                  aria-label="Ay filtrele"
                >
                  <option value="">Tüm Aylar</option>
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
                  Yıl
                </span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className={cn(selectClasses, 'h-8 min-w-[80px]')}
                  aria-label="Yıl filtrele"
                >
                  {yearsBack.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          }
        />
      </div>
    </ModernDashboardLayout>
  );
}
