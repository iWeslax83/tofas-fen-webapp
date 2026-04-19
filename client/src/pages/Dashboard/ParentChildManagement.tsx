import { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, UserPlus, Link2, CheckCircle, AlertTriangle } from 'lucide-react';
import { UserService } from '../../utils/apiService';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import EnhancedErrorBoundary from '../../components/EnhancedErrorBoundary';
import { ParentsList, StudentsList, LinkedPairsList, ConfirmationModal } from './parent-child';
import type { UserType, LinkedPair, ConfirmAction } from './parent-child';
import './VeliEslestirme.css';

// Turkish character normalization for surname matching
function normalizeTurkish(str: string): string {
  return str
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g');
}

function extractSurname(adSoyad: string): string {
  const parts = adSoyad.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

// Debounce hook
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function ParentChildManagementContent() {
  const { user: currentUser } = useAuthContext();

  const [parents, setParents] = useState<UserType[]>([]);
  const [students, setStudents] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Selection state
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Search/filter state (raw input values)
  const [parentSearchRaw, setParentSearchRaw] = useState('');
  const [studentSearchRaw, setStudentSearchRaw] = useState('');
  const [linksSearchRaw, setLinksSearchRaw] = useState('');
  const [showUnmatchedParents, setShowUnmatchedParents] = useState(false);
  const [showUnmatchedStudents, setShowUnmatchedStudents] = useState(false);
  const [sinifFilter, setSinifFilter] = useState('');
  const [subeFilter, setSubeFilter] = useState('');

  // Debounced search values
  const parentSearch = useDebouncedValue(parentSearchRaw, 300);
  const studentSearch = useDebouncedValue(studentSearchRaw, 300);
  const linksSearch = useDebouncedValue(linksSearchRaw, 300);

  // Confirmation modal
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await UserService.getUsers();
      const allUsers = (data as UserType[]) || [];
      setParents(allUsers.filter((u) => u.rol === 'parent'));
      setStudents(allUsers.filter((u) => u.rol === 'student'));
    } catch {
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset multi-select when parent changes
  useEffect(() => {
    setSelectedStudentIds(new Set());
  }, [selectedParentId]);

  // Build linked pairs
  const linkedPairs = useMemo<LinkedPair[]>(() => {
    const pairs: LinkedPair[] = [];
    parents.forEach((parent) => {
      if (parent.childId && parent.childId.length > 0) {
        parent.childId.forEach((cid) => {
          const child = students.find((s) => s.id === cid);
          if (child) {
            pairs.push({
              parentId: parent.id,
              childId: child.id,
              parentName: parent.adSoyad,
              childName: child.adSoyad,
              childSinif: child.sinif,
              childSube: child.sube,
            });
          }
        });
      }
    });
    return pairs;
  }, [parents, students]);

  // Stats
  const matchedParentIds = useMemo(
    () => new Set(linkedPairs.map((p) => p.parentId)),
    [linkedPairs],
  );
  const matchedStudentIds = useMemo(
    () => new Set(linkedPairs.map((p) => p.childId)),
    [linkedPairs],
  );
  const unmatchedParentCount = parents.length - matchedParentIds.size;
  const unmatchedStudentCount = students.filter((s) => !matchedStudentIds.has(s.id)).length;

  // Available sinif/sube options
  const sinifOptions = useMemo(
    () => [...new Set(students.map((s) => s.sinif).filter(Boolean))].sort(),
    [students],
  );
  const subeOptions = useMemo(
    () => [...new Set(students.map((s) => s.sube).filter(Boolean))].sort(),
    [students],
  );

  // Selected parent object
  const selectedParent = useMemo(
    () => parents.find((p) => p.id === selectedParentId) || null,
    [parents, selectedParentId],
  );

  // Surname of selected parent
  const selectedParentSurname = useMemo(() => {
    if (!selectedParent) return '';
    return normalizeTurkish(extractSurname(selectedParent.adSoyad));
  }, [selectedParent]);

  // Filtered parents
  const filteredParents = useMemo(() => {
    let list = parents;
    if (parentSearch) {
      const q = parentSearch.toLowerCase();
      list = list.filter(
        (p) => p.adSoyad.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
      );
    }
    if (showUnmatchedParents) {
      list = list.filter((p) => !matchedParentIds.has(p.id));
    }
    return list;
  }, [parents, parentSearch, showUnmatchedParents, matchedParentIds]);

  // Filtered and sorted students (with surname suggestions)
  const filteredStudents = useMemo(() => {
    let list = students;
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      list = list.filter(
        (s) => s.adSoyad.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
      );
    }
    if (showUnmatchedStudents) {
      list = list.filter((s) => !matchedStudentIds.has(s.id));
    }
    if (sinifFilter) {
      list = list.filter((s) => s.sinif === sinifFilter);
    }
    if (subeFilter) {
      list = list.filter((s) => s.sube === subeFilter);
    }
    // Sort: suggested (same surname) first
    if (selectedParentSurname) {
      list = [...list].sort((a, b) => {
        const aSurname = normalizeTurkish(extractSurname(a.adSoyad));
        const bSurname = normalizeTurkish(extractSurname(b.adSoyad));
        const aMatch = aSurname === selectedParentSurname ? 0 : 1;
        const bMatch = bSurname === selectedParentSurname ? 0 : 1;
        return aMatch - bMatch;
      });
    }
    return list;
  }, [
    students,
    studentSearch,
    showUnmatchedStudents,
    matchedStudentIds,
    sinifFilter,
    subeFilter,
    selectedParentSurname,
  ]);

  // Filtered linked pairs
  const filteredLinks = useMemo(() => {
    if (!linksSearch) return linkedPairs;
    const q = linksSearch.toLowerCase();
    return linkedPairs.filter(
      (p) => p.parentName.toLowerCase().includes(q) || p.childName.toLowerCase().includes(q),
    );
  }, [linkedPairs, linksSearch]);

  // Check if student has same surname as selected parent
  const isSuggested = useCallback(
    (student: UserType): boolean => {
      if (!selectedParentSurname) return false;
      return normalizeTurkish(extractSurname(student.adSoyad)) === selectedParentSurname;
    },
    [selectedParentSurname],
  );

  // Check if student is already linked to selected parent
  const isLinkedToSelected = useCallback(
    (studentId: string): boolean => {
      if (!selectedParent) return false;
      return (selectedParent.childId || []).includes(studentId);
    },
    [selectedParent],
  );

  const showMessage = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMessage(msg);
      setError(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(msg);
    }
  };

  // Toggle student selection for multi-select
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Bulk link selected students
  const handleBulkLink = async () => {
    if (!selectedParentId || selectedStudentIds.size === 0) return;
    try {
      setProcessing(true);
      let successCount = 0;
      let errorCount = 0;
      for (const studentId of selectedStudentIds) {
        if (!isLinkedToSelected(studentId)) {
          try {
            const { error: err } = await UserService.linkParentChild(selectedParentId, studentId);
            if (err) throw new Error(err);
            successCount++;
          } catch {
            errorCount++;
          }
        }
      }
      setSelectedStudentIds(new Set());
      await fetchData();
      if (errorCount === 0) {
        showMessage(`${successCount} öğrenci başarıyla eşleştirildi`, 'success');
      } else {
        showMessage(`${successCount} başarılı, ${errorCount} hatalı eşleştirme`, 'error');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Unlink parent-child (with confirmation)
  const handleUnlink = async (parentId: string, childId: string) => {
    try {
      setProcessing(true);
      const { error: err } = await UserService.unlinkParentChild(parentId, childId);
      if (err) throw new Error(err);
      showMessage('Bağlantı kaldırıldı', 'success');
      await fetchData();
    } catch {
      showMessage('Bağlantı kaldırılırken hata oluştu', 'error');
    } finally {
      setProcessing(false);
      setConfirmAction(null);
    }
  };

  const breadcrumb = [
    { label: 'Ana Sayfa', path: `/${currentUser?.rol || 'admin'}` },
    { label: 'Senkronizasyon', path: '/admin/senkronizasyon' },
    { label: 'Veli-Öğrenci Eşleştirme' },
  ];

  // Count linkable selected students (not already linked)
  const linkableSelectedCount = useMemo(() => {
    let count = 0;
    for (const id of selectedStudentIds) {
      if (!isLinkedToSelected(id)) count++;
    }
    return count;
  }, [selectedStudentIds, isLinkedToSelected]);

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Veli-Öğrenci Eşleştirme" breadcrumb={breadcrumb}>
        <div className="veli-eslestirme-page">
          <div className="ve-stats-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="ve-stat-card">
                <div className="ve-skeleton" style={{ width: '100%', height: 48 }} />
              </div>
            ))}
          </div>
          <div className="ve-main-layout">
            <div className="ve-panel">
              <div className="ve-skeleton" style={{ width: '100%', height: 400 }} />
            </div>
            <div className="ve-panel">
              <div className="ve-skeleton" style={{ width: '100%', height: 400 }} />
            </div>
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Veli-Öğrenci Eşleştirme" breadcrumb={breadcrumb}>
      <div className="veli-eslestirme-page">
        {/* Messages */}
        {successMessage && (
          <div className="ve-message success" role="status" aria-live="polite">
            <CheckCircle size={16} />
            {successMessage}
          </div>
        )}
        {error && (
          <div className="ve-message error" role="alert">
            <AlertTriangle size={16} />
            {error}
            <button
              onClick={() => setError(null)}
              aria-label="Hatayı kapat"
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'inherit',
                fontWeight: 700,
              }}
            >
              x
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="ve-stats-grid" role="region" aria-label="İstatistikler">
          <div className="ve-stat-card">
            <div className="ve-stat-icon blue">
              <Users size={20} />
            </div>
            <div>
              <div className="ve-stat-value">{parents.length}</div>
              <div className="ve-stat-label">Toplam Veli</div>
            </div>
          </div>
          <div className="ve-stat-card">
            <div className="ve-stat-icon green">
              <UserPlus size={20} />
            </div>
            <div>
              <div className="ve-stat-value">{students.length}</div>
              <div className="ve-stat-label">Toplam Öğrenci</div>
            </div>
          </div>
          <div className="ve-stat-card">
            <div className="ve-stat-icon purple">
              <Link2 size={20} />
            </div>
            <div>
              <div className="ve-stat-value">{linkedPairs.length}</div>
              <div className="ve-stat-label">Aktif Bağlantı</div>
            </div>
          </div>
          <div className="ve-stat-card">
            <div className="ve-stat-icon orange">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="ve-stat-value">
                {unmatchedParentCount} / {unmatchedStudentCount}
              </div>
              <div className="ve-stat-label">Eşleşmemiş Veli / Öğrenci</div>
            </div>
          </div>
        </div>

        {/* Main split panel */}
        <div className="ve-main-layout">
          <ParentsList
            filteredParents={filteredParents}
            selectedParentId={selectedParentId}
            parentSearchRaw={parentSearchRaw}
            showUnmatchedParents={showUnmatchedParents}
            onSelectParent={setSelectedParentId}
            onSearchChange={setParentSearchRaw}
            onToggleUnmatched={() => setShowUnmatchedParents((v) => !v)}
          />

          <StudentsList
            filteredStudents={filteredStudents}
            selectedParentId={selectedParentId}
            selectedStudentIds={selectedStudentIds}
            studentSearchRaw={studentSearchRaw}
            showUnmatchedStudents={showUnmatchedStudents}
            sinifFilter={sinifFilter}
            subeFilter={subeFilter}
            sinifOptions={sinifOptions}
            subeOptions={subeOptions}
            linkableSelectedCount={linkableSelectedCount}
            processing={processing}
            isSuggested={isSuggested}
            isLinkedToSelected={isLinkedToSelected}
            onToggleStudent={toggleStudentSelection}
            onSearchChange={setStudentSearchRaw}
            onToggleUnmatched={() => setShowUnmatchedStudents((v) => !v)}
            onSinifFilterChange={setSinifFilter}
            onSubeFilterChange={setSubeFilter}
            onBulkLink={handleBulkLink}
          />
        </div>

        <LinkedPairsList
          linkedPairs={linkedPairs}
          filteredLinks={filteredLinks}
          linksSearchRaw={linksSearchRaw}
          processing={processing}
          onSearchChange={setLinksSearchRaw}
          onRequestUnlink={setConfirmAction}
        />

        {confirmAction && (
          <ConfirmationModal
            confirmAction={confirmAction}
            processing={processing}
            onConfirm={handleUnlink}
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </div>
    </ModernDashboardLayout>
  );
}

export default function ParentChildManagement() {
  return (
    <EnhancedErrorBoundary>
      <ParentChildManagementContent />
    </EnhancedErrorBoundary>
  );
}
