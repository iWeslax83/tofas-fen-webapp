import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { LoadBar } from '../../components/SkeletonComponents';
import { SecureAPI } from '../../utils/api';
import { ACADEMIC_YEAR_ENDPOINTS } from '../../utils/apiEndpoints';
import { safeConsoleError } from '../../utils/safeLogger';

interface RolloverSnapshotEntry {
  userId: string;
  adSoyad: string;
  fromSinif: string;
  action: string;
}

interface AcademicYearRollover {
  rolloverId: string;
  fromYear: string;
  toYear: string;
  status: string;
  counts: Record<string, number>;
  snapshot: RolloverSnapshotEntry[];
  appliedAt?: string;
}

const ROLLOVER_QUERY_KEY = ['academicYearRollover', 'pending'] as const;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** "9->10" -> "9. sınıftan 10. sınıfa"; "graduate" -> "Mezun olacak". */
function formatCountLabel(key: string): string {
  if (key === 'graduate') return 'Mezun olacak';
  const match = key.match(/^(\d+)->(\d+)$/);
  if (match) {
    return `${match[1]}. sınıftan ${match[2]}. sınıfa`;
  }
  return key;
}

function isWithinLast30Days(appliedAt?: string): boolean {
  if (!appliedAt) return false;
  const appliedTime = new Date(appliedAt).getTime();
  if (Number.isNaN(appliedTime)) return false;
  return Date.now() - appliedTime <= THIRTY_DAYS_MS;
}

