import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, X, Save, Link2, ChevronLeft, ChevronRight, KeyRound } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { UserService } from '../../utils/apiService';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import BulkLinkSection from './BulkLinkSection';
import AddUserModal from './AddUserModal';
import EditUserModal from './EditUserModal';
import ResetReasonModal from './PasswordManagement/ResetReasonModal';
import PasswordRevealModal from './PasswordManagement/PasswordRevealModal';
import { useResetPassword } from './PasswordManagement/hooks/useUserPasswordActions';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { LoadBar } from '../../components/SkeletonComponents';
import { cn } from '../../utils/cn';
import { safeConsoleError, safeConsoleWarn } from '../../utils/safeLogger';

const TABLE_PAGE_SIZE = 20;
/** Debounce the name search before it hits the server, same idea as the
 * other admin list pages — avoids a request per keystroke. */
const SEARCH_DEBOUNCE_MS = 350;

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
  const confirm = useConfirm();

  // State management
  // The full roster, unpaginated — used only by the parent-child matching
  // panel below (it needs every student to search/filter across, not just
  // one page) and to resolve id → name when rendering "selected children".
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // The visible table, server-paginated — this is what used to render every
  // user (hundreds) as one giant unpaginated card grid (B2.1).
  const [tableUsers, setTableUsers] = useState<UserType[]>([]);
  const [tablePage, setTablePage] = useState(1);
  const [tableTotalPages, setTableTotalPages] = useState(1);
  const [tableTotalCount, setTableTotalCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState('');

  const [selectedParent, setSelectedParent] = useState<UserType | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [manualAssignId, setManualAssignId] = useState('');
  const [manualAssignError, setManualAssignError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<UserType | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserType | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<{
    password: string;
    label: string;
  } | null>(null);
  const resetPasswordMut = useResetPassword();

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

  // Fetch the full roster once (F-M7: guard setState against unmount).
  // UserService.getUsers() doesn't accept an AbortSignal today, so we use a
  // ref-backed mounted flag instead of AbortController. Same effect, no
  // "setState on unmounted component" warnings.
  const isMountedRef = useRef(true);
  const fetchAllUsers = useCallback(async () => {
    try {
      const { data, error } = await UserService.getUsers();
      if (!isMountedRef.current) return;
      if (!error) {
        setAllUsers(Array.isArray(data) ? (data as UserType[]) : []);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      safeConsoleError('Error fetching users:', error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAllUsers();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAllUsers]);

  // Debounce the search box before it drives a server request.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  // Role filter or search changing means the current page number no longer
  // means anything for the new result set.
  useEffect(() => {
    setTablePage(1);
  }, [filter, debouncedSearch]);

  const fetchTablePage = useCallback(async () => {
    try {
      setTableLoading(true);
      const { data, error } = await UserService.listUsers({
        role: filter || undefined,
        search: debouncedSearch || undefined,
        page: tablePage,
        limit: TABLE_PAGE_SIZE,
      });
      if (!isMountedRef.current) return;
      if (error) {
        setTableError(error);
      } else {
        setTableUsers(data?.users || []);
        setTableTotalPages(data?.pagination?.totalPages ?? 1);
        setTableTotalCount(data?.pagination?.total ?? 0);
        setTableError('');
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      safeConsoleError('Error fetching users page:', error);
      setTableError('Kullanıcılar yüklenirken bir hata oluştu');
    } finally {
      if (isMountedRef.current) setTableLoading(false);
    }
  }, [filter, debouncedSearch, tablePage]);

  useEffect(() => {
    fetchTablePage();
  }, [fetchTablePage]);

  const refetchAll = useCallback(() => {
    fetchAllUsers();
    fetchTablePage();
  }, [fetchAllUsers, fetchTablePage]);

  // Filter students for parent-child matching — sourced from the full
  // roster since this panel needs to search/filter across every student,
  // not just the current table page.
  const filteredStudents = allUsers
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

  const handleDeleteUser = async (userToDelete: UserType) => {
    const userId = userToDelete.id;
    const ok = await confirm({
      title: 'Kullanıcıyı sil',
      description: `"${userToDelete.adSoyad}" kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      confirmLabel: 'Sil',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const { error } = await UserService.deleteUser(userId);
      if (error) {
        safeConsoleError('Kullanıcı silinirken hata oluştu:', error);
        toast.error('Kullanıcı silinirken hata oluştu: ' + error);
      } else {
        setAllUsers((users) => users.filter((u) => u.id !== userId));
        setTableUsers((users) => users.filter((u) => u.id !== userId));
        if (selectedParent?.id === userId) {
          setSelectedParent(null);
          setSelectedChildren([]);
        }
        if (editUser?.id === userId) {
          setEditUser(null);
        }
        toast.success('Kullanıcı başarıyla silindi.');
        fetchTablePage();
      }
    } catch (error) {
      safeConsoleError('Kullanıcı silinirken hata oluştu:', error);
      toast.error('Kullanıcı silinirken hata oluştu.');
    }
  };

  const handleResetPasswordConfirm = (reason: string, reasonNote?: string) => {
    if (!resetPasswordUser) return;
    resetPasswordMut.mutate(
      { userId: resetPasswordUser.id, reason, ...(reasonNote !== undefined && { reasonNote }) },
      {
        onSuccess: (res) => {
          setRevealedPassword({
            password: res.password,
            label: `${resetPasswordUser.adSoyad} (${resetPasswordUser.id})`,
          });
          setResetPasswordUser(null);
        },
        onError: (err: unknown) => {
          toast.error(
            `Şifre yenilenirken hata oluştu: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`,
          );
          setResetPasswordUser(null);
        },
      },
    );
  };

  // Manual assignment by ID
  const handleManualAssign = () => {
    const student = allUsers.find((u) => u.id === manualAssignId && u.rol === 'student');
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
        const applyChildId = (u: UserType) =>
          u.id === selectedParent.id ? { ...u, childId: selectedChildren } : u;
        setAllUsers((users) => users.map(applyChildId));
        setTableUsers((users) => users.map(applyChildId));
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

  const columns: ColumnDef<UserType>[] = [
    {
      accessorKey: 'adSoyad',
      header: 'Ad Soyad',
      cell: (info) => {
        const u = info.row.original;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-serif text-sm text-[var(--ink)]">{u.adSoyad}</span>
            <span className="font-mono text-[10px] text-[var(--ink-dim)]">ID: {u.id}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'rol',
      header: 'Rol',
      cell: (info) => <Chip tone="default">{getRolLabel(info.row.original)}</Chip>,
    },
    {
      id: 'sinifSube',
      header: 'Sınıf/Şube',
      cell: (info) => {
        const u = info.row.original;
        return (
          <span className="font-mono text-xs text-[var(--ink-2)]">
            {u.sinif ? `${u.sinif}/${u.sube || '—'}` : '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'oda',
      header: 'Oda',
      cell: (info) => (
        <span className="font-mono text-xs text-[var(--ink-2)]">
          {info.row.original.oda || '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Aksiyonlar',
      cell: (info) => {
        const u = info.row.original;
        return (
          <div className="flex flex-wrap gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setEditUser(u)}>
              Düzenle
            </Button>
            <Button variant="outline" size="sm" onClick={() => setResetPasswordUser(u)}>
              <KeyRound size={14} />
              Şifre Yenile
            </Button>
            {u.rol === 'parent' && (
              <Button variant="secondary" size="sm" onClick={() => handleSelectParent(u)}>
                Çocuk Eşleştir
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => handleDeleteUser(u)}>
              Sil
            </Button>
          </div>
        );
      },
    },
  ];

  const inputBase = cn(
    'bg-[var(--paper)] dark:bg-[var(--surface-2)] border border-[var(--rule)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--ink)]',
    'placeholder:text-[var(--ink-dim)]',
    'focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-tint)]',
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
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--surface)] shadow-[var(--shadow)] p-4">
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
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--surface)] shadow-[var(--shadow)] px-4 py-3">
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
            onLinkComplete={refetchAll}
            onClose={() => setShowBulkLink(false)}
          />
        )}

        {/* User table — server-paginated so the page doesn't render every
            user (hundreds, in a real school) into the DOM at once. */}
        {tableError && (
          <p className="text-sm text-[var(--accent)] rounded-[var(--radius-sm)] border border-[var(--accent)] bg-[var(--accent-tint)] px-3 py-2">
            {tableError}
          </p>
        )}
        {tableLoading ? (
          <div className="p-16 flex justify-center">
            <LoadBar className="max-w-[240px]" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={tableUsers}
            paginated={false}
            emptyState="Arama kriterlerine uygun kullanıcı bulunamadı."
          />
        )}

        {tableTotalPages > 1 && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs font-medium text-[var(--ink-dim)]">
              Sayfa {tablePage} / {tableTotalPages} · Toplam {tableTotalCount} kullanıcı
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                disabled={tablePage <= 1}
              >
                <ChevronLeft size={14} />
                Önceki
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTablePage((p) => Math.min(tableTotalPages, p + 1))}
                disabled={tablePage >= tableTotalPages}
              >
                Sonraki
                <ChevronRight size={14} />
              </Button>
            </div>
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
            <div className="rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--surface)] shadow-[var(--shadow)] p-4 space-y-3">
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
                <p className="text-sm text-[var(--accent)]">{manualAssignError}</p>
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

              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-px bg-[var(--rule)] max-h-[400px] overflow-y-auto rounded-[var(--radius)] border border-[var(--rule)]">
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
                        className="w-4 h-4 accent-[var(--accent)] flex-shrink-0 cursor-pointer"
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
              <div className="rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--surface)] shadow-[var(--shadow)] p-4 space-y-3">
                <div className="text-xs font-medium text-[var(--ink-dim)]">
                  Seçilen Çocuklar ({selectedChildren.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedChildren.map((childId) => {
                    const child = allUsers.find((u) => u.id === childId);
                    return child ? (
                      <div
                        key={childId}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--rule)] bg-[var(--paper)]"
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
                          className="text-[var(--ink-dim)] hover:text-[var(--accent)] transition-colors"
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
              <p className="text-sm text-[var(--accent)] rounded-[var(--radius-sm)] border border-[var(--accent)] bg-[var(--accent-tint)] px-3 py-2">
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
            setAllUsers((users) => [newUser, ...users]);
            // The new user may or may not land on the currently viewed table
            // page (it's sorted by name, not newest-first) — refetch it.
            fetchTablePage();
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onUserUpdated={(userId, updatedFields) => {
            const applyUpdate = (u: UserType) => (u.id === userId ? { ...u, ...updatedFields } : u);
            setAllUsers((users) => users.map(applyUpdate));
            setTableUsers((users) => users.map(applyUpdate));
          }}
          onClose={() => setEditUser(null)}
        />
      )}

      {resetPasswordUser && (
        <ResetReasonModal
          userLabel={`${resetPasswordUser.adSoyad} (${resetPasswordUser.id})`}
          onConfirm={handleResetPasswordConfirm}
          onCancel={() => setResetPasswordUser(null)}
        />
      )}

      {revealedPassword && (
        <PasswordRevealModal
          password={revealedPassword.password}
          userLabel={revealedPassword.label}
          onClose={() => setRevealedPassword(null)}
        />
      )}
    </ModernDashboardLayout>
  );
}
