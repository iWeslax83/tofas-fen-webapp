import { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useAuthContext } from '../../contexts/AuthContext';
import { useNotes } from '../../hooks/queries/noteQueries';
import GradeTrendChart from '../../components/charts/GradeTrendChart';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { DataTable } from '../../components/ui/DataTable';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

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

const averageTone = (avg: number): 'state' | 'black' | 'default' | 'outline' => {
  if (avg >= 85) return 'black';
  if (avg >= 70) return 'default';
  if (avg >= 50) return 'outline';
  return 'state';
};

const formatNum = (n: number | undefined): string => (typeof n === 'number' ? n.toFixed(0) : '—');

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
  const { data, isLoading, error, refetch } = useNotes();
  const notes: NoteEntry[] = (data?.data as unknown as NoteEntry[]) || [];

  const showChart = useMemo(() => {
    if (!user || (user.rol !== 'student' && user.rol !== 'parent')) return false;
    const semesterSet = new Set(notes.map((n) => n.semester).filter(Boolean));
    return semesterSet.size >= 2;
  }, [user, notes]);

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Notlarım' },
  ];

  if (isLoading) {
    return (
      <ModernDashboardLayout pageTitle="Notlarım" breadcrumb={breadcrumb}>
        <div className="p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Yükleniyor…
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  if (error) {
    return (
      <ModernDashboardLayout pageTitle="Notlarım" breadcrumb={breadcrumb}>
        <div className="p-6">
          <Card accentBar contentClassName="p-4 flex items-start gap-3">
            <AlertCircle className="text-[var(--state)] shrink-0 mt-0.5" size={18} />
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
    <ModernDashboardLayout pageTitle="Notlarım" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Belge No. {new Date().getFullYear()}/N-{user?.id ?? '—'}
          </div>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Notlarım</h1>
        </header>

        <div className={showChart ? 'grid lg:grid-cols-3 gap-6' : ''}>
          <div className={showChart ? 'lg:col-span-2' : ''}>
            <DataTable
              caption="Tablo I — Ders Notları"
              columns={NOTE_COLUMNS}
              data={notes}
              emptyState="Henüz not girilmemiş."
            />
          </div>
          {showChart && (
            <aside>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)] mb-2">
                Tablo II — Dönem Grafiği
              </div>
              <GradeTrendChart notes={notes} />
            </aside>
          )}
        </div>
      </div>
    </ModernDashboardLayout>
  );
}
