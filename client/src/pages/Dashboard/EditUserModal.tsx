import { useState } from 'react';
import { UserService } from '../../utils/apiService';

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
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Kullanıcıyı Düzenle</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveEdit();
          }}
        >
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ad Soyad</label>
              <input
                type="text"
                className="form-input"
                value={editForm.adSoyad || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, adSoyad: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">E-posta</label>
              <input
                type="email"
                className="form-input"
                value={editForm.email || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>

          {user.rol === 'student' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Sınıf</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.sinif || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, sinif: e.target.value }))}
                    placeholder="9"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Şube</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.sube || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, sube: e.target.value }))}
                    placeholder="A"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Pansiyon</label>
                  <select
                    className="form-select"
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
                </div>
                {editForm.pansiyon && (
                  <div className="form-group">
                    <label className="form-label">
                      Oda <span style={{ color: 'var(--gray-600)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.oda || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, oda: e.target.value }))}
                      placeholder="101"
                      required
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {user.rol === 'teacher' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Meslek</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.meslek || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, meslek: e.target.value }))}
                  placeholder="Öğretmen"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Departman</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.departman || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, departman: e.target.value }))}
                  placeholder="Matematik"
                />
              </div>
            </div>
          )}

          {user.rol === 'parent' && (
            <div className="form-group full-width">
              <label className="form-label">Çocuk ID'leri (virgülle ayırın)</label>
              <input
                type="text"
                className="form-input"
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
            </div>
          )}

          {editError && (
            <div style={{ color: '#b91c1c', fontWeight: 600, marginBottom: '15px' }}>
              {editError}
            </div>
          )}

          <div
            style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              İptal
            </button>
            <button type="submit" className="btn btn-primary" disabled={editLoading}>
              {editLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  Kaydediliyor...
                </>
              ) : (
                'Kaydet'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
