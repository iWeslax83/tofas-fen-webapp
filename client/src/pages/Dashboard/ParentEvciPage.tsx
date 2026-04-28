import { useEffect, useState } from 'react';
import {
  Home,
  Calendar,
  MapPin,
  User,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip, type ChipProps } from '../../components/ui/Chip';
import { EvciService } from '../../utils/apiService';
import { cn } from '../../utils/cn';

interface EvciTalep {
  _id: string;
  studentId: string;
  studentName: string;
  startDate: string;
  endDate: string;
  destination: string;
  willGo: boolean;
  status: 'pending' | 'approved' | 'rejected';
  parentApproval: 'pending' | 'approved' | 'rejected';
  parentApprovalAt?: string;
  weekOf?: string;
  createdAt: string;
  updatedAt: string;
}

interface Student {
  id: string;
  adSoyad: string;
  sinif?: string;
  sube?: string;
  oda?: string;
  pansiyon?: boolean;
}

type ApprovalStatus = EvciTalep['parentApproval'];

const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Onay Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
};

const APPROVAL_TONES: Record<ApprovalStatus, ChipProps['tone']> = {
  pending: 'default',
  approved: 'black',
  rejected: 'state',
};

const selectClasses = cn(
  'h-9 bg-transparent border-0 border-b border-[var(--rule)] px-1 text-sm',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--state)] focus:border-b-2',
  'transition-colors',
);

