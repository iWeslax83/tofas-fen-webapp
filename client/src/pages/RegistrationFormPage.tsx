import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { Input } from '../components/ui/Input';
import { apiClient } from '../utils/api';
import { cn } from '../utils/cn';

const TARGET_CLASSES = [
  { value: '9', label: '9. Sınıf' },
  { value: '10', label: '10. Sınıf' },
  { value: '11', label: '11. Sınıf' },
  { value: '12', label: '12. Sınıf' },
];

const selectClasses = cn(
  'w-full bg-transparent border-0 border-b border-[var(--rule)] px-1 py-2',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--state)] focus:border-b-2 focus:pb-[7px]',
  'transition-colors',
);

interface FieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Field = ({ label, htmlFor, required, fullWidth, children }: FieldProps) => (
  <label htmlFor={htmlFor} className={cn('flex flex-col gap-1', fullWidth && 'md:col-span-2')}>
    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
      {label}
      {required && <span className="text-[var(--state)] ml-1">*</span>}
    </span>
    {children}
  </label>
);

interface SectionProps {
  number: string;
  title: string;
  children: React.ReactNode;
}

const Section = ({ number, title, children }: SectionProps) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2 border-b border-[var(--rule)] pb-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
        Bölüm {number}
      </span>
      <h2 className="font-serif text-base text-[var(--ink)]">{title}</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </section>
);

