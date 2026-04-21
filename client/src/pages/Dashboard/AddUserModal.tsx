import { useState } from 'react';
import { UserService } from '../../utils/apiService';
import { PasswordAdminService } from '../../utils/passwordAdminService';
import PasswordRevealModal from './PasswordManagement/PasswordRevealModal';

interface UserType {
  id: string;
  adSoyad: string;
  rol: string;
  sinif?: string;
  sube?: string;
  oda?: string;
  pansiyon?: boolean;
  childId?: string[];
  email?: string;
  sifre?: string;
  meslek?: string;
  departman?: string;
  _showPassword?: boolean;
}

interface CreateUserPayload {
  id: string;
  adSoyad: string;
  rol: string;
  sifre?: string;
  sinif?: string;
  sube?: string;
  oda?: string;
  pansiyon?: boolean;
  childId?: string[];
}

export interface AddUserModalProps {
  onUserAdded: (user: UserType) => void;
  onClose: () => void;
}

export default function AddUserModal({ onUserAdded, onClose }: AddUserModalProps) {
  const [addForm, setAddForm] = useState({
    id: '',
    adSoyad: '',
    rol: '',
    sifre: '',
    sinif: '',
    sube: '',
    oda: '',
    pansiyon: false,
    childId: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [autoGen, setAutoGen] = useState(true);
  const [revealed, setRevealed] = useState<{ password: string; label: string } | null>(null);

  const resetForm = () => {
    setAddForm({
      id: '',
      adSoyad: '',
      rol: '',
      sifre: '',
      sinif: '',
      sube: '',
      oda: '',
      pansiyon: false,
      childId: '',
    });
    setAddError('');
    setAddSuccess('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--opacity-40)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-modal)',
      }}
    >
      <div
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-8)',
          minWidth: 340,
          maxWidth: 400,
          width: '90vw',
          boxShadow: 'var(--shadow-2xl)',
          position: 'relative',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--primary-red)',
            marginBottom: 'var(--space-4)',
          }}
        >
          Yeni Kullanıcı Ekle
        </h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setAddError('');
            setAddSuccess('');
            setAddLoading(true);
            // Validasyon
            if (!addForm.id || !addForm.adSoyad || !addForm.rol) {
              setAddError('ID, Ad Soyad ve Rol zorunludur.');
              setAddLoading(false);
              return;
            }
            if (!autoGen && !addForm.sifre) {
              setAddError('Şifre zorunludur (veya otomatik üret seçeneğini işaretleyin).');
              setAddLoading(false);
              return;
            }
            if (!autoGen && addForm.sifre.length < 4) {
              setAddError('Şifre en az 4 karakter olmalı.');
              setAddLoading(false);
              return;
            }

            try {
              const payload: CreateUserPayload = {
                id: addForm.id,
                adSoyad: addForm.adSoyad,
                rol: addForm.rol,
              };
              if (!autoGen) {
                payload.sifre = addForm.sifre;
              }
              if (addForm.rol === 'student') {
                payload.sinif = addForm.sinif;
                payload.sube = addForm.sube;
                payload.oda = addForm.oda;
                payload.pansiyon = addForm.pansiyon;
              }
              if (addForm.rol === 'parent') {
                payload.childId = addForm.childId
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
              }
              const { data, error } = await UserService.createUser(payload);
              if (error) {
                setAddError(error);
              } else {
                onUserAdded(data as UserType);
                if (autoGen) {
                  try {
                    const gen = await PasswordAdminService.generatePassword(addForm.id, 'new_user');
                    setRevealed({
                      password: gen.password,
                      label: `${addForm.adSoyad} (${addForm.id})`,
                    });
                    setAddSuccess('');
                  } catch (genErr) {
                    setAddError(
                      'Kullanıcı eklendi ancak şifre üretilemedi: ' +
                        (genErr instanceof Error ? genErr.message : 'Bilinmeyen hata'),
                    );
                  }
                } else {
                  setAddSuccess('Kullanıcı başarıyla eklendi!');
                  setTimeout(() => {
                    handleClose();
                  }, 1200);
                }
              }
            } catch {
              setAddError('Kullanıcı eklenemedi.');
            } finally {
              setAddLoading(false);
            }
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <input
            placeholder="ID"
            value={addForm.id || ''}
            onChange={(e) => setAddForm((f) => ({ ...f, id: e.target.value }))}
            style={{
              border: '1.5px solid #d1d5db',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 15,
            }}
            required
          />
          <input
            placeholder="Ad Soyad"
            value={addForm.adSoyad}
            onChange={(e) => setAddForm((f) => ({ ...f, adSoyad: e.target.value }))}
            style={{
              border: '1.5px solid #d1d5db',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 15,
            }}
            required
          />
          <select
            value={addForm.rol}
            onChange={(e) => setAddForm((f) => ({ ...f, rol: e.target.value }))}
            style={{
              border: '1.5px solid #d1d5db',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 15,
            }}
            required
          >
            <option value="">Rol Seç</option>
            <option value="student">Öğrenci</option>
            <option value="parent">Veli</option>
            <option value="teacher">Öğretmen</option>
            <option value="admin">Yönetici</option>
            <option value="hizmetli">Hizmetli</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={autoGen}
              onChange={(e) => setAutoGen(e.target.checked)}
            />
            Şifreyi otomatik üret
          </label>
          {!autoGen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Şifre"
                value={addForm.sifre}
                onChange={(e) => setAddForm((f) => ({ ...f, sifre: e.target.value }))}
                style={{
                  border: '1.5px solid #d1d5db',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 15,
                  flex: 1,
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-red)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {showPassword ? 'Gizle' : 'Göster'}
              </button>
            </div>
          )}
          {addForm.rol === 'student' && (
            <>
              <input
                placeholder="Sınıf (örn: 9)"
                value={addForm.sinif}
                onChange={(e) => setAddForm((f) => ({ ...f, sinif: e.target.value }))}
                style={{
                  border: '1.5px solid #d1d5db',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 15,
                }}
                required
              />
              <input
                placeholder="Şube (örn: A)"
                value={addForm.sube}
                onChange={(e) => setAddForm((f) => ({ ...f, sube: e.target.value }))}
                style={{
                  border: '1.5px solid #d1d5db',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 15,
                }}
                required
              />
              <label
                style={{
                  color: 'var(--primary-red)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 15,
                }}
              >
                <input
                  type="checkbox"
                  checked={addForm.pansiyon}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      pansiyon: e.target.checked,
                      oda: e.target.checked ? f.oda : '',
                    }))
                  }
                />{' '}
                Yatılı mı?
              </label>
              {addForm.pansiyon && (
                <input
                  placeholder="Oda (zorunlu)"
                  value={addForm.oda}
                  onChange={(e) => setAddForm((f) => ({ ...f, oda: e.target.value }))}
                  style={{
                    border: '1.5px solid #d1d5db',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 15,
                  }}
                  required
                />
              )}
            </>
          )}
          {addForm.rol === 'parent' && (
            <input
              placeholder="Çocuk ID'leri (virgülle ayır)"
              value={addForm.childId}
              onChange={(e) => setAddForm((f) => ({ ...f, childId: e.target.value }))}
              style={{
                border: '1.5px solid #d1d5db',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 15,
              }}
            />
          )}
          {addError && <div style={{ color: '#b91c1c', fontWeight: 600 }}>{addError}</div>}
          {addSuccess && <div style={{ color: '#16a34a', fontWeight: 600 }}>{addSuccess}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                background: '#eee',
                color: 'var(--primary-red)',
                fontWeight: 600,
                border: 'none',
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={addLoading}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                background: '#16a34a',
                color: '#fff',
                fontWeight: 700,
                border: 'none',
                fontSize: 15,
                cursor: 'pointer',
                opacity: addLoading ? 0.7 : 1,
              }}
            >
              {addLoading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </form>
      </div>
      {revealed && (
        <PasswordRevealModal
          password={revealed.password}
          userLabel={revealed.label}
          onClose={() => {
            setRevealed(null);
            handleClose();
          }}
        />
      )}
    </div>
  );
}
