import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../utils/api';
import {
  Check,
  AlertCircle,
  User,
  Mail,
  Phone,
  School,
  Calendar,
  FileText,
  Users,
} from 'lucide-react';
import './LoginPage.css';

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
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Başvuru gönderilirken bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="login-bg" role="main">
        <div className="login-gradient-border">
          <div className="login-container" style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                border: '2px solid #99f6e4',
              }}
            >
              <Check size={36} style={{ color: '#0f766e' }} />
            </div>
            <h1 style={{ fontSize: 22, marginBottom: 12, color: '#1e293b' }}>Başvurunuz Alındı!</h1>
            <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: 24, fontSize: 14 }}>
              Kayıt başvurunuz başarıyla gönderildi. Yönetim ekibimiz başvurunuzu inceleyecek ve
              size e-posta yoluyla bilgi verecektir.
            </p>
            <Link
              to="/login"
              className="login-button"
              style={{ textDecoration: 'none', display: 'inline-flex' }}
            >
              Giriş Sayfasına Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-bg" role="main">
      <div className="login-gradient-border" style={{ maxWidth: 560 }}>
        <div className="login-container" style={{ maxWidth: '100%', padding: '1.5rem' }}>
          {/* Header */}
          <header className="login-header" style={{ marginBottom: '1.25rem' }}>
            <div className="login-logo" style={{ width: 80, height: 80 }}>
              <img src="/tofaslogo.png" alt="Tofaş Fen Lisesi logosu" className="login-logo-img" />
            </div>
            <h1 className="login-title" style={{ fontSize: '1.5rem', marginTop: 8 }}>
              Tofaş Fen Lisesi
            </h1>
            <p className="login-subtitle" style={{ marginBottom: '0.5rem' }}>
              Yeni Kayıt Başvuru Formu
            </p>
          </header>

          {error && (
            <div
              className="login-error"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textAlign: 'left',
                marginBottom: 16,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" style={{ gap: '0.75rem' }}>
            {/* Öğrenci Bilgileri */}
            <SectionTitle icon={School} title="Öğrenci Bilgileri" />

            <div className="login-form-group" style={{ marginBottom: 0 }}>
              <label className="login-label">
                <User className="login-icon" />
                Öğrenci Adı Soyadı *
              </label>
              <input
                className="login-input"
                value={form.studentName}
                onChange={(e) => update('studentName', e.target.value)}
                placeholder="Örnek: Ali Veli"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="login-form-group" style={{ marginBottom: 0 }}>
                <label className="login-label">
                  <Calendar className="login-icon" />
                  Doğum Tarihi
                </label>
                <input
                  type="date"
                  className="login-input"
                  style={{ paddingLeft: '1rem' }}
                  value={form.studentBirthDate}
                  onChange={(e) => update('studentBirthDate', e.target.value)}
                />
              </div>
              <div className="login-form-group" style={{ marginBottom: 0 }}>
                <label className="login-label">
                  <School className="login-icon" />
                  Hedef Sınıf *
                </label>
                <select
                  className="login-input"
                  style={{ paddingLeft: '1rem' }}
                  value={form.targetClass}
                  onChange={(e) => update('targetClass', e.target.value)}
                >
                  <option value="">Seçin...</option>
                  <option value="9">9. Sınıf</option>
                  <option value="10">10. Sınıf</option>
                  <option value="11">11. Sınıf</option>
                  <option value="12">12. Sınıf</option>
                </select>
              </div>
            </div>

            <div className="login-form-group" style={{ marginBottom: 0 }}>
              <label className="login-label">
                <School className="login-icon" />
                Mevcut Okulu
              </label>
              <input
                className="login-input"
                value={form.currentSchool}
                onChange={(e) => update('currentSchool', e.target.value)}
                placeholder="Şu an devam ettiği okul"
              />
            </div>

            {/* Başvuran Bilgileri */}
            <SectionTitle icon={User} title="Başvuran Bilgileri" />

            <div className="login-form-group" style={{ marginBottom: 0 }}>
              <label className="login-label">
                <User className="login-icon" />
                Ad Soyad *
              </label>
              <input
                className="login-input"
                value={form.applicantName}
                onChange={(e) => update('applicantName', e.target.value)}
                placeholder="Başvuran kişi"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="login-form-group" style={{ marginBottom: 0 }}>
                <label className="login-label">
                  <Mail className="login-icon" />
                  E-posta *
                </label>
                <input
                  type="email"
                  className="login-input"
                  value={form.applicantEmail}
                  onChange={(e) => update('applicantEmail', e.target.value)}
                  placeholder="ornek@mail.com"
                />
              </div>
              <div className="login-form-group" style={{ marginBottom: 0 }}>
                <label className="login-label">
                  <Phone className="login-icon" />
                  Telefon *
                </label>
                <input
                  className="login-input"
                  value={form.applicantPhone}
                  onChange={(e) => update('applicantPhone', e.target.value)}
                  placeholder="05XX XXX XX XX"
                />
              </div>
            </div>

            {/* Veli Bilgileri */}
            <SectionTitle icon={Users} title="Veli Bilgileri" />

            <div className="login-form-group" style={{ marginBottom: 0 }}>
              <label className="login-label">
                <User className="login-icon" />
                Veli Adı Soyadı *
              </label>
              <input
                className="login-input"
                value={form.parentName}
                onChange={(e) => update('parentName', e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="login-form-group" style={{ marginBottom: 0 }}>
                <label className="login-label">
                  <Phone className="login-icon" />
                  Veli Telefon *
                </label>
                <input
                  className="login-input"
                  value={form.parentPhone}
                  onChange={(e) => update('parentPhone', e.target.value)}
                  placeholder="05XX XXX XX XX"
                />
              </div>
              <div className="login-form-group" style={{ marginBottom: 0 }}>
                <label className="login-label">
                  <Mail className="login-icon" />
                  Veli E-posta
                </label>
                <input
                  type="email"
                  className="login-input"
                  value={form.parentEmail}
                  onChange={(e) => update('parentEmail', e.target.value)}
                />
              </div>
            </div>

            {/* Notlar */}
            <div className="login-form-group" style={{ marginBottom: 0 }}>
              <label className="login-label">
                <FileText className="login-icon" />
                Ek Notlar
              </label>
              <textarea
                className="login-input"
                style={{ resize: 'vertical', minHeight: 70, paddingLeft: '1rem' }}
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Eklemek istediğiniz bilgiler..."
              />
            </div>

            <button type="submit" className="login-button" disabled={submitting}>
              {submitting ? (
                <>
                  <div className="loading-spinner" style={{ marginRight: 8 }}></div>
                  Gönderiliyor...
                </>
              ) : (
                'Başvuruyu Gönder'
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', margin: '16px 0 0' }}>
            <Link
              to="/login"
              style={{ color: '#0f766e', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}
            >
              Zaten hesabınız var mı? Giriş yapın
            </Link>
          </div>

          <footer className="login-footer">
            <p className="login-footer-text">&copy; 2025 Tofaş Fen Lisesi. Tüm hakları saklıdır.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  title: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 6,
        borderBottom: '2px solid #f0fdfa',
        marginTop: 4,
      }}
    >
      <Icon size={16} style={{ color: '#0f766e' }} />
      <span style={{ fontSize: 14, fontWeight: 600, color: '#115e59' }}>{title}</span>
    </div>
  );
}
