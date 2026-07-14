import { useState, useEffect, useCallback } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { ScheduleService } from '../../utils/apiService';
import type { ClassSchedule, SchedulePeriod } from '../../types/schedule';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { cn } from '../../utils/cn';

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

const periodsFor = (schedule: ClassSchedule, day: string): SchedulePeriod[] =>
  schedule.schedule.find((d) => d.day === day)?.periods ?? [];

const lessonLabel = (p: SchedulePeriod): string =>
  [p.subject, p.teacherName, p.room].filter(Boolean).join(' · ');

export default function DersProgramiPage() {
  const { user } = useAuthGuard(['admin', 'teacher', 'student', 'parent']);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // One open day per class card; clicking the open day closes it again.
  const [openDays, setOpenDays] = useState<Record<string, string | undefined>>({});

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      // The server decides which classes this user may see -- a student gets
      // their own, a parent their children's, staff every class.
      const { data, error: fetchError } = await ScheduleService.getSchedules();
      if (fetchError) {
        setError(fetchError);
        return;
      }
      setSchedules(data);
      setError(null);
    } catch {
      setError('Ders programı yüklenirken bir hata oluştu.');
      toast.error('Ders programı yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchSchedules();
  }, [user, fetchSchedules]);

  const toggleDay = (classKey: string, day: string) => {
    setOpenDays((prev) => ({ ...prev, [classKey]: prev[classKey] === day ? undefined : day }));
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Ders Programı' },
  ];

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Ders Programı" breadcrumb={breadcrumb}>
        <div className="p-6 text-xs font-medium text-[var(--ink-dim)]">Yükleniyor…</div>
      </ModernDashboardLayout>
    );
  }

  if (error) {
    return (
      <ModernDashboardLayout pageTitle="Ders Programı" breadcrumb={breadcrumb}>
        <div className="p-6 max-w-xl">
          <Card contentClassName="px-4 py-3 flex items-center gap-2 border-l-4 border-[var(--state)]">
            <Chip tone="state">Hata</Chip>
            <span className="font-serif text-sm text-[var(--ink)] flex-1">{error}</span>
          </Card>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Ders Programı" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Ders Programı</h1>
        </header>

        {schedules.length === 0 ? (
          <Card contentClassName="p-10 flex flex-col items-center text-center gap-3">
            <BookOpen size={40} className="text-[var(--ink-dim)]" />
            <h3 className="font-serif text-lg text-[var(--ink)]">Ders programı bulunamadı</h3>
            <p className="font-serif text-sm text-[var(--ink-2)]">
              Sistemde kayıtlı ders programı bulunmuyor.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {schedules.map((schedule) => {
              const classKey = `${schedule.classLevel}-${schedule.classSection}`;
              const days = DAY_NAMES.filter((day) => periodsFor(schedule, day).length > 0);
              const openDay = openDays[classKey];
              const openPeriods = openDay ? periodsFor(schedule, openDay) : [];

              return (
                <Card key={schedule.id || classKey} contentClassName="p-0">
                  <div className="px-4 py-3 border-b border-[var(--rule)] flex items-center gap-3">
                    <BookOpen size={18} className="text-[var(--ink-dim)]" />
                    <div>
                      <div className="text-xs font-medium text-[var(--ink-dim)]">
                        {schedule.academicYear} · {schedule.semester}
                      </div>
                      <h2 className="font-serif text-lg text-[var(--ink)]">
                        {schedule.classLevel}/{schedule.classSection} Sınıfı
                      </h2>
                    </div>
                  </div>

                  {/* The day buttons stay a single row; the lessons open in one
                      full-width section below it. Putting the lessons inside the
                      grid made every cell in the row grow to match the open one,
                      so the other days looked like they had opened too. */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-px bg-[var(--rule)]">
                    {days.map((day) => {
                      const isOpen = openDay === day;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(classKey, day)}
                          className={cn(
                            'w-full px-3 py-2 flex items-center justify-between gap-2 transition-colors',
                            isOpen
                              ? 'bg-[var(--surface)]'
                              : 'bg-[var(--paper)] hover:bg-[var(--surface)]',
                          )}
                          aria-expanded={isOpen}
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-xs font-medium text-[var(--ink-dim)]">{day}</span>
                            <span className="font-serif text-sm text-[var(--ink)]">
                              {periodsFor(schedule, day).length} ders
                            </span>
                          </div>
                          <ChevronDown
                            size={14}
                            className={cn(
                              'text-[var(--ink-dim)] transition-transform',
                              isOpen && 'rotate-180',
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {openDay && (
                    <div className="border-t border-[var(--rule)]">
                      <ol className="divide-y divide-[var(--rule)]">
                        {openPeriods.map((p) => (
                          <li key={p.period} className="px-3 py-2 flex items-center gap-3 text-sm">
                            <span className="inline-flex items-center justify-center w-6 h-6 border border-[var(--rule)] font-mono text-[10px] text-[var(--ink-dim)] shrink-0">
                              {p.period}
                            </span>
                            <span className="font-serif text-[var(--ink)] truncate">
                              {lessonLabel(p)}
                            </span>
                            {p.startTime && (
                              <span className="ml-auto font-mono text-[10px] text-[var(--ink-dim)] shrink-0">
                                {p.startTime}
                                {p.endTime ? `–${p.endTime}` : ''}
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}
