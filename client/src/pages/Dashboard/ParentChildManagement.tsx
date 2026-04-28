import { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, UserPlus, Link2, AlertTriangle, X } from 'lucide-react';
import { UserService } from '../../utils/apiService';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import EnhancedErrorBoundary from '../../components/EnhancedErrorBoundary';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { ParentsList, StudentsList, LinkedPairsList, ConfirmationModal } from './parent-child';
import type { UserType, LinkedPair, ConfirmAction } from './parent-child';

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

  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const [parentSearchRaw, setParentSearchRaw] = useState('');
  const [studentSearchRaw, setStudentSearchRaw] = useState('');
  const [linksSearchRaw, setLinksSearchRaw] = useState('');
  const [showUnmatchedParents, setShowUnmatchedParents] = useState(false);
  const [showUnmatchedStudents, setShowUnmatchedStudents] = useState(false);
  const [sinifFilter, setSinifFilter] = useState('');
  const [subeFilter, setSubeFilter] = useState('');

  const parentSearch = useDebouncedValue(parentSearchRaw, 300);
  const studentSearch = useDebouncedValue(studentSearchRaw, 300);
  const linksSearch = useDebouncedValue(linksSearchRaw, 300);

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

  useEffect(() => {
    setSelectedStudentIds(new Set());
  }, [selectedParentId]);

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

  const sinifOptions = useMemo(
    () => [...new Set(students.map((s) => s.sinif).filter(Boolean))].sort(),
    [students],
  );
  const subeOptions = useMemo(
    () => [...new Set(students.map((s) => s.sube).filter(Boolean))].sort(),
    [students],
  );

  const selectedParent = useMemo(
    () => parents.find((p) => p.id === selectedParentId) || null,
    [parents, selectedParentId],
  );

  const selectedParentSurname = useMemo(() => {
    if (!selectedParent) return '';
    return normalizeTurkish(extractSurname(selectedParent.adSoyad));
  }, [selectedParent]);

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

  const filteredLinks = useMemo(() => {
    if (!linksSearch) return linkedPairs;
    const q = linksSearch.toLowerCase();
    return linkedPairs.filter(
      (p) => p.parentName.toLowerCase().includes(q) || p.childName.toLowerCase().includes(q),
    );
  }, [linkedPairs, linksSearch]);

  const isSuggested = useCallback(
    (student: UserType): boolean => {
      if (!selectedParentSurname) return false;
      return normalizeTurkish(extractSurname(student.adSoyad)) === selectedParentSurname;
    },
    [selectedParentSurname],
  );

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
        <div className="p-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          Yükleniyor…
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout pageTitle="Veli-Öğrenci Eşleştirme" breadcrumb={breadcrumb}>
      <div className="p-6 space-y-6">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
            Belge No. {new Date().getFullYear()}/E
          </div>
          <h1 className="font-serif text-2xl text-[var(--ink)] mt-1">Veli-Öğrenci Eşleştirme</h1>
        </header>

        {successMessage && (
          <Card accentBar contentClassName="px-4 py-2 flex items-center gap-2">
            <Chip tone="black">Bildirim</Chip>
            <span className="font-serif text-sm text-[var(--ink)]">{successMessage}</span>
          </Card>
        )}
        {error && (
          <Card contentClassName="px-4 py-2 flex items-center gap-2 border-l-4 border-[var(--state)]">
            <Chip tone="state">Hata</Chip>
            <span className="font-serif text-sm text-[var(--ink)] flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              aria-label="Hatayı kapat"
              className="text-[var(--ink-dim)] hover:text-[var(--ink)]"
            >
              <X size={14} />
            </button>
          </Card>
        )}

        <StatsBar
          parents={parents.length}
          students={students.length}
          linked={linkedPairs.length}
          unmatchedParents={unmatchedParentCount}
          unmatchedStudents={unmatchedStudentCount}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

interface StatsBarProps {
  parents: number;
  students: number;
  linked: number;
  unmatchedParents: number;
  unmatchedStudents: number;
}

function StatsBar({
  parents,
  students,
  linked,
  unmatchedParents,
  unmatchedStudents,
}: StatsBarProps) {
  const items = [
    { label: 'Veli', value: parents, icon: Users },
    { label: 'Öğrenci', value: students, icon: UserPlus },
    { label: 'Aktif Bağlantı', value: linked, icon: Link2 },
    {
      label: 'Eşleşmemiş',
      value: `${unmatchedParents} / ${unmatchedStudents}`,
      icon: AlertTriangle,
      hint: 'Veli / Öğrenci',
    },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--rule)] border border-[var(--rule)]">
      {items.map(({ label, value, icon: Icon, hint }) => (
        <div key={label} className="bg-[var(--paper)] p-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-dim)]">
            <Icon size={12} />
            {label}
          </div>
          <div className="font-serif text-2xl text-[var(--ink)] mt-2">{value}</div>
          {hint && (
            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-dim-2)] mt-1">
              {hint}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ParentChildManagement() {
  return (
    <EnhancedErrorBoundary>
      <ParentChildManagementContent />
    </EnhancedErrorBoundary>
  );
}
