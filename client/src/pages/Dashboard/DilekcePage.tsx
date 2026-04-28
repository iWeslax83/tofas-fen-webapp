import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { FileText, X, Plus, Trash2, Eye, Paperclip } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip, type ChipProps } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { apiClient } from '../../utils/api';
import { extractError } from '../../utils/apiResponseHandler';
import { cn } from '../../utils/cn';

interface Dilekce {
  _id: string;
  userId: string;
  userName: string;
  userRole: string;
  type: 'izin' | 'rapor' | 'nakil' | 'diger';
  subject: string;
  content: string;
  attachments?: string[];
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed';
  priority: 'low' | 'medium' | 'high';
  category?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  response?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

type DilekceType = Dilekce['type'];
type Priority = Dilekce['priority'];
type Status = Dilekce['status'];

const TYPE_LABELS: Record<DilekceType, string> = {
  izin: 'İzin',
  rapor: 'Rapor',
  nakil: 'Nakil',
  diger: 'Diğer',
};

const STATUS_LABELS: Record<Status, string> = {
  pending: 'Beklemede',
  in_review: 'İnceleniyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  completed: 'Tamamlandı',
};

const STATUS_TONES: Record<Status, ChipProps['tone']> = {
  pending: 'default',
  in_review: 'outline',
  approved: 'black',
  rejected: 'state',
  completed: 'black',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
};

const PRIORITY_TONES: Record<Priority, ChipProps['tone']> = {
  low: 'default',
  medium: 'outline',
  high: 'state',
};

const ROLE_LABELS: Record<string, string> = {
  student: 'Öğrenci',
  parent: 'Veli',
  teacher: 'Öğretmen',
};

const selectClasses = cn(
  'w-full bg-transparent border-0 border-b border-[var(--rule)] px-1 py-2',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--state)] focus:border-b-2 focus:pb-[7px]',
  'transition-colors',
);

const formatDate = (raw: string): string =>
  new Date(raw).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

const formatDateTime = (raw: string): string =>
  new Date(raw).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

interface FieldProps {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const Field = ({ label, children, fullWidth }: FieldProps) => (
  <label className={cn('flex flex-col gap-1', fullWidth && 'md:col-span-2')}>
    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
      {label}
    </span>
    {children}
  </label>
);

const DilekcePage: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const [dilekceler, setDilekceler] = useState<Dilekce[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Dilekce | null>(null);

  useEffect(() => {
    if (!user || !['student', 'teacher', 'parent'].includes(user.rol || '')) {
      navigate('/login');
      return;
    }
    loadDilekceler();
  }, [user, navigate]);

  const loadDilekceler = async () => {
    try {
      setLoading(true);
      const includeChildren = user?.rol === 'parent' ? '?includeChildren=true' : '';
      const response = await apiClient.get(`/api/dilekce${includeChildren}`);
      if (response.data.success) {
        setDilekceler(response.data.dilekceler || []);
      }
    } catch (error) {
      console.error('Error loading dilekce:', error);
      toast.error('Dilekçeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Bu dilekçeyi silmek istediğinizden emin misiniz?')) return;
    try {
      const response = await apiClient.delete(`/api/dilekce/${id}`);
      if (response.data.success) {
        toast.success('Dilekçe silindi');
        loadDilekceler();
      }
    } catch (error) {
      console.error('Error deleting dilekce:', error);
      const message = extractError(error) || 'Dilekçe silinemedi';
      toast.error(message);
    }
  }, []);

