import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, X, Save, Link2 } from 'lucide-react';
import { UserService } from '../../utils/apiService';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BulkLinkSection from './BulkLinkSection';
import AddUserModal from './AddUserModal';
import EditUserModal from './EditUserModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { cn } from '../../utils/cn';
import { safeConsoleError, safeConsoleWarn } from '../../utils/safeLogger';

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
];

const ROL_LABEL: Record<string, string> = {
  admin: 'Yönetici',
  teacher: 'Öğretmen',
  parent: 'Veli',
  ziyaretci: 'Ziyaretçi',
};

function getRolLabel(u: UserType): string {
  if (u.rol === 'student') {
    return `Öğrenci ${u.pansiyon ? '(Yatılı)' : '(Gündüzlü)'}`;
  }
  return ROL_LABEL[u.rol] ?? u.rol;
}

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
      safeConsoleWarn(`User role ${user.rol || 'undefined'} not allowed for senkronizasyon page`);
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
      safeConsoleError('Error fetching users:', error);
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
        safeConsoleError('Kullanıcı silinirken hata oluştu:', error);
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
      safeConsoleError('Kullanıcı silinirken hata oluştu:', error);
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

  const inputBase = cn(
    'bg-transparent border border-[var(--rule)] px-3 py-2 text-sm text-[var(--ink)]',
    'placeholder:text-[var(--ink-dim)]',
    'focus:outline-none focus:border-[var(--state)] focus:border-2',
    'transition-colors',
  );

  return (
    <ModernDashboardLayout pageTitle="Senkronizasyon Yönetimi" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        {/* Page header */}
        <header>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Senkronizasyon Yönetimi</h1>
        </header>

        {/* Filter + action bar */}
        <div className="flex flex-wrap items-center gap-3 border border-[var(--rule)] bg-[var(--surface)] p-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={cn(inputBase, 'min-w-[180px]')}
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
            className={cn(inputBase, 'flex-1 min-w-[180px]')}
          />
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={14} />
            Yeni Kullanıcı Ekle
          </Button>
        </div>

        {/* Bulk actions bar */}
        <div className="flex flex-wrap items-center gap-3 border border-[var(--rule)] bg-[var(--surface)] px-4 py-3">
          <Button
            variant={showBulkLink ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowBulkLink(!showBulkLink)}
          >
            <Link2 size={14} />
            Toplu Veli-Öğrenci Eşleştir
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/admin/veli-eslestirme')}>
            <Users size={14} />
            Veli-Öğrenci Eşleştirme Sayfası
          </Button>
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

        {/* User grid */}
        {loading ? (
          <div className="p-16 text-center text-xs font-medium text-[var(--ink-dim)]">
            Yükleniyor…
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-px bg-[var(--rule)]">
            {filteredUsers.map((u) => (
              <UserCard
                key={u.id}
                u={u}
                selected={selectedParent?.id === u.id}
                onEdit={() => setEditUser(u)}
                onSelectParent={() => handleSelectParent(u)}
                onDelete={() => handleDeleteUser(u.id)}
              />
            ))}
            {filteredUsers.length === 0 && (
              <div className="col-span-full bg-[var(--paper)] p-12 text-center text-xs font-medium text-[var(--ink-dim)]">
                Arama kriterlerine uygun kullanıcı bulunamadı.
              </div>
            )}
          </div>
        )}

        {/* Parent-child matching panel */}
        {selectedParent && (
          <Card accentBar contentClassName="p-6 space-y-6">
            {/* Panel header */}
            <div className="border-b border-[var(--rule)] pb-4">
              <div className="text-xs font-medium text-[var(--ink-dim)]">Eşleştirme Paneli</div>
              <h2 className="font-serif text-xl text-[var(--ink)] mt-1 flex items-center gap-2">
                <Users size={18} />
                Veli: {selectedParent.adSoyad}
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">
                Aşağıdan bu veliye ait çocuk(ları) seçin. Kaydet butonuna basınca veritabanına
                işlenecek.
              </p>
            </div>

            {/* Manual assign by ID */}
            <div className="border border-[var(--rule)] bg-[var(--surface)] p-4 space-y-3">
              <div className="text-xs font-medium text-[var(--ink-dim)]">
                ID ile Manuel Eşleştir
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  className={cn(inputBase, 'flex-1 min-w-[150px]')}
                  placeholder="Öğrenci ID girin"
                  value={manualAssignId}
                  onChange={(e) => setManualAssignId(e.target.value)}
                />
                <Button variant="primary" size="sm" onClick={handleManualAssign}>
                  <Plus size={14} />
                  Ekle
                </Button>
              </div>
              {manualAssignError && (
                <p className="text-sm text-[var(--state)]">{manualAssignError}</p>
              )}
            </div>

            {/* Student selection */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-medium text-[var(--ink-dim)]">Mevcut Öğrenciler</div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    className={cn(inputBase, 'min-w-[180px]')}
                    placeholder="Öğrenci adı ile ara..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                  <select
                    className={cn(inputBase, 'min-w-[130px]')}
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

              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-px bg-[var(--rule)] max-h-[400px] overflow-y-auto border border-[var(--rule)]">
                {filteredStudents.map((student) => {
                  const checked = selectedChildren.includes(student.id);
                  return (
                    <label
                      key={student.id}
                      className={cn(
                        'flex items-center gap-3 p-3 cursor-pointer bg-[var(--paper)]',
                        'hover:bg-[var(--surface)] transition-colors',
                        checked && 'bg-[var(--surface-2)]',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleChild(student.id)}
                        className="w-4 h-4 accent-[var(--state)] flex-shrink-0 cursor-pointer"
                      />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-serif text-sm text-[var(--ink)] truncate">
                          {student.adSoyad}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--ink-dim)]">
                          {student.sinif || '—'}/{student.sube || '—'}
                        </span>
                        {student.pansiyon && (
                          <Chip tone="black" className="w-fit">
                            Yatılı
                          </Chip>
                        )}
                      </div>
                    </label>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <div className="col-span-full bg-[var(--paper)] p-8 text-center text-xs font-medium text-[var(--ink-dim)]">
                    Arama kriterlerine uygun öğrenci bulunamadı.
                  </div>
                )}
              </div>
            </div>

            {/* Selected children summary */}
            {selectedChildren.length > 0 && (
              <div className="border border-[var(--rule)] bg-[var(--surface)] p-4 space-y-3">
                <div className="text-xs font-medium text-[var(--ink-dim)]">
                  Seçilen Çocuklar ({selectedChildren.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedChildren.map((childId) => {
                    const child = users.find((u) => u.id === childId);
                    return child ? (
                      <div
                        key={childId}
                        className="inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--rule)] bg-[var(--paper)]"
                      >
                        <span className="font-serif text-sm text-[var(--ink)]">
                          {child.adSoyad}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--ink-dim)]">
                          {child.sinif || '—'}/{child.sube || '—'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleChild(childId)}
                          className="text-[var(--ink-dim)] hover:text-[var(--state)] transition-colors"
                          aria-label="Kaldır"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-[var(--state)] border border-[var(--state)] bg-[var(--surface)] px-3 py-2">
                {error}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--rule)]">
              <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
                <Save size={14} />
                Kaydet
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedParent(null);
                  setSelectedChildren([]);
                  setError('');
                }}
              >
                <X size={14} />
                İptal
              </Button>
            </div>
          </Card>
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
    </ModernDashboardLayout>
  );
}

// ── User card sub-component ──────────────────────────────────────────────────

interface UserCardProps {
  u: UserType;
  selected: boolean;
  onEdit: () => void;
  onSelectParent: () => void;
  onDelete: () => void;
}

function UserCard({ u, selected, onEdit, onSelectParent, onDelete }: UserCardProps) {
  const initials = u.adSoyad.charAt(0).toLocaleUpperCase('tr');

  return (
    <div
      className={cn(
        'bg-[var(--paper)] flex flex-col',
        selected && 'border-l-4 border-l-[var(--state)]',
      )}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--rule)] bg-[var(--surface)]">
        {/* Flat initial avatar */}
        <div className="w-9 h-9 flex-shrink-0 bg-[var(--surface-2)] border border-[var(--rule)] flex items-center justify-center font-mono text-xs font-medium text-[var(--ink)]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-serif text-sm text-[var(--ink)] truncate">{u.adSoyad}</div>
          <div className="font-mono text-[10px] text-[var(--ink-dim)] truncate">ID: {u.id}</div>
          <Chip tone="default" className="mt-1">
            {getRolLabel(u)}
          </Chip>
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 py-3 flex-1 flex flex-col gap-3">
        {/* Stats — only the ones this role actually has, so admin/teacher
            cards don't render two empty "—" boxes and look broken. */}
        {u.rol === 'student' && (
          <div className="grid grid-cols-2 gap-px bg-[var(--rule)] border border-[var(--rule)]">
            <StatCell label="Sınıf" value={u.sinif || '—'} />
            <StatCell label="Şube" value={u.sube || '—'} />
            {u.pansiyon && <StatCell label="Oda" value={u.oda || '—'} />}
          </div>
        )}
        {u.rol === 'parent' && u.childId && u.childId.length > 0 && (
          <div className="border border-[var(--rule)] bg-[var(--paper)] p-2 text-center">
            <div className="font-serif text-lg text-[var(--ink)]">{u.childId.length}</div>
            <div className="text-xs font-medium text-[var(--ink-dim)]">Çocuk sayısı</div>
          </div>
        )}

        {/* Actions stay right under the content. Cards in a ruled row stretch
            to equal height; keeping the buttons here (not mt-auto'd to the
            floor) stops a tall student card from leaving a short admin card's
            buttons stranded in a band far below its header. */}
        <div className="flex flex-wrap gap-1.5">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Düzenle
          </Button>
          {u.rol === 'parent' && (
            <Button variant="secondary" size="sm" onClick={onSelectParent}>
              Çocuk Eşleştir
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={onDelete}>
            Sil
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--paper)] p-2 text-center">
      <div className="font-serif text-base text-[var(--ink)]">{value}</div>
      <div className="text-xs font-medium text-[var(--ink-dim)]">{label}</div>
    </div>
  );
}
