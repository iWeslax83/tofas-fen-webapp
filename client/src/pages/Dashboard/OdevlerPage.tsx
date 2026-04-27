import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Download, X, Search } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { HomeworkService } from '../../utils/apiService';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { cn } from '../../utils/cn';

interface Homework {
  _id?: string;
  id?: string;
  title: string;
  content?: string;
  description?: string;
  subject: string;
  startDate?: string;
  endDate?: string;
  assignedDate?: string | Date;
  dueDate?: string | Date;
  date?: string;
  grade?: string;
  classLevel?: string;
  classSection?: string;
  file?: string;
  attachments?: string[];
  teacherId?: string;
  teacherName?: string;
  status?: string;
}

const SUBJECTS = [
  'Matematik',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Türkçe',
  'İngilizce',
  'Tarih',
  'Coğrafya',
  'Din Kültürü',
];

const formatDate = (raw: string | Date | undefined): string => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const dueChip = (raw: string | Date | undefined): { label: string; urgent: boolean } => {
  if (!raw) return { label: '—', urgent: false };
  const d = new Date(raw);
  if (isNaN(d.getTime())) return { label: '—', urgent: false };
  const days = Math.floor((d.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: 'Geçti', urgent: true };
  if (days === 0) return { label: 'Bugün', urgent: true };
  if (days === 1) return { label: 'Yarın', urgent: true };
  return { label: `${days} gün`, urgent: false };
};

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

const selectClasses = cn(
  'w-full bg-transparent border-0 border-b border-[var(--rule)] px-1 py-2',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--state)] focus:border-b-2 focus:pb-[7px]',
  'transition-colors',
);

