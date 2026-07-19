import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { UserService } from '../../utils/apiService';
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

export interface EditUserModalProps {
  user: UserType;
  onUserUpdated: (userId: string, updatedFields: Partial<UserType>) => void;
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
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Field = ({ label, required, fullWidth, children }: FieldProps) => (
  <label className={cn('flex flex-col gap-1', fullWidth && 'md:col-span-2')}>
    <span className="text-xs font-medium text-[var(--ink-dim)]">
      {label}
      {required && <span className="text-[var(--accent)] ml-1">*</span>}
    </span>
    {children}
  </label>
);

export default function EditUserModal({ user, onUserUpdated, onClose }: EditUserModalProps) {
  const [editForm, setEditForm] = useState<Partial<UserType>>({ ...user });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const handleSaveEdit = async () => {
    setEditLoading(true);
    try {
      const { error } = await UserService.updateUser(user.id, editForm);
      if (error) {
        setEditError(error);
      } else {
        onUserUpdated(user.id, editForm);
        onClose();
      }
    } catch {
      setEditError('Kullanıcı güncellenirken hata oluştu.');
    }
    setEditLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <Card
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
        contentClassName="p-0"
      >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="bg-[var(--accent)] text-white px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-medium">Kullanıcıyı Düzenle</span>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:opacity-80"
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          </div>

          <form
            className="p-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEdit();
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Ad Soyad" required>
                <Input
                  value={editForm.adSoyad || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, adSoyad: e.target.value }))}
                  required
                />
              </Field>
              <Field label="E-posta">
                <Input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </Field>
            </div>

            {user.rol === 'student' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Sınıf">
                    <Input
                      value={editForm.sinif || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, sinif: e.target.value }))}
                      placeholder="9"
                    />
                  </Field>
                  <Field label="Şube">
                    <Input
                      value={editForm.sube || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, sube: e.target.value }))}
                      placeholder="A"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Pansiyon">
                    <select
                      className={selectClasses}
                      value={editForm.pansiyon ? 'true' : 'false'}
                      onChange={(e) => {
                        const isPansiyon = e.target.value === 'true';
                        setEditForm((prev) => ({
                          ...prev,
                          pansiyon: isPansiyon,
                          oda: isPansiyon ? prev.oda || '' : '',
                        }));
                      }}
                    >
                      <option value="false">Gündüzlü</option>
                      <option value="true">Yatılı</option>
                    </select>
                  </Field>
                  {editForm.pansiyon && (
                    <Field label="Oda" required>
                      <Input
                        value={editForm.oda || ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, oda: e.target.value }))}
                        placeholder="101"
                        required
                      />
                    </Field>
                  )}
                </div>
              </>
            )}

            {user.rol === 'teacher' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Meslek">
                  <Input
                    value={editForm.meslek || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, meslek: e.target.value }))}
                    placeholder="Öğretmen"
                  />
                </Field>
                <Field label="Departman">
                  <Input
                    value={editForm.departman || ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, departman: e.target.value }))
                    }
                    placeholder="Matematik"
                  />
                </Field>
              </div>
            )}

            {user.rol === 'parent' && (
              <Field label="Çocuk ID'leri (virgülle ayırın)" fullWidth>
                <Input
                  value={
                    editForm.childId
                      ? Array.isArray(editForm.childId)
                        ? editForm.childId.join(', ')
                        : editForm.childId
                      : ''
                  }
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      childId: e.target.value
                        .split(',')
                        .map((id) => id.trim())
                        .filter(Boolean),
                    }))
                  }
                  placeholder="12345, 67890"
                />
              </Field>
            )}

            {editError && (
              <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border-l-4 border-[var(--accent)] bg-[var(--accent-tint)] px-3 py-2 text-sm text-[var(--accent)]">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {editError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                İptal
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={editLoading}>
                Kaydet
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
