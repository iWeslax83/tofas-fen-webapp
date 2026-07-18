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
  // Every day starts open per class card so the page shows the full week at
  // a glance; clicking a day toggles just that one closed/open again.
  const [openDays, setOpenDays] = useState<Record<string, Set<string>>>({});

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

  // Default every class card's days to open the first time it's seen; leave
  // any days the user has already toggled alone on refetch.
  useEffect(() => {
    setOpenDays((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const schedule of schedules) {
        const classKey = `${schedule.classLevel}-${schedule.classSection}`;
        if (next[classKey]) continue;
        const days = DAY_NAMES.filter((day) => periodsFor(schedule, day).length > 0);
        next[classKey] = new Set(days);
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [schedules]);

  const toggleDay = (classKey: string, day: string) => {
    setOpenDays((prev) => {
      const current = new Set(prev[classKey] ?? []);
      if (current.has(day)) {
        current.delete(day);
      } else {
        current.add(day);
      }
      return { ...prev, [classKey]: current };
    });
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
              const openSet = openDays[classKey] ?? new Set(days);

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

                  <div className="divide-y divide-[var(--rule)]">
                    {days.map((day) => {
                      const isOpen = openSet.has(day);
                      const periods = periodsFor(schedule, day);
                      return (
                        <div key={day}>
                          <button
                            type="button"
                            onClick={() => toggleDay(classKey, day)}
                            className={cn(
                              'w-full px-4 py-2 flex items-center justify-between gap-2 transition-colors',
                              'bg-[var(--paper)] hover:bg-[var(--surface)]',
                            )}
                            aria-expanded={isOpen}
                          >
                            <span className="font-serif text-sm text-[var(--ink)]">
                              {day}{' '}
                              <span className="text-xs font-medium text-[var(--ink-dim)]">
                                · {periods.length} ders
                              </span>
                            </span>
                            <ChevronDown
                              size={14}
                              className={cn(
                                'text-[var(--ink-dim)] transition-transform',
                                isOpen && 'rotate-180',
                              )}
                            />
                          </button>

                          {isOpen && (
                            <ol className="divide-y divide-[var(--rule)] border-t border-[var(--rule)]">
                              {periods.map((p) => (
                                <li
                                  key={p.period}
                                  className="px-4 py-2 flex items-center gap-3 text-sm"
                                >
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
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}
