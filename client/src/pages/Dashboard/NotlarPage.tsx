import { useMemo, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useAuthContext } from '../../contexts/AuthContext';
import { useNotes } from '../../hooks/queries/noteQueries';
import {
  useDashboardOverview,
  type ParentOverview,
} from '../../hooks/queries/useDashboardOverview';
// Lazy so the heavy Recharts bundle (chart-vendor) only downloads once the
// grades table has rendered, instead of blocking the page on it.
const GradeTrendChart = lazy(() => import('../../components/charts/GradeTrendChart'));
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { DataTable } from '../../components/ui/DataTable';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadBar } from '../../components/SkeletonComponents';
import { cn } from '../../utils/cn';

const selectClasses = cn(
  'h-9 bg-[var(--paper)] dark:bg-[var(--surface-2)] border border-[var(--rule)] rounded-[var(--radius-sm)] px-3 text-sm',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-tint)]',
  'transition-colors',
);

export interface NoteEntry {
  _id?: string;
  id: string;
  studentName: string;
  lesson: string;
  exam1: number;
  exam2: number;
  oral: number;
  average: number;
  teacherName?: string;
  semester?: string;
  gradeLevel?: string;
  classSection?: string;
}

const averageTone = (avg: number): 'ok' | 'warn' | 'accent' => {
  if (avg >= 70) return 'ok';
  if (avg >= 50) return 'warn';
  return 'accent';
};

const formatNum = (n: number | undefined): string => (typeof n === 'number' ? n.toFixed(0) : '—');

const STUDENT_COLUMN: ColumnDef<NoteEntry> = {
  accessorKey: 'studentName',
  header: 'Öğrenci',
  cell: (info) => (
    <span className="font-serif text-[var(--ink)]">
      {info.getValue<string>()}
      {info.row.original.gradeLevel && (
        <span className="ml-1.5 text-xs font-medium text-[var(--ink-dim)]">
          {info.row.original.gradeLevel}
          {info.row.original.classSection}
        </span>
      )}
    </span>
  ),
};

const NOTE_COLUMNS: ColumnDef<NoteEntry>[] = [
  {
    accessorKey: 'lesson',
    header: 'Ders',
    cell: (info) => <span className="font-serif text-[var(--ink)]">{info.getValue<string>()}</span>,
  },
  {
    accessorKey: 'exam1',
    header: '1. Sınav',
    cell: (info) => (
      <span className="font-mono text-[var(--ink-2)]">{formatNum(info.getValue<number>())}</span>
    ),
  },
  {
    accessorKey: 'exam2',
    header: '2. Sınav',
    cell: (info) => (
      <span className="font-mono text-[var(--ink-2)]">{formatNum(info.getValue<number>())}</span>
    ),
  },
  {
    accessorKey: 'oral',
    header: 'Sözlü',
    cell: (info) => (
      <span className="font-mono text-[var(--ink-2)]">{formatNum(info.getValue<number>())}</span>
    ),
  },
  {
    accessorKey: 'average',
    header: 'Ortalama',
    cell: (info) => {
      const avg = info.getValue<number>();
      return <Chip tone={averageTone(avg)}>{avg.toFixed(1)}</Chip>;
    },
  },
];

export default function NotlarPage() {
  const { user } = useAuthContext();
  const isParent = user?.rol === 'parent';
  const isTeacher = user?.rol === 'teacher';

  // Parent needs the child list before it can ask for a specific child's
  // notes; teacher/student query notes directly (backend scopes the result).
  const overviewQuery = useDashboardOverview();
  const children = useMemo(() => {
    if (!isParent) return [];
    const overview = overviewQuery.data?.data?.overview as ParentOverview | null | undefined;
    return overview?.children || [];
  }, [isParent, overviewQuery.data]);

  // No child explicitly picked yet → default to the first one without an
  // effect (derived during render, so there's no extra re-render cascade).
  const [explicitChildId, setExplicitChildId] = useState<string>('');
  const selectedChildId = explicitChildId || children[0]?.id || '';

  const { data, isLoading, error, refetch } = useNotes(
    isParent && selectedChildId ? { studentId: selectedChildId } : undefined,
  );
  const notesEnabled = !isParent || !!selectedChildId;
  const notes: NoteEntry[] = useMemo(
    () => (notesEnabled ? (data?.data as unknown as NoteEntry[]) || [] : []),
    [notesEnabled, data],
  );

  const showChart = useMemo(() => {
    if (!user || (user.rol !== 'student' && user.rol !== 'parent')) return false;
    const semesterSet = new Set(notes.map((n) => n.semester).filter(Boolean));
    return semesterSet.size >= 2;
  }, [user, notes]);

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const pageTitle = isParent
    ? selectedChild
      ? `Notlar — ${selectedChild.adSoyad}`
      : 'Çocuğumun Notları'
    : isTeacher
      ? 'Sınıf Notları'
      : 'Notlarım';

  const columns = isTeacher ? [STUDENT_COLUMN, ...NOTE_COLUMNS] : NOTE_COLUMNS;

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: pageTitle },
  ];

  const loading = isLoading || (isParent && overviewQuery.isLoading);

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle={pageTitle} breadcrumb={breadcrumb}>
        <div className="p-6 max-w-xs">
          <LoadBar />
        </div>
      </ModernDashboardLayout>
    );
  }

  if (error) {
    return (
      <ModernDashboardLayout pageTitle={pageTitle} breadcrumb={breadcrumb}>
        <div className="p-6">
          <Card accentBar contentClassName="p-4 flex items-start gap-3">
            <AlertCircle className="text-[var(--accent)] shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <p className="font-serif text-[var(--ink)]">
                Notlar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.
              </p>
              <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-3">
                Tekrar Dene
              </Button>
            </div>
          </Card>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle={pageTitle} breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">{pageTitle}</h1>

          {isTeacher && (
            <Link to="/teacher/file-import">
              <Button variant="primary" size="sm">
                <Plus size={14} />
                Not Gir
              </Button>
            </Link>
          )}

          {isParent && children.length > 1 && (
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--ink-dim)]">Çocuk</span>
              <select
                value={selectedChildId}
                onChange={(e) => setExplicitChildId(e.target.value)}
                className={cn(selectClasses, 'min-w-[180px]')}
                aria-label="Çocuk seçin"
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.adSoyad} {child.sinif ? `(${child.sinif})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
        </header>

        {isParent && children.length === 0 ? (
          <Card contentClassName="p-6">
            <p className="font-serif text-sm text-[var(--ink-2)]">
              Hesabınıza bağlı bir öğrenci bulunamadı.
            </p>
          </Card>
        ) : (
          <div className={showChart ? 'grid lg:grid-cols-3 gap-6' : ''}>
            <div className={showChart ? 'lg:col-span-2' : ''}>
              <DataTable
                columns={columns}
                data={notes}
                emptyState={
                  isTeacher ? 'Girdiğiniz herhangi bir not bulunmuyor.' : 'Henüz not girilmemiş.'
                }
              />
            </div>
            {showChart && (
              <aside>
                <div className="text-sm font-semibold text-[var(--ink-2)] mb-3">Dönem Grafiği</div>
                <Suspense
                  fallback={
                    <div className="text-xs font-medium text-[var(--ink-dim)]">
                      Grafik yükleniyor…
                    </div>
                  }
                >
                  <GradeTrendChart notes={notes} />
                </Suspense>
              </aside>
            )}
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}
