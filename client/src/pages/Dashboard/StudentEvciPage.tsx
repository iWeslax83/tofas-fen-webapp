import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  Calendar,
  MapPin,
  Edit,
  Trash2,
  Plus,
  Timer,
  AlertCircle,
  Copy,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip, type ChipProps } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { EvciService } from '../../utils/apiService';
import { cn } from '../../utils/cn';

interface EvciTalep {
  _id?: string;
  studentId: string;
  studentName: string;
  startDate: string;
  endDate: string;
  destination: string;
  willGo: boolean;
  createdAt: string;
  parentApproval?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  weekOf?: string;
}

interface SubmissionWindow {
  isOpen: boolean;
  reason?: string;
  windowStart: string;
  windowEnd: string;
  nextWindowStart: string;
  serverTime: string;
  weekOf: string;
}

type FormErrors = Partial<Pick<EvciTalep, 'startDate' | 'endDate' | 'destination'>>;
type ApprovalStatus = NonNullable<EvciTalep['parentApproval']>;

const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Veli Onayı Bekleniyor',
  approved: 'Veli Onayladı',
  rejected: 'Veli Reddetti',
};

const APPROVAL_TONES: Record<ApprovalStatus, ChipProps['tone']> = {
  pending: 'default',
  approved: 'black',
  rejected: 'state',
};

const DAYS_OF_WEEK = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
] as const;

const selectClasses = cn(
  'w-full bg-transparent border-0 border-b border-[var(--rule)] px-1 py-2',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--state)] focus:border-b-2 focus:pb-[7px]',
  'transition-colors',
);

function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0sn';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}g`);
  if (hours > 0) parts.push(`${hours}s`);
  if (minutes > 0) parts.push(`${minutes}dk`);
  return parts.join(' ') || '<1dk';
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
}

const Field = ({ label, children, error }: FieldProps) => (
  <label className="flex flex-col gap-1">
    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
      {label}
    </span>
    {children}
    {error && <span className="font-mono text-[10px] text-[var(--state)]">{error}</span>}
  </label>
);