export default function OgretimYiliPage() {
  const { user } = useAuthContext();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const {
    data: rollover,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ROLLOVER_QUERY_KEY,
    queryFn: async () => {
      const res = await SecureAPI.get<unknown>(ACADEMIC_YEAR_ENDPOINTS.PENDING_ROLLOVER);
      const body = (res as { data: { rollover: AcademicYearRollover | null } }).data;
      return body.rollover;
    },
  });

  useEffect(() => {
    if (isError) {
      toast.error('Öğretim yılı geçişi bilgisi yüklenirken hata oluştu.');
    }
  }, [isError]);

  const invalidatePending = () => {
    queryClient.invalidateQueries({ queryKey: ROLLOVER_QUERY_KEY });
  };

  const proposeMutation = useMutation({
    mutationFn: async () => {
      const res = await SecureAPI.post<unknown>(ACADEMIC_YEAR_ENDPOINTS.PROPOSE_ROLLOVER);
      return (res as { data: unknown }).data;
    },
    onSuccess: () => {
      toast.success('Öğretim yılı geçişi hazırlandı.');
      invalidatePending();
    },
    onError: (err: unknown) => {
      safeConsoleError('Geçiş hazırlanırken hata oluştu:', err);
      toast.error('Geçiş hazırlanırken hata oluştu.');
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (rolloverId: string) => {
      const res = await SecureAPI.post<unknown>(ACADEMIC_YEAR_ENDPOINTS.APPLY_ROLLOVER(rolloverId));
      return (res as { data: unknown }).data;
    },
    onSuccess: () => {
      toast.success('Öğretim yılı geçişi uygulandı.');
      invalidatePending();
    },
    onError: (err: unknown) => {
      safeConsoleError('Geçiş uygulanırken hata oluştu:', err);
      toast.error('Geçiş uygulanırken hata oluştu.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (rolloverId: string) => {
      const res = await SecureAPI.delete<unknown>(
        ACADEMIC_YEAR_ENDPOINTS.CANCEL_ROLLOVER(rolloverId),
      );
      return (res as { data: unknown }).data;
    },
    onSuccess: () => {
      toast.success('Öğretim yılı geçişi iptal edildi.');
      invalidatePending();
    },
    onError: (err: unknown) => {
      safeConsoleError('Geçiş iptal edilirken hata oluştu:', err);
      toast.error('Geçiş iptal edilirken hata oluştu.');
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (rolloverId: string) => {
      const res = await SecureAPI.post<unknown>(
        ACADEMIC_YEAR_ENDPOINTS.ROLLBACK_ROLLOVER(rolloverId),
      );
      return (res as { data: unknown }).data;
    },
    onSuccess: () => {
      toast.success('Öğretim yılı geçişi geri alındı.');
      invalidatePending();
    },
    onError: (err: unknown) => {
      safeConsoleError('Geçiş geri alınırken hata oluştu:', err);
      toast.error('Geçiş geri alınırken hata oluştu.');
    },
  });

  const handlePropose = () => {
    proposeMutation.mutate();
  };

  const handleApply = async () => {
    if (!rollover) return;
    const ok = await confirm({
      title: 'Geçişi uygula',
      description: `${rollover.fromYear} → ${rollover.toYear} öğretim yılı geçişini uygulamak istediğinize emin misiniz? Bu işlem sınıf atlatma ve mezuniyet hesap kapatma adımlarını başlatır.`,
      confirmLabel: 'Uygula',
      variant: 'danger',
    });
    if (!ok) return;
    applyMutation.mutate(rollover.rolloverId);
  };

  const handleCancel = async () => {
    if (!rollover) return;
    const ok = await confirm({
      title: 'Geçişi iptal et',
      description: `${rollover.fromYear} → ${rollover.toYear} öğretim yılı geçiş önerisini iptal etmek istediğinize emin misiniz?`,
      confirmLabel: 'İptal Et',
      variant: 'danger',
    });
    if (!ok) return;
    cancelMutation.mutate(rollover.rolloverId);
  };

  const handleRollback = async () => {
    if (!rollover) return;
    const ok = await confirm({
      title: 'Geçişi geri al',
      description: `${rollover.fromYear} → ${rollover.toYear} öğretim yılı geçişini geri almak istediğinize emin misiniz? Bu, sınıf atlatma ve mezuniyet kapatma işlemlerini tersine çevirir.`,
      confirmLabel: 'Geri Al',
      variant: 'danger',
    });
    if (!ok) return;
    rollbackMutation.mutate(rollover.rolloverId);
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'admin'}` },
    { label: 'Öğretim Yılı Geçişi' },
  ];

  if (isLoading) {
    return (
      <ModernDashboardLayout pageTitle="Öğretim Yılı Geçişi" breadcrumb={breadcrumb}>
        <div className="p-6 max-w-xs">
          <LoadBar />
        </div>
      </ModernDashboardLayout>
    );
  }

  const graduateEntries = rollover?.snapshot.filter((s) => s.action === 'graduate') ?? [];
  const canRollback = rollover?.status === 'applied' && isWithinLast30Days(rollover.appliedAt);
  const canActOnProposal = rollover?.status === 'proposed';

  return (
    <ModernDashboardLayout pageTitle="Öğretim Yılı Geçişi" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Öğretim Yılı Geçişi</h1>
        </header>

        {rollover === null && (
          <div className="rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--surface)] shadow-[var(--shadow)] p-8 text-center space-y-4">
            <p className="text-sm text-[var(--ink-dim)]">
              Şu anda bekleyen bir öğretim yılı geçişi yok.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePropose}
              loading={proposeMutation.isPending}
            >
              Geçişi Şimdi Hazırla
            </Button>
          </div>
        )}

        {rollover && (
          <>
            <Card accentBar contentClassName="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] pb-4">
                <div>
                  <div className="text-xs font-medium text-[var(--ink-dim)]">
                    Öğretim Yılı Geçişi
                  </div>
                  <h2 className="font-serif text-xl text-[var(--ink)] mt-1">
                    {rollover.fromYear} → {rollover.toYear}
                  </h2>
                </div>
                <Chip tone={rollover.status === 'applied' ? 'ok' : 'default'}>
                  {rollover.status === 'proposed' && 'Öneri Bekliyor'}
                  {rollover.status === 'applied' && 'Uygulandı'}
                  {rollover.status === 'cancelled' && 'İptal Edildi'}
                  {rollover.status !== 'proposed' &&
                    rollover.status !== 'applied' &&
                    rollover.status !== 'cancelled' &&
                    rollover.status}
                </Chip>
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                {Object.entries(rollover.counts).map(([key, count]) => (
                  <div
                    key={key}
                    className="rounded-[var(--radius-sm)] border border-[var(--rule)] bg-[var(--paper)] p-4"
                  >
                    <div className="font-serif text-2xl text-[var(--ink)]">{count}</div>
                    <div className="text-xs font-medium text-[var(--ink-dim)] mt-1">
                      {formatCountLabel(key)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--rule)]">
                {canActOnProposal && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleApply}
                      loading={applyMutation.isPending}
                    >
                      Uygula
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCancel}
                      loading={cancelMutation.isPending}
                    >
                      İptal Et
                    </Button>
                  </>
                )}
                {canRollback && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleRollback}
                    loading={rollbackMutation.isPending}
                  >
                    Geri Al
                  </Button>
                )}
              </div>
            </Card>

            {graduateEntries.length > 0 && (
              <Card className="border-[var(--accent)]" contentClassName="p-6 space-y-3">
                <div>
                  <h3 className="font-serif text-lg text-[var(--ink)]">
                    Bu öğrencilerin hesabı kapatılacak
                  </h3>
                  <p className="text-sm text-[var(--ink-dim)] mt-1">
                    Mezun olacak öğrencilerin hesapları geçiş uygulandığında kapatılır.
                  </p>
                </div>
                <ul className="divide-y divide-[var(--rule)] border border-[var(--rule)] rounded-[var(--radius-sm)] overflow-hidden">
                  {graduateEntries.map((entry) => (
                    <li
                      key={entry.userId}
                      className="flex items-center justify-between gap-3 px-4 py-2 bg-[var(--paper)]"
                    >
                      <span className="font-serif text-sm text-[var(--ink)]">{entry.adSoyad}</span>
                      <span className="font-mono text-[10px] text-[var(--ink-dim)]">
                        {entry.fromSinif}. sınıf · {entry.userId}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>
    </ModernDashboardLayout>
  );
}
