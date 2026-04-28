import { useEffect, useState, useCallback, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Calendar, Download, Upload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DormitoryService } from '../../utils/apiService';
import { cn } from '../../utils/cn';

interface MealList {
  _id: string;
  month: string;
  year: number;
  uploadedAt: string;
  uploadedBy: string;
  fileUrl: string;
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

export default function MealListPage() {
  const { user } = useAuthContext();
  const [mealLists, setMealLists] = useState<MealList[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMonth, setUploadMonth] = useState('');
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = user?.rol === 'admin';

  const fetchMealLists = useCallback(
    async (retryCount = 0) => {
      const maxRetries = 3;
      try {
        setError(null);
        const { data, error: apiError } = await DormitoryService.getMeals({
          month: selectedMonth,
          year: selectedYear,
        });
        if (apiError) {
          if (retryCount < maxRetries) {
            setTimeout(() => fetchMealLists(retryCount + 1), Math.pow(2, retryCount) * 1000);
            return;
          }
          setError(apiError);
        } else {
          setMealLists(Array.isArray(data) ? (data as MealList[]) : []);
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number; data?: { retryAfter?: number } } })
          ?.response;
        if (status?.status === 429 && retryCount < maxRetries) {
          const retryAfter = status.data?.retryAfter || Math.pow(2, retryCount);
          setTimeout(() => fetchMealLists(retryCount + 1), retryAfter * 1000);
          return;
        }
        if (retryCount < maxRetries) {
          setTimeout(() => fetchMealLists(retryCount + 1), Math.pow(2, retryCount) * 1000);
          return;
        }
        setError('Yemek listeleri yüklenirken bir hata oluştu.');
        toast.error('Yemek listeleri yüklenirken bir hata oluştu.');
      } finally {
        if (retryCount === 0) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [selectedMonth, selectedYear],
  );

  useEffect(() => {
    fetchMealLists();
  }, [fetchMealLists]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMealLists();
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
      const { error: apiError } = await DormitoryService.createMeal(formData);
      if (apiError) {
        toast.error(apiError);
      } else {
        toast.success('Yemek listesi başarıyla yüklendi');
        setSelectedFile(null);
        setUploadMonth('');
        setUploadYear(new Date().getFullYear());
        const fileInput = document.getElementById('meal-file-upload') as HTMLInputElement | null;
        if (fileInput) fileInput.value = '';
        await fetchMealLists();
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      toast.error('Dosya yüklenirken hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const response = await DormitoryService.downloadMeal(id);
      const r = response as {
        data: BlobPart;
        headers?: { 'content-type'?: string };
      };
      const blob = new Blob([r.data], {
        type: r.headers?.['content-type'] || 'application/octet-stream',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `yemek-listesi-${selectedMonth || 'tum'}-${selectedYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      toast.error('Dosya indirilirken hata oluştu');
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const columns = useMemo<ColumnDef<MealList>[]>(
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
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={() => handleDownload(row.original._id)}>
              <Download size={14} />
              İndir
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Yemek Listesi' },
  ];

  if (loading && !isRefreshing) {
    return (
      <ModernDashboardLayout pageTitle="Yemek Listesi" breadcrumb={breadcrumb}>
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  if (error) {
    return (
      <ModernDashboardLayout pageTitle="Yemek Listesi" breadcrumb={breadcrumb}>
        <div className="p-6 max-w-xl">
          <Card contentClassName="px-4 py-3 flex items-center gap-2 border-l-4 border-[var(--state)]">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--state)]">
              Hata
            </span>
            <span className="font-serif text-sm text-[var(--ink)] flex-1">{error}</span>
            <Button variant="secondary" size="sm" onClick={handleRefresh} loading={isRefreshing}>
              Tekrar Dene
            </Button>
          </Card>
        </div>
      </ModernDashboardLayout>
    );
  }

  const yearsBack = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const yearsForward = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() + i);

  return (
    <ModernDashboardLayout pageTitle="Yemek Listesi" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
              Belge No. {new Date().getFullYear()}/Y-L
            </div>
            <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Yemek Listesi</h1>
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
                Yeni Yemek Listesi Yükle
              </span>
            </div>
            <form onSubmit={handleFileUpload} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Ay" htmlFor="meal-upload-month">
                <select
                  id="meal-upload-month"
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
              <Field label="Yıl" htmlFor="meal-upload-year">
                <select
                  id="meal-upload-year"
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
              <Field label="Dosya" htmlFor="meal-file-upload">
                <input
                  id="meal-file-upload"
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
                  Yükle
                </Button>
              </div>
            </form>
          </Card>
        )}

        <DataTable
          caption="Tablo I — Yemek Listeleri"
          columns={columns}
          data={mealLists}
          emptyState="Filtrelenen kriterlere uygun yemek listesi bulunamadı."
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
