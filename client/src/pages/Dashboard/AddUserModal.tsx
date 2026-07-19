import { useState } from 'react';
import { X, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { UserService } from '../../utils/apiService';
import { PasswordAdminService } from '../../utils/passwordAdminService';
import PasswordRevealModal from './PasswordManagement/PasswordRevealModal';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';

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

const selectClasses = cn(
  'w-full bg-[var(--paper)] dark:bg-[var(--surface-2)] border border-[var(--rule)] rounded-[var(--radius-sm)] px-3 py-2',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-tint)]',
  'transition-colors',
);

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

const Field = ({ label, required, children }: FieldProps) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs font-medium text-[var(--ink-dim)]">
      {label}
      {required && <span className="text-[var(--accent)] ml-1">*</span>}
    </span>
    {children}
  </label>
);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
      role="presentation"
    >
      <Card className="relative w-full max-w-md overflow-hidden" contentClassName="p-0">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="bg-[var(--accent)] text-white px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-medium">Yeni Kullanıcı Ekle</span>
            <button
              type="button"
              onClick={handleClose}
              className="text-white hover:opacity-80"
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          </div>

          <form
            className="p-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setAddError('');
              setAddSuccess('');
              setAddLoading(true);
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
                const { data, error } = await UserService.createUser(
                  payload as unknown as Record<string, unknown>,
                );
                if (error) {
                  setAddError(error);
                } else {
                  onUserAdded(data as UserType);
                  if (autoGen) {
                    try {
                      const gen = await PasswordAdminService.generatePassword(
                        addForm.id,
                        'new_user',
                      );
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
          >
            <Field label="ID" required>
              <Input
                value={addForm.id}
                onChange={(e) => setAddForm((f) => ({ ...f, id: e.target.value }))}
                required
              />
            </Field>
            <Field label="Ad Soyad" required>
              <Input
                value={addForm.adSoyad}
                onChange={(e) => setAddForm((f) => ({ ...f, adSoyad: e.target.value }))}
                required
              />
            </Field>
            <Field label="Rol" required>
              <select
                value={addForm.rol}
                onChange={(e) => setAddForm((f) => ({ ...f, rol: e.target.value }))}
                className={selectClasses}
                required
              >
                <option value="">Rol Seç</option>
                <option value="student">Öğrenci</option>
                <option value="parent">Veli</option>
                <option value="teacher">Öğretmen</option>
                <option value="admin">Yönetici</option>
              </select>
            </Field>

            <label className="flex items-center gap-2 text-sm text-[var(--ink)] cursor-pointer">
              <input
                type="checkbox"
                checked={autoGen}
                onChange={(e) => setAutoGen(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              Şifreyi otomatik üret
            </label>

            {!autoGen && (
              <Field label="Şifre" required>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={addForm.sifre}
                    onChange={(e) => setAddForm((f) => ({ ...f, sifre: e.target.value }))}
                    required
                    className="pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--ink-dim)] hover:text-[var(--ink)] p-1"
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </Field>
            )}

            {addForm.rol === 'student' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Sınıf" required>
                    <Input
                      placeholder="9"
                      value={addForm.sinif}
                      onChange={(e) => setAddForm((f) => ({ ...f, sinif: e.target.value }))}
                      required
                    />
                  </Field>
                  <Field label="Şube" required>
                    <Input
                      placeholder="A"
                      value={addForm.sube}
                      onChange={(e) => setAddForm((f) => ({ ...f, sube: e.target.value }))}
                      required
                    />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm text-[var(--ink)] cursor-pointer">
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
                    className="accent-[var(--accent)]"
                  />
                  Yatılı mı?
                </label>
                {addForm.pansiyon && (
                  <Field label="Oda" required>
                    <Input
                      value={addForm.oda}
                      onChange={(e) => setAddForm((f) => ({ ...f, oda: e.target.value }))}
                      required
                    />
                  </Field>
                )}
              </>
            )}

            {addForm.rol === 'parent' && (
              <Field label="Çocuk ID'leri (virgülle ayırın)">
                <Input
                  value={addForm.childId}
                  onChange={(e) => setAddForm((f) => ({ ...f, childId: e.target.value }))}
                  placeholder="12345, 67890"
                />
              </Field>
            )}

            {addError && (
              <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border-l-4 border-[var(--accent)] bg-[var(--accent-tint)] px-3 py-2 text-sm text-[var(--accent)]">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {addError}
              </div>
            )}
            {addSuccess && (
              <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border-l-4 border-[var(--ok)] bg-[var(--ok-tint)] px-3 py-2 text-sm text-[var(--ok)]">
                <CheckCircle size={14} className="shrink-0" />
                {addSuccess}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
                İptal
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={addLoading}>
                Ekle
              </Button>
            </div>
          </form>
        </div>
      </Card>

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