  const columns = useMemo<ColumnDef<Dilekce>[]>(
    () => [
      {
        accessorKey: 'subject',
        header: 'Konu',
        cell: (info) => (
          <span className="font-serif text-[var(--ink)]">{info.getValue<string>()}</span>
        ),
        filterFn: 'includesString',
      },
      {
        accessorKey: 'type',
        header: 'Tür',
        cell: (info) => (
          <span className="font-mono text-xs uppercase tracking-wider text-[var(--ink-dim)]">
            {TYPE_LABELS[info.getValue<DilekceType>()]}
          </span>
        ),
      },
      {
        accessorKey: 'priority',
        header: 'Öncelik',
        cell: (info) => {
          const p = info.getValue<Priority>();
          return <Chip tone={PRIORITY_TONES[p]}>{PRIORITY_LABELS[p]}</Chip>;
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Tarih',
        cell: (info) => (
          <span className="font-mono text-xs text-[var(--ink-dim)]">
            {formatDate(info.getValue<string>())}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Durum',
        cell: (info) => {
          const s = info.getValue<Status>();
          return <Chip tone={STATUS_TONES[s]}>{STATUS_LABELS[s]}</Chip>;
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => {
          const d = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => setSelected(d)}
                className="text-[var(--ink-dim)] hover:text-[var(--ink)] p-1"
                aria-label="Detay"
                title="Detay"
              >
                <Eye size={16} />
              </button>
              {d.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => handleDelete(d._id)}
                  className="text-[var(--ink-dim)] hover:text-[var(--state)] p-1"
                  aria-label="Başvuruyu iptal et"
                  title="Başvuruyu iptal et"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [handleDelete],
  );

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'login'}` },
    { label: 'Dilekçe' },
  ];

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Dilekçe" breadcrumb={breadcrumb}>
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Dilekçe" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Belge No. {new Date().getFullYear()}/D
          </div>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Dilekçelerim</h1>
        </header>

        <DataTable
          caption="Tablo I — Dilekçe Listesi"
          columns={columns}
          data={dilekceler}
          emptyState="Henüz bir dilekçeniz yok."
          toolbar={
            <div className="flex items-center justify-end">
              <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
                <Plus size={14} />
                Yeni Dilekçe
              </Button>
            </div>
          }
        />
      </div>

      {showForm && (
        <NewDilekceModal
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            loadDilekceler();
          }}
        />
      )}

      {selected && <DilekceDetailModal dilekce={selected} onClose={() => setSelected(null)} />}
    </ModernDashboardLayout>
  );
};

export default DilekcePage;

interface NewDilekceModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function NewDilekceModal({ onClose, onCreated }: NewDilekceModalProps) {
  const [type, setType] = useState<DilekceType>('izin');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (attachments.length + files.length > 5) {
      toast.error('Maksimum 5 dosya yükleyebilirsiniz');
      return;
    }
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !content) {
      toast.error('Lütfen konu ve içerik alanlarını doldurun');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('subject', subject);
      formData.append('content', content);
      formData.append('priority', priority);
      if (category) formData.append('category', category);
      attachments.forEach((file) => formData.append('attachments', file));

      const response = await apiClient.post('/api/dilekce', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.success) {
        toast.success('Dilekçe oluşturuldu');
        onCreated();
      }
    } catch (error) {
      console.error('Error submitting dilekce:', error);
      const message = extractError(error) || 'Dilekçe oluşturulamadı';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <Card
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        contentClassName="p-0"
      >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
              Yeni Dilekçe Başvurusu
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:opacity-80"
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          </div>

          <form className="p-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Dilekçe Türü">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as DilekceType)}
                  required
                  className={selectClasses}
                >
                  {(Object.keys(TYPE_LABELS) as DilekceType[]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Öncelik">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className={selectClasses}
                >
                  {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Kategori (opsiyonel)" fullWidth>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Örn: Sağlık, Spor, Aile"
                />
              </Field>
              <Field label="Konu" fullWidth>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  maxLength={200}
                  placeholder="Dilekçenizin kısa özet konusu"
                />
              </Field>
              <Field label="İçerik" fullWidth>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  maxLength={5000}
                  rows={6}
                  placeholder="Dilekçenizin detaylı içeriğini buraya yazınız…"
                  className={cn(selectClasses, 'resize-y min-h-[8rem]')}
                />
                <span className="text-right font-mono text-[10px] text-[var(--ink-dim)]">
                  {content.length} / 5000
                </span>
              </Field>
              <Field label="Ek Dosyalar (max 5)" fullWidth>
                <input
                  type="file"
                  onChange={handleFileChange}
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="font-serif text-sm text-[var(--ink-2)] file:mr-3 file:px-3 file:py-1 file:border file:border-[var(--ink)] file:bg-transparent file:text-[var(--ink)] file:font-medium file:cursor-pointer"
                />
                {attachments.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {attachments.map((file, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-sm text-[var(--ink-2)]"
                      >
                        <Paperclip size={12} className="text-[var(--ink-dim)]" />
                        <span className="font-serif flex-1 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-[var(--ink-dim)] hover:text-[var(--state)]"
                          aria-label="Dosyayı kaldır"
                        >
                          <X size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                İptal
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                Dilekçe Gönder
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}

interface DilekceDetailModalProps {
  dilekce: Dilekce;
  onClose: () => void;
}

function DilekceDetailModal({ dilekce, onClose }: DilekceDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <Card
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        contentClassName="p-0"
      >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="bg-[var(--state)] text-white px-4 py-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
              Dilekçe · No. {dilekce._id.slice(-6).toUpperCase()}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:opacity-80"
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Chip tone={STATUS_TONES[dilekce.status]}>{STATUS_LABELS[dilekce.status]}</Chip>
              <Chip tone={PRIORITY_TONES[dilekce.priority]}>
                {PRIORITY_LABELS[dilekce.priority]} öncelik
              </Chip>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)] ml-auto">
                {formatDateTime(dilekce.createdAt)}
              </span>
            </div>

            <header>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                {TYPE_LABELS[dilekce.type]}
                {dilekce.category && ` · ${dilekce.category}`}
              </div>
              <h2 className="font-serif text-xl text-[var(--ink)] mt-1">{dilekce.subject}</h2>
            </header>

            <Section title="Gönderen">
              <p className="font-serif text-sm text-[var(--ink)]">
                {dilekce.userName}
                {ROLE_LABELS[dilekce.userRole] && (
                  <span className="text-[var(--ink-dim)]"> · {ROLE_LABELS[dilekce.userRole]}</span>
                )}
              </p>
            </Section>

            <Section title="İçerik">
              <p className="font-serif text-sm text-[var(--ink-2)] leading-relaxed whitespace-pre-wrap">
                {dilekce.content}
              </p>
            </Section>

            {dilekce.attachments && dilekce.attachments.length > 0 && (
              <Section title="Ek Dosyalar">
                <ul className="space-y-1">
                  {dilekce.attachments.map((file, i) => (
                    <li key={i}>
                      <a
                        href={file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-[var(--ink)] hover:text-[var(--state)]"
                      >
                        <FileText size={12} />
                        Dosya {i + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {dilekce.reviewNote && (
              <Section title="İnceleme Notu">
                <p className="font-serif text-sm text-[var(--ink-2)] leading-relaxed">
                  {dilekce.reviewNote}
                </p>
              </Section>
            )}

            {dilekce.response && (
              <Section title="Yanıt">
                <p className="font-serif text-sm text-[var(--ink-2)] leading-relaxed">
                  {dilekce.response}
                </p>
              </Section>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Kapat
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)] border-b border-[var(--rule)] pb-1">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}