export default function OdevlerPage() {
  const { user, isLoading: authLoading } = useAuthGuard(['admin', 'teacher', 'student', 'parent']);
  const [showModal, setShowModal] = useState(false);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const canEdit = user?.rol === 'teacher' || user?.rol === 'admin';

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await HomeworkService.getHomeworks();
        if (!cancelled) {
          setHomeworks(result.error ? [] : (result.data as Homework[]) || []);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Ödevi silmek istediğinize emin misiniz?')) return;
    const { error } = await HomeworkService.deleteHomework(id);
    if (error) {
      alert('Ödev silinirken hata oluştu: ' + error);
      return;
    }
    setHomeworks((hws) => hws.filter((hw) => hw._id !== id && hw.id !== id));
  };

  const visibleHomeworks = useMemo(() => {
    if (user?.rol === 'student') {
      const lvl = user.sinif ? String(user.sinif).replace(/[^0-9]/g, '') : '';
      if (!lvl) return [];
      return homeworks.filter((hw) => hw.classLevel === lvl || hw.grade === lvl);
    }
    if (user?.rol === 'parent') {
      const childLevels = (user.childrenSiniflar ?? [])
        .map((c) => (c.sinif ? String(c.sinif).replace(/[^0-9]/g, '') : ''))
        .filter(Boolean);
      if (childLevels.length === 0) return [];
      return homeworks.filter(
        (hw) =>
          (hw.classLevel && childLevels.includes(hw.classLevel)) ||
          (hw.grade && childLevels.includes(hw.grade)),
      );
    }
    return homeworks;
  }, [homeworks, user]);

  const searchedHomeworks = useMemo(() => {
    if (!search) return visibleHomeworks;
    const needle = search.toLowerCase();
    return visibleHomeworks.filter((hw) => hw.title.toLowerCase().includes(needle));
  }, [visibleHomeworks, search]);

  const columns = useMemo<ColumnDef<Homework>[]>(
    () => [
      {
        accessorKey: 'subject',
        header: 'Ders',
        cell: (info) => (
          <span className="font-mono text-[var(--ink-dim)] text-xs uppercase tracking-wider">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Başlık',
        cell: (info) => (
          <span className="font-serif text-[var(--ink)]">{info.getValue<string>()}</span>
        ),
        filterFn: 'includesString',
      },
      {
        id: 'class',
        header: 'Sınıf',
        accessorFn: (hw) =>
          `${hw.classLevel || hw.grade || '—'}${hw.classSection ? `/${hw.classSection}` : ''}`,
        cell: (info) => <span className="text-[var(--ink-2)]">{info.getValue<string>()}</span>,
      },
      {
        id: 'due',
        header: 'Bitiş',
        accessorFn: (hw) => hw.dueDate ?? hw.endDate ?? '',
        cell: (info) => {
          const raw = info.getValue<string | Date>();
          const { label, urgent } = dueChip(raw);
          return (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[var(--ink-dim)]">{formatDate(raw)}</span>
              <Chip tone={urgent ? 'state' : 'default'}>{label}</Chip>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const hw = row.original;
          return (
            <div className="flex items-center justify-end gap-2">
              {hw.file && (
                <a
                  href={hw.file}
                  download
                  className="text-[var(--ink-dim)] hover:text-[var(--ink)]"
                  aria-label="Dosyayı indir"
                  title="Dosyayı indir"
                >
                  <Download size={16} />
                </a>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleDelete(hw.id || hw._id || '')}
                  className="text-[var(--ink-dim)] hover:text-[var(--state)]"
                  aria-label="Ödevi sil"
                  title="Ödevi sil"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [canEdit],
  );

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Ödevler' },
  ];

  if (isLoading) {
    return (
      <ModernDashboardLayout pageTitle="Ödevler" breadcrumb={breadcrumb}>
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Ödevler" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Belge No. {new Date().getFullYear()}/Ö
          </div>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Ödevler</h1>
        </header>

        <DataTable
          caption="Tablo I — Ödev Listesi"
          columns={columns}
          data={searchedHomeworks}
          emptyState="Seçilen kriterlere uygun ödev bulunamadı."
          toolbar={
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search
                  size={14}
                  className="absolute left-1 top-1/2 -translate-y-1/2 text-[var(--ink-dim)] pointer-events-none"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Başlık ara…"
                  className="pl-6"
                />
              </div>
              {canEdit && (
                <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                  <Plus size={14} />
                  Yeni Ödev
                </Button>
              )}
            </div>
          }
        />
      </div>

      {showModal && (
        <NewHomeworkModal
          onClose={() => setShowModal(false)}
          onSuccess={(hws) => setHomeworks(hws)}
        />
      )}
    </ModernDashboardLayout>
  );
}

interface NewHomeworkModalProps {
  onClose: () => void;
  onSuccess: (homeworks: Homework[]) => void;
}

function NewHomeworkModal({ onClose, onSuccess }: NewHomeworkModalProps) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <Card
        className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        contentClassName="p-0"
      >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em]">Yeni Ödev</span>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:opacity-80"
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          </div>

          <form
            className="p-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (submitting) return;
              setSubmitting(true);
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);

              try {
                let fileUrl = '';
                const fileInput = form.querySelector('input[name="file"]') as HTMLInputElement;
                if (fileInput && fileInput.files && fileInput.files[0]) {
                  const uploadFormData = new FormData();
                  uploadFormData.append('file', fileInput.files[0]);
                  const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadFormData,
                    credentials: 'include',
                  });
                  if (response.ok) {
                    const result = await response.json();
                    fileUrl = result.url;
                  }
                }

                const homeworkData = {
                  title: formData.get('title') as string,
                  description: formData.get('content') as string,
                  subject: formData.get('subject') as string,
                  classLevel: formData.get('grade') as string,
                  classSection: (formData.get('section') as string) || 'A',
                  assignedDate: (formData.get('startDate') as string) || new Date().toISOString(),
                  dueDate: formData.get('endDate') as string,
                  attachments: fileUrl ? [fileUrl] : [],
                };

                const { error } = await HomeworkService.createHomework(homeworkData);
                if (error) {
                  alert(error);
                } else {
                  const { data } = await HomeworkService.getHomeworks();
                  onSuccess((data as Homework[]) || []);
                  onClose();
                }
              } catch {
                alert('Ödev eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Ödev Başlığı">
                <Input name="title" required placeholder="Ödev başlığını giriniz" />
              </Field>
              <Field label="Ders">
                <select name="subject" className={selectClasses} required>
                  <option value="">Ders Seçiniz</option>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Açıklama">
              <textarea
                name="content"
                rows={4}
                required
                placeholder="Ödev açıklamasını giriniz"
                className={cn(selectClasses, 'resize-y min-h-[6rem]')}
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Başlangıç">
                <Input name="startDate" type="date" required />
              </Field>
              <Field label="Bitiş">
                <Input name="endDate" type="date" required />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Sınıf">
                <select name="grade" className={selectClasses} required>
                  <option value="">Sınıf Seçiniz</option>
                  <option value="9">9. Sınıf</option>
                  <option value="10">10. Sınıf</option>
                  <option value="11">11. Sınıf</option>
                  <option value="12">12. Sınıf</option>
                </select>
              </Field>
              <Field label="Dosya (Opsiyonel)">
                <input
                  name="file"
                  type="file"
                  className="font-serif text-sm text-[var(--ink-2)] file:mr-3 file:px-3 file:py-1 file:border file:border-[var(--ink)] file:bg-transparent file:text-[var(--ink)] file:font-medium file:cursor-pointer"
                />
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                İptal
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                Ödevi Kaydet
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
