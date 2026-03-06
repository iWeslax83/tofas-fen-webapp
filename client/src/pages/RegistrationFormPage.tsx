import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../utils/api';
import { GraduationCap, Check, AlertCircle } from 'lucide-react';

export default function RegistrationFormPage() {
  const [form, setForm] = useState({
    applicantName: '', applicantEmail: '', applicantPhone: '',
    studentName: '', studentBirthDate: '', currentSchool: '', targetClass: '',
    parentName: '', parentPhone: '', parentEmail: '', notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.applicantName || !form.applicantEmail || !form.applicantPhone ||
        !form.studentName || !form.targetClass || !form.parentName || !form.parentPhone) {
      setError('Lutfen tum zorunlu alanlari doldurun');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/api/registrations', form);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Basvuru gonderilirken bir hata olustu');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 40, maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Check size={32} style={{ color: '#10b981' }} />
          </div>
          <h1 style={{ fontSize: 24, marginBottom: 12 }}>Basvurunuz Alindi!</h1>
          <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: 24 }}>
            Kayit basvurunuz basariyla gonderildi. Yonetim ekibimiz basvurunuzu inceleyecek ve
            size e-posta yoluyla bilgi verecektir.
          </p>
          <Link to="/login" style={{
            display: 'inline-block', padding: '12px 24px', borderRadius: 8,
            background: '#3b82f6', color: '#fff', textDecoration: 'none', fontWeight: 600
          }}>
            Giris Sayfasina Don
          </Link>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
    fontSize: 14, boxSizing: 'border-box', outline: 'none'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <GraduationCap size={36} style={{ color: '#3b82f6' }} />
            <h1 style={{ margin: 0, fontSize: 28 }}>Tofas Fen Lisesi</h1>
          </div>
          <p style={{ color: '#6b7280', fontSize: 16 }}>Yeni Kayit Basvuru Formu</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{
          background: '#fff', borderRadius: 16, padding: 32,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          {/* Ogrenci Bilgileri */}
          <h2 style={{ fontSize: 16, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>Ogrenci Bilgileri</h2>
          <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Ogrenci Adi Soyadi *</label>
              <input style={inputStyle} value={form.studentName} onChange={e => update('studentName', e.target.value)} placeholder="Ornek: Ali Veli" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Dogum Tarihi</label>
                <input type="date" style={inputStyle} value={form.studentBirthDate} onChange={e => update('studentBirthDate', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Hedef Sinif *</label>
                <select style={inputStyle} value={form.targetClass} onChange={e => update('targetClass', e.target.value)}>
                  <option value="">Secin...</option>
                  <option value="9">9. Sinif</option>
                  <option value="10">10. Sinif</option>
                  <option value="11">11. Sinif</option>
                  <option value="12">12. Sinif</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Mevcut Okulu</label>
              <input style={inputStyle} value={form.currentSchool} onChange={e => update('currentSchool', e.target.value)} placeholder="Su an devam ettigi okul" />
            </div>
          </div>

          {/* Basvuran Bilgileri */}
          <h2 style={{ fontSize: 16, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>Basvuran Bilgileri</h2>
          <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Ad Soyad *</label>
              <input style={inputStyle} value={form.applicantName} onChange={e => update('applicantName', e.target.value)} placeholder="Basvuran kisi" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>E-posta *</label>
                <input type="email" style={inputStyle} value={form.applicantEmail} onChange={e => update('applicantEmail', e.target.value)} placeholder="ornek@mail.com" />
              </div>
              <div>
                <label style={labelStyle}>Telefon *</label>
                <input style={inputStyle} value={form.applicantPhone} onChange={e => update('applicantPhone', e.target.value)} placeholder="05XX XXX XX XX" />
              </div>
            </div>
          </div>

          {/* Veli Bilgileri */}
          <h2 style={{ fontSize: 16, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>Veli Bilgileri</h2>
          <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Veli Adi Soyadi *</label>
              <input style={inputStyle} value={form.parentName} onChange={e => update('parentName', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Veli Telefon *</label>
                <input style={inputStyle} value={form.parentPhone} onChange={e => update('parentPhone', e.target.value)} placeholder="05XX XXX XX XX" />
              </div>
              <div>
                <label style={labelStyle}>Veli E-posta</label>
                <input type="email" style={inputStyle} value={form.parentEmail} onChange={e => update('parentEmail', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Notlar */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Ek Notlar</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} value={form.notes}
              onChange={e => update('notes', e.target.value)} placeholder="Eklemek istediginiz bilgiler..." />
          </div>

          <button type="submit" disabled={submitting} style={{
            width: '100%', padding: '14px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 16
          }}>
            {submitting ? 'Gonderiliyor...' : 'Basvuruyu Gonder'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/login" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none' }}>
            Zaten hesabiniz var mi? Giris yapin
          </Link>
        </div>
      </div>
    </div>
  );
}