const formatDate = (dateString: string) => {
  const parsed = new Date(dateString);
  if (isNaN(parsed.getTime())) return dateString;
  return parsed.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ParentEvciPage() {
  const { user: authUser } = useAuthGuard(['parent']);

  const [children, setChildren] = useState<Student[]>([]);
  const [requests, setRequests] = useState<EvciTalep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string>('all');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = async () => {
    if (!authUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: apiError } = await EvciService.getEvciRequestsByParent(authUser.id);
      if (apiError) {
        setError('Veriler yüklenirken bir hata oluştu: ' + apiError);
        return;
      }
      const response = data as { requests: EvciTalep[]; children: Student[] };
      setChildren(response.children || []);
      setRequests(response.requests || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Veriler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  useEffect(() => {
    if (!rejectModalOpen) return;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRejectModalOpen(false);
        setRejectingId(null);
        setRejectReason('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [rejectModalOpen]);

  const handleRefresh = async () => {
    await fetchData();
    toast.success('Veriler yenilendi');
  };

  const handleApprove = async (id: string) => {
    try {
      const { error: apiError } = await EvciService.approveEvciRequest(id);
      if (apiError) {
        toast.error('Onaylama hatası: ' + apiError);
        return;
      }
      setRequests((prev) =>
        prev.map((r) =>
          r._id === id
            ? {
                ...r,
                parentApproval: 'approved' as const,
                parentApprovalAt: new Date().toISOString(),
              }
            : r,
        ),
      );
      toast.success('Evci talebi onaylandı');
    } catch (err) {
      console.error('Error approving request:', err);
      toast.error('Onaylama sırasında bir hata oluştu');
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectingId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectingId) return;
    try {
      const { error: apiError } = await EvciService.rejectEvciRequest(
        rejectingId,
        rejectReason || undefined,
      );
      if (apiError) {
        toast.error('Reddetme hatası: ' + apiError);
        return;
      }
      setRequests((prev) =>
        prev.map((r) =>
          r._id === rejectingId
            ? {
                ...r,
                parentApproval: 'rejected' as const,
                parentApprovalAt: new Date().toISOString(),
              }
            : r,
        ),
      );
      toast.success('Evci talebi reddedildi');
      setRejectModalOpen(false);
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast.error('Reddetme sırasında bir hata oluştu');
    }
  };

  const filteredRequests =
    selectedChild === 'all' ? requests : requests.filter((r) => r.studentId === selectedChild);

  const breadcrumb = [{ label: 'Ana Sayfa', path: '/parent' }, { label: 'Evci Çıkış İşlemleri' }];

  if (isLoading) {
    return (
      <ModernDashboardLayout pageTitle="Evci Çıkış İşlemleri" breadcrumb={breadcrumb}>
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  if (error) {
    return (
      <ModernDashboardLayout pageTitle="Evci Çıkış İşlemleri" breadcrumb={breadcrumb}>
        <div className="p-6 max-w-xl">
          <Card contentClassName="px-4 py-3 flex items-center gap-2 border-l-4 border-[var(--state)]">
            <Chip tone="state">Hata</Chip>
            <span className="font-serif text-sm text-[var(--ink)] flex-1">{error}</span>
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              Tekrar Dene
            </Button>
          </Card>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Evci Çıkış İşlemleri" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Belge No. {new Date().getFullYear()}/E-V
          </div>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Evci Çıkış İşlemleri</h1>
        </header>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
              Öğrenci
            </span>
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className={cn(selectClasses, 'min-w-[180px]')}
              disabled={isLoading}
              aria-label="Öğrenci seçin"
            >
              <option value="all">Tüm Çocuklar</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.adSoyad} {child.sinif ? `(${child.sinif}${child.sube || ''})` : ''}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label="Yenile"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Yenile
          </Button>
        </div>

        {filteredRequests.length === 0 ? (
          <Card contentClassName="p-10 flex flex-col items-center text-center gap-3">
            <Home size={40} className="text-[var(--ink-dim)]" />
            <h3 className="font-serif text-lg text-[var(--ink)]">
              Henüz evci çıkış talebi bulunmuyor
            </h3>
            <p className="font-serif text-sm text-[var(--ink-2)]">
              Öğrencinize ait evci çıkış talepleri burada görünecektir.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.map((request) => {
              const status = request.parentApproval;
              return (
                <Card key={request._id} contentClassName="p-0">
                  <div className="px-4 py-2 border-b border-[var(--rule)] flex items-center gap-2 flex-wrap">
                    <Chip tone={request.willGo ? 'outline' : 'default'}>
                      {request.willGo ? 'Gidecek' : 'Gitmeyecek'}
                    </Chip>
                    <Chip tone={APPROVAL_TONES[status]}>{APPROVAL_LABELS[status]}</Chip>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                        Hedef
                      </div>
                      <h3 className="font-serif text-lg text-[var(--ink)] mt-0.5">
                        {request.willGo ? request.destination || 'Evci' : 'Evciye Gitmeyecek'}
                      </h3>
                    </div>

                    <div className="space-y-1.5">
                      <InfoRow icon={User} label="Öğrenci" value={request.studentName} />
                      {request.willGo && (
                        <>
                          <InfoRow
                            icon={Calendar}
                            label="Tarih"
                            value={`${formatDate(request.startDate)} → ${formatDate(request.endDate)}`}
                          />
                          <InfoRow icon={MapPin} label="Yer" value={request.destination} />
                        </>
                      )}
                      <InfoRow
                        icon={Clock}
                        label="Oluşturulma"
                        value={formatDate(request.createdAt)}
                      />
                    </div>

                    {status === 'pending' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-[var(--rule)]">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprove(request._id)}
                        >
                          <CheckCircle size={14} />
                          Onayla
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRejectClick(request._id)}
                        >
                          <XCircle size={14} />
                          Reddet
                        </Button>
                      </div>
                    )}

                    {status !== 'pending' && request.parentApprovalAt && (
                      <div className="pt-2 border-t border-[var(--rule)] flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                        <AlertCircle size={10} />
                        {status === 'approved' ? 'Onay' : 'Red'} ·{' '}
                        {formatDate(request.parentApprovalAt)}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {rejectModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setRejectModalOpen(false)}
          role="presentation"
        >
          <Card className="relative w-full max-w-md" contentClassName="p-0">
            <div onClick={(e) => e.stopPropagation()}>
              <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
                  Red Sebebi
                </span>
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="text-white hover:opacity-80"
                  aria-label="Kapat"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-3">
                <p className="font-serif text-sm text-[var(--ink-2)]">
                  Evci talebini neden reddettiğinizi belirtebilirsiniz (isteğe bağlı):
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Red sebebi…"
                  className={cn(
                    'w-full bg-transparent border-0 border-b border-[var(--rule)] px-1 py-2',
                    'text-[var(--ink)] placeholder:text-[var(--ink-dim)]',
                    'focus:outline-none focus:border-[var(--state)] focus:border-b-2 focus:pb-[7px]',
                    'transition-colors resize-y min-h-[4rem]',
                  )}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setRejectModalOpen(false)}>
                    İptal
                  </Button>
                  <Button variant="danger" size="sm" onClick={confirmReject}>
                    <XCircle size={14} />
                    Reddet
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </ModernDashboardLayout>
  );
}

interface InfoRowProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-3 text-sm">
      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
        <Icon size={10} />
        {label}
      </span>
      <span className="font-serif text-[var(--ink)]">{value}</span>
    </div>
  );
}
