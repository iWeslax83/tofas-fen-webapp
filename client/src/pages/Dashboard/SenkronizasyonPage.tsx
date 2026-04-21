import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, X, Save, Link2 } from 'lucide-react';
import { UserService } from '../../utils/apiService';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BulkLinkSection from './BulkLinkSection';
import AddUserModal from './AddUserModal';
import EditUserModal from './EditUserModal';

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

interface BulkLinkPreview {
  total: number;
  links?: { parentId: string; childId: string }[];
}

interface BulkLinkResult {
  linked: number;
  errors?: { parentId: string; childId: string; message: string }[];
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
  const [editUser, setEditUser] = useState<UserType | null>(null);

  // Student search and filter states
  const [studentSearch, setStudentSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('');

  // Bulk parent-child link states
  const [showBulkLink, setShowBulkLink] = useState(false);
  const [linkFile, setLinkFile] = useState<File | null>(null);
  const [linkPreview, setLinkPreview] = useState<BulkLinkPreview | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkResult, setLinkResult] = useState<BulkLinkResult | null>(null);
  const [linkError, setLinkError] = useState('');

  // Only allow admins
  useEffect(() => {
    if (!authLoading && user && user.rol !== 'admin') {
      console.warn(`User role ${user.rol || 'undefined'} not allowed for senkronizasyon page`);
      navigate(`/${user.rol || 'login'}`, { replace: true });
      return;
    }

    // Redirect to login if no user
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
      return;
    }
  }, [user, authLoading, navigate]);

  // Fetch users (F-M7: guard setState against unmount).
  // UserService.getUsers() doesn't accept an AbortSignal today, so we use a
  // ref-backed mounted flag instead of AbortController. Same effect, no
  // "setState on unmounted component" warnings.
  const isMountedRef = useRef(true);
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await UserService.getUsers();
      if (!isMountedRef.current) return;
      if (error) {
        setError(error);
      } else {
        setUsers(Array.isArray(data) ? (data as UserType[]) : []);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error fetching users:', error);
      setError('Kullanıcılar yüklenirken bir hata oluştu');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchUsers();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchUsers]);

  // Filtered and searched users
  const filteredUsers = users.filter(
    (u) =>
      (!filter || u.rol === filter) &&
      (!search || u.adSoyad.toLowerCase().includes(search.toLowerCase())),
  );

  // Filter students for parent-child matching
  const filteredStudents = users
    .filter((u) => u.rol === 'student')
    .filter((student) => {
      const matchesSearch =
        studentSearch === '' || student.adSoyad.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesClass = studentClassFilter === '' || student.sinif === studentClassFilter;
      return matchesSearch && matchesClass;
    });

  // Select parent and load their children
  const handleSelectParent = (parent: UserType) => {
    setSelectedParent(parent);
    setSelectedChildren(parent.childId || []);
    setManualAssignId('');
    setManualAssignError('');
    setError('');
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find((u) => u.id === userId);
    if (!userToDelete) return;

    const confirmMessage = `"${userToDelete.adSoyad}" kullanıcısını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`;
    if (!window.confirm(confirmMessage)) return;

    try {
      const { error } = await UserService.deleteUser(userId);
      if (error) {
        console.error('Kullanıcı silinirken hata oluştu:', error);
        alert('Kullanıcı silinirken hata oluştu: ' + error);
      } else {
        setUsers((users) => users.filter((u) => u.id !== userId));
        if (selectedParent?.id === userId) {
          setSelectedParent(null);
          setSelectedChildren([]);
        }
        if (editUser?.id === userId) {
          setEditUser(null);
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
    const student = users.find((u) => u.id === manualAssignId && u.rol === 'student');
    if (!student) {
      setManualAssignError('Geçersiz öğrenci ID!');
      return;
    }
    if (selectedChildren.includes(student.id)) {
      setManualAssignError('Bu öğrenci zaten ekli.');
      return;
    }
    setSelectedChildren((prev) => [...prev, student.id]);
    setManualAssignId('');
    setManualAssignError('');
  };

  // Toggle child selection
  const handleToggleChild = (studentId: string) => {
    setSelectedChildren((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  // Save changes to backend
  const handleSave = async () => {
    if (!selectedParent) return;
    setSaving(true);
    try {
      const { error } = await UserService.updateUser(selectedParent.id, {
        childId: selectedChildren,
      });
      if (error) {
        setError(error);
      } else {
        setUsers((users) =>
          users.map((u) => (u.id === selectedParent.id ? { ...u, childId: selectedChildren } : u)),
        );
        setSelectedParent(null);
        setSelectedChildren([]);
        setError('');
      }
    } catch (e) {
      setError('Kayıt sırasında hata oluştu.');
    }
    setSaving(false);
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${user?.rol || 'admin'}` },
    { label: 'Senkronizasyon Yönetimi' },
  ];

  return (
    <ModernDashboardLayout pageTitle="Senkronizasyon Yönetimi" breadcrumb={breadcrumb}>
      <div className="senkronizasyon-page">
        <div className="content-section">
          <div className="filter-bar">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="form-control filter-select"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="İsim ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control search-input"
            />
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              <Plus size={16} className="btn-icon" />
              Yeni Kullanıcı Ekle
            </button>
          </div>

          {/* Bulk Actions Bar */}
          <div className="bulk-actions-bar">
            <button
              className={`btn ${showBulkLink ? 'btn-secondary' : 'btn-warning'}`}
              onClick={() => {
                setShowBulkLink(!showBulkLink);
              }}
            >
              <Link2 size={16} />
              Toplu Veli-Öğrenci Eşleştir
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/admin/veli-eslestirme')}
              style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
            >
              <Users size={16} />
              Veli-Öğrenci Eşleştirme Sayfası
            </button>
          </div>

          {/* Bulk Parent-Child Link Panel */}
          {showBulkLink && (
            <BulkLinkSection
              linkFile={linkFile}
              setLinkFile={setLinkFile}
              linkPreview={linkPreview}
              setLinkPreview={setLinkPreview}
              linkLoading={linkLoading}
              setLinkLoading={setLinkLoading}
              linkResult={linkResult}
              setLinkResult={setLinkResult}
              linkError={linkError}
              setLinkError={setLinkError}
              onLinkComplete={fetchUsers}
              onClose={() => setShowBulkLink(false)}
            />
          )}

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div className="loading-text">Yükleniyor…</div>
            </div>
          ) : (
            <div className="user-grid">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className={`user-card ${selectedParent?.id === u.id ? 'selected' : ''}`}
                >
                  <div className="user-card-header">
                    <div className="user-info">
                      <div className="user-avatar">{u.adSoyad.charAt(0).toUpperCase()}</div>
                      <div className="user-details">
                        <h3>{u.adSoyad}</h3>
                        <p>ID: {u.id}</p>
                        <span className={`user-role role-${u.rol}`}>
                          {u.rol === 'admin'
                            ? 'Yönetici'
                            : u.rol === 'teacher'
                              ? 'Öğretmen'
                              : u.rol === 'student'
                                ? `Öğrenci ${u.pansiyon ? '(Yatılı)' : '(Gündüzlü)'}`
                                : u.rol === 'parent'
                                  ? 'Veli'
                                  : u.rol === 'hizmetli'
                                    ? 'Hizmetli'
                                    : u.rol === 'ziyaretci'
                                      ? 'Ziyaretçi'
                                      : u.rol}
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
                      {u.rol === 'student' && u.pansiyon && (
                        <div className="stat-item">
                          <div className="stat-value">{u.oda || '-'}</div>
                          <div className="stat-label">Oda</div>
                        </div>
                      )}
                      {u.rol === 'parent' && u.childId && u.childId.length > 0 && (
                        <div className="stat-item" style={{ gridColumn: '1 / -1' }}>
                          <div className="stat-value">{u.childId.length}</div>
                          <div className="stat-label">Çocuk Sayısı</div>
                        </div>
                      )}
                    </div>
                    <div className="user-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditUser(u)}>
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
                  Aşağıdan bu veliye ait çocuk(ları) seçin. Kaydet butonuna basınca veritabanına
                  işlenecek.
                </p>
              </div>

              {/* Manual assign by ID */}
              <div className="manual-assign-section">
                <div className="manual-assign-header">
                  <span className="manual-assign-label">
                    Hangi çocuğa (ID) eşleştirmek istersiniz?
                  </span>
                  <div className="manual-assign-input-group">
                    <input
                      type="text"
                      className="form-input manual-assign-input"
                      placeholder="Öğrenci ID girin"
                      value={manualAssignId}
                      onChange={(e) => setManualAssignId(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={handleManualAssign}>
                      <Plus size={16} />
                      Ekle
                    </button>
                  </div>
                </div>
                {manualAssignError && <div className="error-message">{manualAssignError}</div>}
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
                  {filteredStudents.map((student) => (
                    <label key={student.id} className="student-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedChildren.includes(student.id)}
                        onChange={() => handleToggleChild(student.id)}
                        className="student-checkbox"
                      />
                      <div className="student-info">
                        <span className="student-name">{student.adSoyad}</span>
                        <span className="student-class">
                          {student.sinif || '-'}/{student.sube || '-'}
                        </span>
                        {student.pansiyon && <span className="student-dormitory">Yatılı</span>}
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
                    {selectedChildren.map((childId) => {
                      const child = users.find((u) => u.id === childId);
                      return child ? (
                        <div key={childId} className="selected-child-item">
                          <span className="child-name">{child.adSoyad}</span>
                          <span className="child-class">
                            {child.sinif || '-'}/{child.sube || '-'}
                          </span>
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
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
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
                  onClick={() => {
                    setSelectedParent(null);
                    setSelectedChildren([]);
                    setError('');
                  }}
                >
                  <X size={16} />
                  İptal
                </button>
              </div>
            </div>
          )}
        </div>

        {showAddModal && (
          <AddUserModal
            onUserAdded={(newUser) => {
              setUsers((users) => [newUser, ...users]);
            }}
            onClose={() => setShowAddModal(false)}
          />
        )}

        {editUser && (
          <EditUserModal
            user={editUser}
            onUserUpdated={(userId, updatedFields) => {
              setUsers((users) =>
                users.map((u) => (u.id === userId ? { ...u, ...updatedFields } : u)),
              );
            }}
            onClose={() => setEditUser(null)}
          />
        )}
      </div>
    </ModernDashboardLayout>
  );
}
