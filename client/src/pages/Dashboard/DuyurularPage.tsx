import { useState, useEffect } from 'react';
import { Bell, Plus, Calendar, Trash2 } from 'lucide-react';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import { AnnouncementService } from '../../utils/apiService';
import { toast } from 'sonner';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '../../components/ui/Dialog';
import { cn } from '../../utils/cn';
import { safeConsoleError } from '../../utils/safeLogger';

interface Announcement {
  _id?: string;
  title: string;
  content: string;
  date: string;
  expire?: string;
}

const fieldLabel = 'font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]';
const textareaClasses = cn(
  'w-full bg-transparent border border-[var(--rule)] px-2 py-2 text-sm',
  'text-[var(--ink)] placeholder:text-[var(--ink-dim)] font-serif resize-y',
  'focus:outline-none focus:border-[var(--state)] transition-colors',
);

export default function DuyurularPage() {
  const { user } = useAuthGuard(['admin', 'teacher', 'student', 'parent']);
  const [showModal, setShowModal] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        let data: Announcement[] = [];
        let error: string | null = null;

        // Öğrenci, veli ve öğretmen için rol bazlı/çocuk bazlı duyurular
        if (user?.rol === 'student' || user?.rol === 'parent' || user?.rol === 'teacher') {
          const result = await AnnouncementService.getAnnouncementsByRole(user.rol);
          data = Array.isArray(result.data) ? (result.data as Announcement[]) : [];
          error = result.error;
        } else {
          // Admin ve diğer roller için tüm duyurular
          const result = await AnnouncementService.getAnnouncements();
          data = Array.isArray(result.data) ? (result.data as Announcement[]) : [];
          error = result.error;
        }

        if (error) {
          safeConsoleError('Error fetching announcements:', error);
        }

        setAnnouncements(data);
      } catch (error) {
        safeConsoleError('Error fetching announcements:', error);
        setAnnouncements([]);
        toast.error('Duyurular yüklenirken hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
  }, [user]);

  const refreshAnnouncements = async () => {
    const { data, error } = await AnnouncementService.getAnnouncements();
    if (error) {
      safeConsoleError('Error fetching announcements:', error);
    } else {
      setAnnouncements(Array.isArray(data) ? (data as Announcement[]) : []);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm('Bu duyuruyu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const { error } = await AnnouncementService.deleteAnnouncement(announcementId);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Duyuru başarıyla silindi');
        await refreshAnnouncements();
      }
    } catch (error: unknown) {
      safeConsoleError('Duyuru silme hatası:', error);
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Duyuru silinirken hata oluştu';
      toast.error(msg);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const announcementData = {
      title: String(formData.get('title') || ''),
      content: String(formData.get('content') || ''),
      date: new Date().toISOString(),
      expire: formData.get('expire') ? String(formData.get('expire')) : undefined,
    };
    setIsSubmitting(true);
    try {
      const { error } = await AnnouncementService.createAnnouncement(announcementData);
      if (error) {
        toast.error(error);
      } else {
        await refreshAnnouncements();
        setShowModal(false);
        form.reset();
        toast.success('Duyuru başarıyla eklendi');
      }
    } catch (error) {
      safeConsoleError('Error creating announcement:', error);
      toast.error('Duyuru eklenirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'student'}` },
    { label: 'Duyurular' },
  ];

  if (isLoading) {
    return (
      <ModernDashboardLayout pageTitle="Duyurular" breadcrumb={breadcrumb}>
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Duyurular yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Duyurular" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
              Belge No. {new Date().getFullYear()}/D-Y
            </div>
            <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Duyurular</h1>
            <p className="font-serif text-sm text-[var(--ink-2)] mt-1">
              Okul yönetimi tarafından yayımlanan resmî duyurular.
            </p>
          </div>
          {user?.rol === 'admin' && (
            <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
              <Plus size={14} />
              Yeni Duyuru Ekle
            </Button>
          )}
        </header>

        {announcements.length === 0 ? (
          <Card contentClassName="p-10 flex flex-col items-center gap-3 text-center">
            <Bell size={48} className="text-[var(--ink-dim)]" />
            <h3 className="font-serif text-lg text-[var(--ink)]">Henüz duyuru bulunmuyor</h3>
            <p className="font-serif text-sm text-[var(--ink-dim)]">
              Yeni duyurular burada görünecektir.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {announcements.map((announcement, index) => (
              <Card key={announcement._id || index} accentBar contentClassName="p-0">
                <div className="px-4 py-2 border-b border-[var(--rule)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bell size={12} className="text-[var(--ink-dim)]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
                      Duyuru
                    </span>
                  </div>
                  {user?.rol === 'admin' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAnnouncement(announcement._id!)}
                      className="text-[var(--ink-dim)] hover:text-[var(--state)] p-1"
                      aria-label="Duyuruyu sil"
                      title="Duyuruyu Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-serif text-lg text-[var(--ink)] leading-snug">
                    {announcement.title}
                  </h3>
                  <p className="font-serif text-sm text-[var(--ink-2)] leading-relaxed whitespace-pre-line">
                    {announcement.content}
                  </p>
                  <div className="pt-2 border-t border-[var(--rule)] space-y-1">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                      <Calendar size={10} />
                      Yayın: {new Date(announcement.date).toLocaleDateString('tr-TR')}
                    </div>
                    {announcement.expire && (
                      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                        <Calendar size={10} />
                        Son Geçerlilik: {new Date(announcement.expire).toLocaleDateString('tr-TR')}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add Announcement Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal} size="md">
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Duyuru Ekle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <DialogBody>
                <div className="space-y-4">
                  <label className="flex flex-col gap-1">
                    <span className={fieldLabel}>Duyuru Başlığı</span>
                    <Input name="title" required placeholder="Duyuru başlığını giriniz" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className={fieldLabel}>Duyuru İçeriği</span>
                    <textarea
                      name="content"
                      rows={6}
                      required
                      placeholder="Duyuru içeriğini detaylıca yazınız"
                      className={textareaClasses}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className={fieldLabel}>Son Geçerlilik Tarihi (Opsiyonel)</span>
                    <Input name="expire" type="date" />
                  </label>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                  İptal
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={isSubmitting}>
                  Duyuruyu Yayınla
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ModernDashboardLayout>
  );
}
