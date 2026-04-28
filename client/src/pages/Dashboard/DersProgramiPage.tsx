import { useState, useEffect, useCallback } from 'react';
import { BookOpen, ChevronDown, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { UserService } from '../../utils/apiService';
import type { User } from '../../types/user';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { cn } from '../../utils/cn';
import scheduleData from './DersProgramlari.json';

interface DaySchedule {
  Pazartesi?: string[];
  Salı?: string[];
  Çarşamba?: string[];
  Perşembe?: string[];
  Cuma?: string[];
  [key: string]: string[] | undefined;
}

interface ClassSchedule {
  [key: string]: DaySchedule;
}

interface Schedule {
  [key: string]: ClassSchedule;
}

const isSchedule = (data: unknown): data is Schedule => data !== null && typeof data === 'object';

const schedules = isSchedule(scheduleData) ? scheduleData : {};

const DAY_NAMES: (keyof DaySchedule)[] = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

interface ClassEntry {
  sinif: string;
  sube: string;
  label: string;
}

export default function DersProgramiPage() {
  const { user: authUser } = useAuthGuard(['admin', 'teacher', 'student', 'parent']);
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const getClassSchedule = (sinif: string, sube: string): DaySchedule | null => {
    const classData = (schedules as Record<string, ClassSchedule>)[sinif];
    if (!classData) return null;
    return classData[sube] || null;
  };

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: userData, error: userError } = await UserService.getCurrentUser();
      if (
        userError ||
        !userData ||
        !['admin', 'teacher', 'student', 'parent'].includes(userData.rol)
      ) {
        setError(userError || 'Bu sayfaya erişim yetkiniz bulunmuyor.');
        setLoading(false);
        return;
      }

      setUser(userData);
      let allClasses: ClassEntry[] = [];

      if (userData.rol === 'student' && userData.sinif && userData.sube) {
        allClasses.push({
          sinif: userData.sinif,
          sube: userData.sube,
          label: `${String(userData.sinif)}/${String(userData.sube)} · ${userData.adSoyad}`,
        });
      }
      if (userData.rol === 'parent' && userData.childrenSiniflar) {
        userData.childrenSiniflar.forEach((child) => {
          allClasses.push({
            sinif: child.sinif,
            sube: child.sube,
            label: `${String(child.sinif)}/${String(child.sube)} · ${child.adSoyad || 'Çocuk'}`,
          });
        });
      }
      if (['teacher', 'admin'].includes(userData.rol)) {
        allClasses = [
          { sinif: '9', sube: 'A', label: '9/A Sınıfı' },
          { sinif: '9', sube: 'B', label: '9/B Sınıfı' },
          { sinif: '10', sube: 'A', label: '10/A Sınıfı' },
          { sinif: '10', sube: 'B', label: '10/B Sınıfı' },
          { sinif: '11', sube: 'A', label: '11/A Sınıfı' },
          { sinif: '11', sube: 'B', label: '11/B Sınıfı' },
          { sinif: '12', sube: 'A', label: '12/A Sınıfı' },
          { sinif: '12', sube: 'B', label: '12/B Sınıfı' },
        ];
      }

      setClasses(allClasses);
      setError(null);
    } catch {
      setError('Kullanıcı bilgileri yüklenirken bir hata oluştu.');
      toast.error('Ders programı yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) fetchUserData();
  }, [authUser, fetchUserData]);

  const toggleDay = (key: string) => {
    setExpandedDays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Ders Programı' },
  ];

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Ders Programı" breadcrumb={breadcrumb}>
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yükleniyor…
        </div>
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
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Belge No. {new Date().getFullYear()}/D-P
          </div>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Ders Programı</h1>
        </header>

        {classes.length === 0 ? (
          <Card contentClassName="p-10 flex flex-col items-center text-center gap-3">
            <BookOpen size={40} className="text-[var(--ink-dim)]" />
            <h3 className="font-serif text-lg text-[var(--ink)]">Ders programı bulunamadı</h3>
            <p className="font-serif text-sm text-[var(--ink-2)]">
              Sistemde kayıtlı ders programı bulunmuyor.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {classes.map(({ sinif, sube, label }) => {
              const schedule = getClassSchedule(sinif, sube);
              if (!schedule) return null;
              return (
                <Card key={`${sinif}-${sube}`} contentClassName="p-0">
                  <div className="px-4 py-3 border-b border-[var(--rule)] flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <BookOpen size={18} className="text-[var(--ink-dim)]" />
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
                          Sınıf {sinif} · Şube {sube}
                        </div>
                        <h2 className="font-serif text-lg text-[var(--ink)]">{label}</h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                      <Clock size={10} />
                      Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-px bg-[var(--rule)]">
                    {DAY_NAMES.map((day) => {
                      if (!schedule[day]) return null;
                      const lessons = schedule[day] || [];
                      const key = `${sinif}-${sube}-${day}`;
                      const isExpanded = !!expandedDays[key];
                      return (
                        <div key={key} className="bg-[var(--paper)]">
                          <button
                            type="button"
                            onClick={() => toggleDay(key)}
                            className="w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-[var(--surface)] transition-colors"
                            aria-expanded={isExpanded}
                          >
                            <div className="flex flex-col items-start">
                              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                                {day}
                              </span>
                              <span className="font-serif text-sm text-[var(--ink)]">
                                {lessons.length} ders
                              </span>
                            </div>
                            <ChevronDown
                              size={14}
                              className={cn(
                                'text-[var(--ink-dim)] transition-transform',
                                isExpanded && 'rotate-180',
                              )}
                            />
                          </button>
                          {isExpanded && (
                            <ol className="border-t border-[var(--rule)] divide-y divide-[var(--rule)]">
                              {lessons.map((lesson, i) => (
                                <li key={i} className="px-3 py-2 flex items-center gap-3 text-sm">
                                  <span className="inline-flex items-center justify-center w-6 h-6 border border-[var(--rule)] font-mono text-[10px] text-[var(--ink-dim)] shrink-0">
                                    {i + 1}
                                  </span>
                                  <span className="font-serif text-[var(--ink)] truncate">
                                    {lesson}
                                  </span>
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