export default function RegistrationFormPage() {
  const [form, setForm] = useState({
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
    studentName: '',
    studentBirthDate: '',
    currentSchool: '',
    targetClass: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (
      !form.applicantName ||
      !form.applicantEmail ||
      !form.applicantPhone ||
      !form.studentName ||
      !form.targetClass ||
      !form.parentName ||
      !form.parentPhone
    ) {
      setError('Lütfen tüm zorunlu alanları doldurun');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/api/registrations', form);
      setSuccess(true);
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string } } };
      setError(e2?.response?.data?.error || 'Başvuru gönderilirken bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--paper)] flex flex-col">
        <div className="h-1.5 bg-[var(--state)]" aria-hidden="true" />
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md" contentClassName="p-0">
            <div className="bg-[var(--state)] text-white px-4 py-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
                Başvuru Alındı
              </span>
            </div>
            <div className="p-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 border-2 border-[var(--ink)] flex items-center justify-center">
                <Check size={28} className="text-[var(--ink)]" />
              </div>
              <h1 className="font-serif text-xl text-[var(--ink)]">Başvurunuz Alındı</h1>
              <p className="font-serif text-sm text-[var(--ink-2)] leading-relaxed">
                Kayıt başvurunuz başarıyla gönderildi. Yönetim ekibimiz başvurunuzu inceleyecek ve
                size e-posta yoluyla bilgi verecektir.
              </p>
              <Link to="/login">
                <Button variant="primary" size="sm">
                  Giriş Sayfasına Dön
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col">
      <div className="h-1.5 bg-[var(--state)]" aria-hidden="true" />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[5fr_7fr]">
        <aside className="bg-[var(--ink)] text-[var(--paper)] p-8 lg:p-12 flex flex-col justify-between min-h-[30vh] lg:min-h-screen">
          <div className="space-y-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
              Türkiye Cumhuriyeti · Resmî Belge
            </div>
            <div className="flex items-center gap-4">
              <img
                src="/tofaslogo.png"
                alt="Tofaş Fen Lisesi logosu"
                className="w-16 h-16 bg-white p-2 border border-white/20"
              />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/60">
                  Yeni Kayıt
                </div>
                <h1 className="font-serif text-2xl text-white leading-tight">Tofaş Fen Lisesi</h1>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-white/15 pt-6">
            <p className="font-serif text-sm text-white/85 leading-relaxed">
              Başvuru formundaki tüm bilgiler doğru ve eksiksiz doldurulmalıdır. Yönetim, sağlanan
              iletişim adresi üzerinden geri dönüş yapacaktır.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">
              © {new Date().getFullYear()} Tofaş Fen Lisesi. Tüm hakları saklıdır.
            </p>
          </div>
        </aside>

        <main className="p-8 lg:p-12 flex flex-col justify-center min-h-[60vh] lg:min-h-screen">
          <div className="w-full max-w-2xl mx-auto">
            <header className="mb-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
                Form 03 · Kayıt Başvurusu
              </div>
              <h2 className="font-serif text-2xl text-[var(--ink)] mt-1">
                Yeni Kayıt Başvuru Formu
              </h2>
            </header>

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="mb-5 border-l-4 border-[var(--state)] bg-[var(--surface)] px-3 py-2 flex items-start gap-2"
              >
                <Chip tone="state">Hata</Chip>
                <span className="font-serif text-sm text-[var(--ink)] flex-1 inline-flex items-center gap-1">
                  <AlertCircle size={12} />
                  {error}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <Section number="I" title="Öğrenci Bilgileri">
                <Field label="Adı Soyadı" htmlFor="reg-studentName" required fullWidth>
                  <Input
                    id="reg-studentName"
                    value={form.studentName}
                    onChange={(e) => update('studentName', e.target.value)}
                    placeholder="Örn. Ali Veli"
                  />
                </Field>
                <Field label="Doğum Tarihi" htmlFor="reg-studentBirthDate">
                  <Input
                    id="reg-studentBirthDate"
                    type="date"
                    value={form.studentBirthDate}
                    onChange={(e) => update('studentBirthDate', e.target.value)}
                  />
                </Field>
                <Field label="Hedef Sınıf" htmlFor="reg-targetClass" required>
                  <select
                    id="reg-targetClass"
                    value={form.targetClass}
                    onChange={(e) => update('targetClass', e.target.value)}
                    className={selectClasses}
                  >
                    <option value="">Seçin…</option>
                    {TARGET_CLASSES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Mevcut Okul" htmlFor="reg-currentSchool" fullWidth>
                  <Input
                    id="reg-currentSchool"
                    value={form.currentSchool}
                    onChange={(e) => update('currentSchool', e.target.value)}
                    placeholder="Şu an devam ettiği okul"
                  />
                </Field>
              </Section>

              <Section number="II" title="Başvuran Bilgileri">
                <Field label="Adı Soyadı" htmlFor="reg-applicantName" required fullWidth>
                  <Input
                    id="reg-applicantName"
                    value={form.applicantName}
                    onChange={(e) => update('applicantName', e.target.value)}
                    placeholder="Başvuran kişi"
                  />
                </Field>
                <Field label="E-posta" htmlFor="reg-applicantEmail" required>
                  <Input
                    id="reg-applicantEmail"
                    type="email"
                    value={form.applicantEmail}
                    onChange={(e) => update('applicantEmail', e.target.value)}
                    placeholder="ornek@mail.com"
                  />
                </Field>
                <Field label="Telefon" htmlFor="reg-applicantPhone" required>
                  <Input
                    id="reg-applicantPhone"
                    value={form.applicantPhone}
                    onChange={(e) => update('applicantPhone', e.target.value)}
                    placeholder="05XX XXX XX XX"
                  />
                </Field>
              </Section>

              <Section number="III" title="Veli Bilgileri">
                <Field label="Adı Soyadı" htmlFor="reg-parentName" required fullWidth>
                  <Input
                    id="reg-parentName"
                    value={form.parentName}
                    onChange={(e) => update('parentName', e.target.value)}
                  />
                </Field>
                <Field label="Telefon" htmlFor="reg-parentPhone" required>
                  <Input
                    id="reg-parentPhone"
                    value={form.parentPhone}
                    onChange={(e) => update('parentPhone', e.target.value)}
                    placeholder="05XX XXX XX XX"
                  />
                </Field>
                <Field label="E-posta" htmlFor="reg-parentEmail">
                  <Input
                    id="reg-parentEmail"
                    type="email"
                    value={form.parentEmail}
                    onChange={(e) => update('parentEmail', e.target.value)}
                  />
                </Field>
              </Section>

              <Section number="IV" title="Ek Bilgiler">
                <Field label="Notlar" htmlFor="reg-notes" fullWidth>
                  <textarea
                    id="reg-notes"
                    value={form.notes}
                    onChange={(e) => update('notes', e.target.value)}
                    placeholder="Eklemek istediğiniz bilgiler…"
                    rows={3}
                    className={cn(selectClasses, 'resize-y min-h-[5rem]')}
                  />
                </Field>
              </Section>

              <div className="flex justify-end pt-4 border-t border-[var(--rule)]">
                <Button type="submit" variant="primary" loading={submitting}>
                  Başvuruyu Gönder
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-[var(--rule)] text-center">
              <Link
                to="/login"
                className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)] hover:text-[var(--state)]"
              >
                Zaten hesabınız var mı? Giriş yapın
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