const StudentEvciPage = () => {
  const { user: authUser } = useAuthGuard(['student']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [requests, setRequests] = useState<EvciTalep[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<EvciTalep & { startTime?: string; endTime?: string }>>({
    willGo: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [submissionWindow, setSubmissionWindow] = useState<SubmissionWindow | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  const fetchSubmissionWindow = useCallback(async () => {
    try {
      const { data } = await EvciService.getSubmissionWindow();
      if (data && typeof data === 'object') {
        const sw = data as SubmissionWindow;
        if (sw.windowEnd && sw.nextWindowStart && !isNaN(new Date(sw.windowEnd).getTime())) {
          setSubmissionWindow(sw);
        }
      }
    } catch (err) {
      console.error('Error fetching submission window:', err);
    }
  }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!authUser) return;
      try {
        setLoading(true);
        const { data, error: apiError } = await EvciService.getEvciRequestsByStudent(authUser.id);
        if (apiError) {
          setError('Evci talepleri yüklenirken hata oluştu.');
          console.error('Error fetching evci requests:', apiError);
        } else {
          setRequests((data as EvciTalep[]) || []);
        }
      } catch (err) {
        setError('Evci talepleri yüklenirken bir hata oluştu.');
        console.error('Error fetching evci requests:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
    fetchSubmissionWindow();
  }, [authUser, fetchSubmissionWindow]);

  useEffect(() => {
    if (!modalOpen) return;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!submissionWindow) return;
    const updateCountdown = () => {
      const now = new Date();
      if (submissionWindow.isOpen) {
        const end = new Date(submissionWindow.windowEnd);
        if (isNaN(end.getTime())) {
          setCountdown('');
          return;
        }
        setCountdown(formatCountdown(Math.max(0, end.getTime() - now.getTime())));
      } else {
        const next = new Date(submissionWindow.nextWindowStart);
        if (isNaN(next.getTime())) {
          setCountdown('');
          return;
        }
        setCountdown(formatCountdown(Math.max(0, next.getTime() - now.getTime())));
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [submissionWindow]);

  const validate = (): FormErrors => {
    const err: FormErrors = {};
    if (form.willGo) {
      if (!form.startDate) err.startDate = 'Çıkış günü seçin.';
      if (!form.endDate) err.endDate = 'Dönüş günü seçin.';
      if (!form.destination) err.destination = 'Lütfen yer girin.';
    }
    return err;
  };

  const lastTemplate = requests.find((r) => r.willGo && r.destination);

  const handleNew = () => {
    if (!authUser) return;
    if (submissionWindow && !submissionWindow.isOpen) {
      toast.error('Talep penceresi kapalı. Pazartesi-Perşembe arasında talep oluşturabilirsiniz.');
      return;
    }
    if (submissionWindow?.weekOf) {
      const thisWeekReqs = requests.filter(
        (r) => r.weekOf === submissionWindow.weekOf && r.parentApproval !== 'rejected',
      );
      if (thisWeekReqs.length > 0) {
        toast.error('Bu hafta için zaten bir evci talebiniz var.');
        return;
      }
    }
    setEditingIndex(null);
    setForm({ willGo: true });
    setErrors({});
    setModalOpen(true);
  };

  const applyTemplate = () => {
    if (lastTemplate) {
      setForm((prev) => ({ ...prev, destination: lastTemplate.destination }));
      toast.success('Geçen haftaki yer bilgisi uygulandı');
    }
  };

  const parseDayAndTime = (value?: string): { day: string; time: string } => {
    if (!value) return { day: '', time: '' };
    const parts = value.split(' ');
    if ((DAYS_OF_WEEK as readonly string[]).includes(parts[0])) {
      return { day: parts[0], time: parts[1] || '' };
    }
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const dayMap = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      const hours = String(date.getHours()).padStart(2, '0');
      const mins = String(date.getMinutes()).padStart(2, '0');
      return { day: dayMap[date.getDay()], time: `${hours}:${mins}` };
    }
    return { day: value, time: '' };
  };

  const handleEdit = (idx: number) => {
    const req = requests[idx];
    if (req.parentApproval === 'approved') {
      toast.error('Veli tarafından onaylanmış talep düzenlenemez.');
      return;
    }
    const start = parseDayAndTime(req.startDate);
    const end = parseDayAndTime(req.endDate);
    setEditingIndex(idx);
    setForm({
      ...req,
      startDate: start.day,
      startTime: start.time,
      endDate: end.day,
      endTime: end.time,
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleDelete = async (idx: number) => {
    if (!authUser) return;
    const target = requests[idx];
    if (target.parentApproval === 'approved') {
      toast.error('Veli tarafından onaylanmış talep silinemez.');
      return;
    }
    if (!window.confirm('Talebi iptal etmek istediğinize emin misiniz?')) return;
    if (!target._id) return;
    try {
      const { error: apiError } = await EvciService.deleteEvciRequest(target._id);
      if (apiError) {
        toast.error('Talep silinirken hata oluştu: ' + apiError);
      } else {
        setRequests(requests.filter((r) => r._id !== target._id));
        toast.success('Talep iptal edildi.');
      }
    } catch (err) {
      console.error('Error deleting evci request:', err);
      toast.error('Talep silinirken hata oluştu.');
    }
  };

  const handleSubmit = async () => {
    if (!authUser) return;
    const vErr = validate();
    if (Object.keys(vErr).length) {
      setErrors(vErr);
      return;
    }
    const startDateTime =
      form.startDate && form.startTime
        ? `${form.startDate} ${form.startTime}`
        : form.startDate || '';
    const endDateTime =
      form.endDate && form.endTime ? `${form.endDate} ${form.endTime}` : form.endDate || '';

    try {
      if (editingIndex !== null) {
        const target = requests[editingIndex];
        if (!target._id) return;
        const { error: apiError } = await EvciService.updateEvciRequest(target._id, {
          startDate: startDateTime,
          endDate: endDateTime,
          destination: form.destination || '',
          willGo: form.willGo || false,
        });
        if (apiError) {
          toast.error('Talep güncellenirken hata oluştu: ' + apiError);
        } else {
          const updated = [...requests];
          updated[editingIndex] = {
            ...updated[editingIndex],
            startDate: startDateTime,
            endDate: endDateTime,
            destination: form.destination || '',
            willGo: form.willGo || false,
          };
          setRequests(updated);
          setModalOpen(false);
          toast.success('Talep güncellendi.');
        }
      } else {
        const { data, error: apiError } = await EvciService.createEvciRequest({
          studentId: authUser.id,
          startDate: startDateTime,
          endDate: endDateTime,
          destination: form.destination || '',
          willGo: form.willGo || false,
        });
        if (apiError) {
          toast.error('Talep oluşturulurken hata oluştu: ' + apiError);
        } else {
          const created = data as { _id?: string; weekOf?: string };
          const newRequest: EvciTalep = {
            _id: created?._id,
            studentId: authUser.id,
            studentName: authUser.adSoyad,
            startDate: startDateTime,
            endDate: endDateTime,
            destination: form.destination || '',
            willGo: form.willGo || false,
            createdAt: new Date().toISOString(),
            parentApproval: 'pending',
            weekOf: created?.weekOf,
          };
          setRequests([newRequest, ...requests]);
          setModalOpen(false);
          toast.success('Talep gönderildi. Veli onayı bekleniyor.');
        }
      }
    } catch (err) {
      console.error('Error submitting evci request:', err);
      toast.error('Talep işlenirken hata oluştu.');
    }
  };

  const breadcrumb = [{ label: 'Ana Sayfa', path: '/student' }, { label: 'Evci İşlemleri' }];

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Evci İşlemleri" breadcrumb={breadcrumb}>
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  if (error) {
    return (
      <ModernDashboardLayout pageTitle="Evci İşlemleri" breadcrumb={breadcrumb}>
        <div className="p-6 max-w-xl">
          <Card contentClassName="px-4 py-3 flex items-center gap-2 border-l-4 border-[var(--state)]">
            <Chip tone="state">Hata</Chip>
            <span className="font-serif text-sm text-[var(--ink)] flex-1">{error}</span>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Yeniden Dene
            </Button>
          </Card>
        </div>
      </ModernDashboardLayout>
    );
  }

  if (!authUser?.oda) {
    return (
      <ModernDashboardLayout pageTitle="Evci İşlemleri" breadcrumb={breadcrumb}>
        <div className="p-6 max-w-xl">
          <Card contentClassName="p-8 flex flex-col items-center text-center gap-4">
            <Home size={56} className="text-[var(--ink-dim)]" />
            <h3 className="font-serif text-xl text-[var(--ink)]">Evci Talepleri</h3>
            <p className="font-serif text-sm text-[var(--ink-2)]">
              Evci talepleri sadece yatılı öğrenciler için geçerlidir.
            </p>
            <Link to="/student">
              <Button variant="primary" size="sm">
                <ArrowLeft size={14} />
                Ana Sayfaya Dön
              </Button>
            </Link>
          </Card>
        </div>
      </ModernDashboardLayout>
    );
  }

  const windowIsOpen = submissionWindow?.isOpen ?? true;

  return (
    <ModernDashboardLayout pageTitle="Evci İşlemleri" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Belge No. {new Date().getFullYear()}/E
          </div>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Pansiyon Evci Taleplerim</h1>
        </header>

        {submissionWindow && (
          <Card
            accentBar={!windowIsOpen}
            contentClassName={cn(
              'flex items-center gap-3 px-4 py-3',
              windowIsOpen ? 'bg-[var(--surface)]' : '',
            )}
          >
            <Timer size={16} className="text-[var(--ink-dim)] shrink-0" />
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <Chip tone={windowIsOpen ? 'black' : 'state'}>
                {windowIsOpen ? 'Pencere Açık' : 'Pencere Kapalı'}
              </Chip>
              <span className="font-serif text-sm text-[var(--ink-2)]">
                {windowIsOpen
                  ? countdown
                    ? `Kapanışa kalan: ${countdown}`
                    : 'Talep oluşturabilirsiniz.'
                  : countdown
                    ? `Açılışa kalan: ${countdown}`
                    : 'Talep oluşturulamaz.'}
                {submissionWindow.reason ? ` · ${submissionWindow.reason}` : ''}
              </span>
            </div>
          </Card>
        )}

        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={handleNew} disabled={!windowIsOpen}>
            <Plus size={14} />
            Yeni Evci Talebi
          </Button>
        </div>

        {requests.length === 0 ? (
          <Card contentClassName="p-10 flex flex-col items-center text-center gap-3">
            <Home size={40} className="text-[var(--ink-dim)]" />
            <h3 className="font-serif text-lg text-[var(--ink)]">Henüz talep yok</h3>
            <p className="font-serif text-sm text-[var(--ink-2)]">
              Yeni evci talebi oluşturmak için yukarıdaki butona tıklayın.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map((r, i) => {
              const status = (r.parentApproval || 'pending') as ApprovalStatus;
              const canModify = status !== 'approved';
              return (
                <Card key={r._id || i} contentClassName="p-0">
                  <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-[var(--rule)]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Chip tone={APPROVAL_TONES[status]}>{APPROVAL_LABELS[status]}</Chip>
                      <Chip tone={r.willGo ? 'outline' : 'default'}>
                        {r.willGo ? 'Gidecek' : 'Gitmeyecek'}
                      </Chip>
                    </div>
                    {canModify && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(i)}
                          className="text-[var(--ink-dim)] hover:text-[var(--ink)] p-1"
                          aria-label="Düzenle"
                          title="Düzenle"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(i)}
                          className="text-[var(--ink-dim)] hover:text-[var(--state)] p-1"
                          aria-label="İptal et"
                          title="İptal et"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <InfoRow
                      icon={Calendar}
                      label="Tarih"
                      value={new Date(r.createdAt).toLocaleDateString('tr-TR')}
                    />
                    <InfoRow
                      icon={Calendar}
                      label="Çıkış"
                      value={r.willGo ? r.startDate || '—' : 'Gitmiyor'}
                    />
                    <InfoRow
                      icon={Calendar}
                      label="Dönüş"
                      value={r.willGo ? r.endDate || '—' : '—'}
                    />
                    <InfoRow
                      icon={MapPin}
                      label="Yer"
                      value={r.willGo ? r.destination || '—' : '—'}
                    />
                    {status === 'rejected' && r.rejectionReason && (
                      <div className="border-t border-[var(--rule)] pt-2 mt-2 flex items-start gap-2">
                        <AlertCircle size={12} className="text-[var(--state)] mt-1 shrink-0" />
                        <div className="flex-1">
                          <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                            Red Sebebi
                          </div>
                          <p className="font-serif text-sm text-[var(--ink-2)]">
                            {r.rejectionReason}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setModalOpen(false)}
          role="presentation"
        >
          <Card
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            contentClassName="p-0"
          >
            <div onClick={(e) => e.stopPropagation()}>
              <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
                  {editingIndex !== null ? 'Talep Düzenle' : 'Yeni Evci Talebi'}
                </span>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-white hover:opacity-80"
                  aria-label="Kapat"
                >
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                className="p-6 space-y-4"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!form.willGo}
                    onChange={(e) => setForm({ ...form, willGo: !e.target.checked })}
                    className="accent-[var(--state)]"
                  />
                  <span className="font-serif text-sm text-[var(--ink)]">Evciye Gitmeyeceğim</span>
                </label>

                {form.willGo && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Çıkış Günü" error={errors.startDate}>
                        <select
                          value={form.startDate || ''}
                          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                          className={selectClasses}
                        >
                          <option value="">Gün seçin</option>
                          {DAYS_OF_WEEK.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Çıkış Saati">
                        <Input
                          type="time"
                          value={form.startTime || ''}
                          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                        />
                      </Field>
                      <Field label="Dönüş Günü" error={errors.endDate}>
                        <select
                          value={form.endDate || ''}
                          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                          className={selectClasses}
                        >
                          <option value="">Gün seçin</option>
                          {DAYS_OF_WEEK.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Dönüş Saati">
                        <Input
                          type="time"
                          value={form.endTime || ''}
                          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                        />
                      </Field>
                    </div>

                    <Field label="Yer" error={errors.destination}>
                      <Input
                        value={form.destination || ''}
                        onChange={(e) => setForm({ ...form, destination: e.target.value })}
                        placeholder="Gidilecek yer"
                      />
                      {lastTemplate && editingIndex === null && !form.destination && (
                        <button
                          type="button"
                          onClick={applyTemplate}
                          className="mt-1 self-start inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)] hover:text-[var(--state)]"
                        >
                          <Copy size={10} />
                          Geçen haftaki gibi ({lastTemplate.destination})
                        </button>
                      )}
                    </Field>
                  </>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                    İptal
                  </Button>
                  <Button type="submit" variant="primary">
                    {editingIndex !== null ? 'Güncelle' : 'Talebi Gönder'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </ModernDashboardLayout>
  );
};

export default StudentEvciPage;

interface InfoRowProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-center gap-3 text-sm">
      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
        <Icon size={10} />
        {label}
      </span>
      <span className="font-serif text-[var(--ink)]">{value}</span>
    </div>
  );
}
