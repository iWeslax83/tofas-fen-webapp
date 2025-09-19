import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, Plus, RefreshCw, X, Save } from 'lucide-react';
import { UserService } from '../../utils/apiService';
import { useAuthContext } from "../../contexts/AuthContext";
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BackButton from '../../components/BackButton';
import './SenkronizasyonPage.css';

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

const ROLES = [
  { value: '', label: 'Tümü' },
  { value: 'student', label: 'Öğrenciler' },
  { value: 'parent', label: 'Veliler' },
  { value: 'teacher', label: 'Öğretmenler' },
  { value: 'admin', label: 'Yöneticiler' },
  { value: 'hizmetli', label: 'Hizmetliler' },
];

export default function SenkronizasyonPage() {
  const { user, isLoading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  
  // State management
  const [users, setUsers] = useState<UserType[]>([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedParent, setSelectedParent] = useState<UserType | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [manualAssignId, setManualAssignId] = useState('');
  const [manualAssignError, setManualAssignError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    id: '',
    adSoyad: '',
    rol: '',
    sifre: '',
    sinif: '',
    sube: '',
    oda: '',
    pansiyon: false,
    childId: ''
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editUser, setEditUser] = useState<UserType | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserType>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  
  // Student search and filter states
  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('');

  // Only allow admins
  useEffect(() => {
    if (!authLoading && user && user.rol !== 'admin') {
      console.warn(`User role ${user.rol} not allowed for senkronizasyon page`);
      navigate(`/${user.rol || 'login'}`, { replace: true });
      return;
    }

    // Redirect to login if no user
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
      return;
    }
  }, [user, authLoading, navigate]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await UserService.getUsers();
      if (error) {
        setError(error);
      } else {
        setUsers(Array.isArray(data) ? data as UserType[] : []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Kullanıcılar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filtered and searched users
  const filteredUsers = users.filter(u =>
    (!filter || u.rol === filter) &&
    (!search || u.adSoyad.toLowerCase().includes(search.toLowerCase()))
  );

  // Filter students for parent-child matching
  const filteredStudents = users.filter(u => u.rol === 'student').filter(student => {
    const matchesSearch = studentSearch === '' || student.adSoyad.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesClass = studentClassFilter === '' || student.sinif === studentClassFilter;
    return matchesSearch && matchesClass;
  });

  // Select parent and load their children
  // Not used currently
  const handleSelectParent = (parent: UserType) => {
    setSelectedParent(parent);
    setSelectedChildren(parent.childId || []);
    setManualAssignId('');
    setManualAssignError('');
    setError('');
  };

  const handleEditUser = (user: UserType) => {
    setEditUser(user);
    setEditForm({ ...user });
    setEditError('');
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;
    
    const confirmMessage = `"${userToDelete.adSoyad}" kullanıcısını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`;
    if (!window.confirm(confirmMessage)) return;
    
    try {
      const { error } = await UserService.deleteUser(userId);
      if (error) {
        console.error('Kullanıcı silinirken hata oluştu:', error);
        alert('Kullanıcı silinirken hata oluştu: ' + error);
      } else {
        setUsers(users => users.filter(u => u.id !== userId));
        // Eğer silinen kullanıcı seçili parent ise, seçimi temizle
        if (selectedParent?.id === userId) {
          setSelectedParent(null);
          setSelectedChildren([]);
        }
        // Eğer silinen kullanıcı edit ediliyorsa, edit'i temizle
        if (editUser?.id === userId) {
          setEditUser(null);
          setEditForm({});
          setEditError('');
        }
        alert('Kullanıcı başarıyla silindi.');
      }
    } catch (error) {
      console.error('Kullanıcı silinirken hata oluştu:', error);
      alert('Kullanıcı silinirken hata oluştu.');
    }
  };

  // Manual assignment by ID
  const handleManualAssign = () => {
    const student = users.find(u => u.id === manualAssignId && u.rol === 'student');
    if (!student) {
      setManualAssignError('Geçersiz öğrenci ID!');
      return;
    }
    if (selectedChildren.includes(student.id)) {
      setManualAssignError('Bu öğrenci zaten ekli.');
      return;
    }
    setSelectedChildren(prev => [...prev, student.id]);
    setManualAssignId('');
    setManualAssignError('');
  };

  // Toggle child selection
  const handleToggleChild = (studentId: string) => {
    setSelectedChildren(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Save changes to backend
  const handleSave = async () => {
    if (!selectedParent) return;
    setSaving(true);
    try {
      const { error } = await UserService.updateUser(selectedParent.id, { childId: selectedChildren });
      if (error) {
        setError(error);
      } else {
        setUsers(users => users.map(u =>
          u.id === selectedParent.id ? { ...u, childId: selectedChildren } : u
        ));
        setSelectedParent(null);
        setSelectedChildren([]);
        setError('');
      }
    } catch (e) {
      setError('Kayıt sırasında hata oluştu.');
    }
    setSaving(false);
  };

  // Save edited user
  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditLoading(true);
    try {
      const { error } = await UserService.updateUser(editUser.id, editForm);
      if (error) {
        setEditError(error);
      } else {
        setUsers(users => users.map(u =>
          u.id === editUser.id ? { ...u, ...editForm } : u
        ));
        setEditUser(null);
        setEditForm({});
        setEditError('');
      }
    } catch (e: any) {
      setEditError('Kullanıcı güncellenirken hata oluştu.');
    }
    setEditLoading(false);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditUser(null);
    setEditForm({});
    setEditError('');
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'admin'}` },
    { label: 'Senkronizasyon Yönetimi' }
  ];

  return (
    <ModernDashboardLayout
      pageTitle="Senkronizasyon Yönetimi"
      breadcrumb={breadcrumb}
    >
      <div className="senkronizasyon-page">
        <BackButton />
        <main className="panel-main">
      <div className="content-section">
        <div className="filter-bar">
          <select 
            value={filter} 
            onChange={e => setFilter(e.target.value)}
            className="form-control filter-select"
          >
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="İsim ile ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-control search-input"
          />
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} className="btn-icon" />
            Yeni Kullanıcı Ekle
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-text">Yükleniyor…</div>
          </div>
        ) : (
          <div className="user-grid">
            {filteredUsers.map(u => (
              <div key={u.id} className={`user-card ${selectedParent?.id === u.id ? 'selected' : ''}`}>
                <div className="user-card-header">
                  <div className="user-info">
                    <div className="user-avatar">
                      {u.adSoyad.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                      <h3>{u.adSoyad}</h3>
                      <p>ID: {u.id}</p>
                      <span className={`user-role role-${u.rol}`}>
                        {u.rol === 'admin' ? 'Yönetici' :
                         u.rol === 'teacher' ? 'Öğretmen' :
                         u.rol === 'student' ? 'Öğrenci' :
                         u.rol === 'parent' ? 'Veli' :
                         u.rol === 'hizmetli' ? 'Hizmetli' : u.rol}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="user-card-body">
                  <div className="user-stats">
                    <div className="stat-item">
                      <div className="stat-value">{u.sinif || '-'}</div>
                      <div className="stat-label">Sınıf</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-value">{u.sube || '-'}</div>
                      <div className="stat-label">Şube</div>
                    </div>
                    {u.rol === 'student' && (
                      <>
                        <div className="stat-item">
                          <div className="stat-value">{u.oda || '-'}</div>
                          <div className="stat-label">Oda</div>
                        </div>
                        <div className="stat-item">
                          <div className="stat-value">{u.pansiyon ? 'Yatılı' : 'Gündüzlü'}</div>
                          <div className="stat-label">Durum</div>
                        </div>
                      </>
                    )}
                    {u.rol === 'parent' && u.childId && u.childId.length > 0 && (
                      <div className="stat-item" style={{ gridColumn: '1 / -1' }}>
                        <div className="stat-value">{u.childId.length}</div>
                        <div className="stat-label">Çocuk Sayısı</div>
                      </div>
                    )}
                  </div>
                  <div className="user-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleEditUser(u)}
                    >
                      Düzenle
                    </button>
                    {u.rol === 'parent' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSelectParent(u)}
                      >
                        Çocuk Eşleştir
                      </button>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteUser(u.id)}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {selectedParent && (
          <div className="parent-child-matching-panel">
            <div className="matching-header">
              <h3 className="matching-title">
                <Users size={20} />
                Veli: {selectedParent.adSoyad}
              </h3>
              <p className="matching-description">
                Aşağıdan bu veliye ait çocuk(ları) seçin. Kaydet butonuna basınca veritabanına işlenecek.
              </p>
            </div>

            {/* Manual assign by ID */}
            <div className="manual-assign-section">
              <div className="manual-assign-header">
                <span className="manual-assign-label">Hangi çocuğa (ID) eşleştirmek istersiniz?</span>
                <div className="manual-assign-input-group">
                  <input
                    type="text"
                    className="form-input manual-assign-input"
                    placeholder="Öğrenci ID girin"
                    value={manualAssignId}
                    onChange={e => setManualAssignId(e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleManualAssign}
                  >
                    <Plus size={16} />
                    Ekle
                  </button>
                </div>
              </div>
              {manualAssignError && (
                <div className="error-message">{manualAssignError}</div>
              )}
            </div>

            {/* Student selection */}
            <div className="student-selection-section">
              <div className="student-selection-header">
                <h4 className="section-subtitle">Mevcut Öğrenciler</h4>
                <div className="student-search-filter">
                  <input
                    type="text"
                    className="form-input student-search"
                    placeholder="Öğrenci adı ile ara..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                  <select
                    className="form-select student-filter"
                    value={studentClassFilter}
                    onChange={(e) => setStudentClassFilter(e.target.value)}
                  >
                    <option value="">Tüm Sınıflar</option>
                    <option value="9">9. Sınıf</option>
                    <option value="10">10. Sınıf</option>
                    <option value="11">11. Sınıf</option>
                    <option value="12">12. Sınıf</option>
                  </select>
                </div>
              </div>
              <div className="senkronizasyon-student-grid">
                {filteredStudents.map(student => (
                  <label key={student.id} className="student-checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedChildren.includes(student.id)}
                      onChange={() => handleToggleChild(student.id)}
                      className="student-checkbox"
                    />
                    <div className="student-info">
                      <span className="student-name">{student.adSoyad}</span>
                      <span className="student-class">{student.sinif || '-'}/{student.sube || '-'}</span>
                      {student.pansiyon && (
                        <span className="student-dormitory">Yatılı</span>
                      )}
                    </div>
                  </label>
                ))}
                {filteredStudents.length === 0 && (
                  <div className="no-students-found">
                    <p>Arama kriterlerine uygun öğrenci bulunamadı.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Selected children summary */}
            {selectedChildren.length > 0 && (
              <div className="selected-children-summary">
                <h4 className="section-subtitle">Seçilen Çocuklar ({selectedChildren.length})</h4>
                <div className="selected-children-list">
                  {selectedChildren.map(childId => {
                    const child = users.find(u => u.id === childId);
                    return child ? (
                      <div key={childId} className="selected-child-item">
                        <span className="child-name">{child.adSoyad}</span>
                        <span className="child-class">{child.sinif || '-'}/{child.sube || '-'}</span>
                        <button
                          className="remove-child-btn"
                          onClick={() => handleToggleChild(childId)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Error and success messages */}
            {error && <div className="error-message">{error}</div>}

            {/* Action buttons */}
            <div className="matching-actions">
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="loading-spinner"></div>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Kaydet
                  </>
                )}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { setSelectedParent(null); setSelectedChildren([]); setError(''); }}
              >
                <X size={16} />
                İptal
              </button>
            </div>
          </div>
        )}
      </div>
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, minWidth: 340, maxWidth: 400, width: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', position: 'relative' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#8A1538', marginBottom: 18 }}>Yeni Kullanıcı Ekle</h2>
            <form onSubmit={async e => {
              e.preventDefault();
              setAddError(''); setAddSuccess(''); setAddLoading(true);
              // Validasyon
              if (!addForm.id || !addForm.adSoyad || !addForm.rol || !addForm.sifre) {
                setAddError('ID, Ad Soyad, Rol ve Şifre zorunludur.'); setAddLoading(false); return;
              }
              if (addForm.sifre.length < 4) {
                setAddError('Şifre en az 4 karakter olmalı.'); setAddLoading(false); return;
              }

              try {
                const payload: any = {
                  id: addForm.id,
                  adSoyad: addForm.adSoyad,
                  rol: addForm.rol,
                  sifre: addForm.sifre,
                };
                if (addForm.rol === 'student') {
                  payload.sinif = addForm.sinif;
                  payload.sube = addForm.sube;
                  payload.oda = addForm.oda;
                  payload.pansiyon = addForm.pansiyon;
                }
                if (addForm.rol === 'parent') {
                  payload.childId = addForm.childId.split(',').map(s => s.trim()).filter(Boolean);
                }
                const { data, error } = await UserService.createUser(payload);
                if (error) {
                  setAddError(error);
                } else {
                  setUsers(users => [data as UserType, ...users]);
                  setAddSuccess('Kullanıcı başarıyla eklendi!');
                  setTimeout(() => { setShowAddModal(false); setAddForm({ id: '', adSoyad: '', rol: '', sifre: '', sinif: '', sube: '', oda: '', pansiyon: false, childId: '' }); setAddSuccess(''); }, 1200);
                }
              } catch (err: any) {
                setAddError('Kullanıcı eklenemedi.');
              } finally {
                setAddLoading(false);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="ID" value={addForm.id || ''} onChange={e => setAddForm(f => ({ ...f, id: e.target.value }))} style={{ border: '1.5px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 15 }} required />
              <input placeholder="Ad Soyad" value={addForm.adSoyad} onChange={e => setAddForm(f => ({ ...f, adSoyad: e.target.value }))} style={{ border: '1.5px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 15 }} required />
              <select value={addForm.rol} onChange={e => setAddForm(f => ({ ...f, rol: e.target.value }))} style={{ border: '1.5px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 15 }} required>
                <option value="">Rol Seç</option>
                <option value="student">Öğrenci</option>
                <option value="parent">Veli</option>
                <option value="teacher">Öğretmen</option>
                <option value="admin">Yönetici</option>
                <option value="hizmetli">Hizmetli</option>
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type={showPassword ? 'text' : 'password'} placeholder="Şifre" value={addForm.sifre} onChange={e => setAddForm(f => ({ ...f, sifre: e.target.value }))} style={{ border: '1.5px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 15, flex: 1 }} required />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{ background: 'none', border: 'none', color: '#8A1538', fontWeight: 600, cursor: 'pointer' }}>{showPassword ? 'Gizle' : 'Göster'}</button>
              </div>
              {addForm.rol === 'student' && (
                <>
                  <input placeholder="Sınıf (örn: 9)" value={addForm.sinif} onChange={e => setAddForm(f => ({ ...f, sinif: e.target.value }))} style={{ border: '1.5px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 15 }} required />
                  <input placeholder="Şube (örn: A)" value={addForm.sube} onChange={e => setAddForm(f => ({ ...f, sube: e.target.value }))} style={{ border: '1.5px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 15 }} required />
                  <label style={{ color: "#8A1538", display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                    <input type="checkbox" checked={addForm.pansiyon} onChange={e => setAddForm(f => ({ ...f, pansiyon: e.target.checked, oda: e.target.checked ? f.oda : '' }))} /> Yatılı mı?
                  </label>
                  {addForm.pansiyon && (
                    <input placeholder="Oda (zorunlu)" value={addForm.oda} onChange={e => setAddForm(f => ({ ...f, oda: e.target.value }))} style={{ border: '1.5px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 15 }} required />
                  )}
                </>
              )}
              {addForm.rol === 'parent' && (
                <input placeholder="Çocuk ID'leri (virgülle ayır)" value={addForm.childId} onChange={e => setAddForm(f => ({ ...f, childId: e.target.value }))} style={{ border: '1.5px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 15 }} />
              )}
              {addError && <div style={{ color: '#b91c1c', fontWeight: 600 }}>{addError}</div>}
              {addSuccess && <div style={{ color: '#16a34a', fontWeight: 600 }}>{addSuccess}</div>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => { setShowAddModal(false); setAddForm({ id: '', adSoyad: '', rol: '', sifre: '', sinif: '', sube: '', oda: '', pansiyon: false, childId: '' }); setAddError(''); setAddSuccess(''); }} style={{ padding: '8px 18px', borderRadius: 8, background: '#eee', color: '#8A1538', fontWeight: 600, border: 'none', fontSize: 15, cursor: 'pointer' }}>İptal</button>
                <button type="submit" disabled={addLoading} style={{ padding: '8px 18px', borderRadius: 8, background: '#16a34a', color: '#fff', fontWeight: 700, border: 'none', fontSize: 15, cursor: 'pointer', opacity: addLoading ? 0.7 : 1 }}>{addLoading ? 'Ekleniyor...' : 'Ekle'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Kullanıcıyı Düzenle</h2>
              <button className="modal-close" onClick={handleCancelEdit}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ad Soyad</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.adSoyad || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, adSoyad: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">E-posta</label>
                  <input
                    type="email"
                    className="form-input"
                    value={editForm.email || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              {editUser.rol === 'student' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Sınıf</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.sinif || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, sinif: e.target.value }))}
                        placeholder="9"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Şube</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editForm.sube || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, sube: e.target.value }))}
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
                        onChange={e => {
                          const isPansiyon = e.target.value === 'true';
                          setEditForm(prev => ({ 
                            ...prev, 
                            pansiyon: isPansiyon,
                            oda: isPansiyon ? prev.oda : '' // Eğer gündüzlü yapılırsa oda bilgisini temizle
                          }));
                        }}
                      >
                        <option value="false">Gündüzlü</option>
                        <option value="true">Yatılı</option>
                      </select>
                    </div>
                    {editForm.pansiyon && (
                      <div className="form-group">
                        <label className="form-label">Oda <span style={{color: 'red'}}>*</span></label>
                        <input
                          type="text"
                          className="form-input"
                          value={editForm.oda || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, oda: e.target.value }))}
                          placeholder="101"
                          required
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {editUser.rol === 'teacher' && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Meslek</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.meslek || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, meslek: e.target.value }))}
                      placeholder="Öğretmen"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Departman</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.departman || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, departman: e.target.value }))}
                      placeholder="Matematik"
                    />
                  </div>
                </div>
              )}

              {editUser.rol === 'parent' && (
                <div className="form-group full-width">
                  <label className="form-label">Çocuk ID'leri (virgülle ayırın)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.childId ? (Array.isArray(editForm.childId) ? editForm.childId.join(', ') : editForm.childId) : ''}
                    onChange={e => setEditForm(prev => ({ 
                      ...prev, 
                      childId: e.target.value.split(',').map(id => id.trim()).filter(Boolean)
                    }))}
                    placeholder="12345, 67890"
                  />
                </div>
              )}

              {editError && (
                <div style={{ color: '#b91c1c', fontWeight: 600, marginBottom: '15px' }}>
                  {editError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelEdit}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editLoading}
                >
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
        )}
        </main>
      </div>
    </ModernDashboardLayout>
  );
};

