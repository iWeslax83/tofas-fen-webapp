import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Users, UserPlus, Search, Link2, Unlink, CheckCircle, AlertTriangle, ArrowRight, Filter, CheckSquare, Square } from 'lucide-react';
import { FixedSizeList as VirtualList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { UserService } from '../../utils/apiService';
import { useAuthContext } from '../../contexts/AuthContext';
import ModernDashboardLayout from '../../components/ModernDashboardLayout';
import EnhancedErrorBoundary from '../../components/EnhancedErrorBoundary';
import './VeliEslestirme.css';

interface UserType {
  id: string;
  adSoyad: string;
  rol: string;
  email?: string;
  sinif?: string;
  sube?: string;
  childId?: string[];
}

interface LinkedPair {
  parentId: string;
  childId: string;
  parentName: string;
  childName: string;
  childSinif?: string | undefined;
  childSube?: string | undefined;
}

interface ConfirmAction {
  type: 'unlink';
  parentId: string;
  childId: string;
  parentName: string;
  childName: string;
}

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

// Debounce hook (inline to avoid type gymnastics with the project's generic version)
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

  // Refs for virtual list
  const parentListRef = useRef<VirtualList>(null);
  const studentListRef = useRef<VirtualList>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await UserService.getUsers();
      const allUsers = (data as UserType[]) || [];
      setParents(allUsers.filter(u => u.rol === 'parent'));
      setStudents(allUsers.filter(u => u.rol === 'student'));
    } catch {
      setError('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset multi-select when parent changes
  useEffect(() => { setSelectedStudentIds(new Set()); }, [selectedParentId]);

  // Build linked pairs
  const linkedPairs = useMemo<LinkedPair[]>(() => {
    const pairs: LinkedPair[] = [];
    parents.forEach(parent => {
      if (parent.childId && parent.childId.length > 0) {
        parent.childId.forEach(cid => {
          const child = students.find(s => s.id === cid);
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
  const matchedParentIds = useMemo(() => new Set(linkedPairs.map(p => p.parentId)), [linkedPairs]);
  const matchedStudentIds = useMemo(() => new Set(linkedPairs.map(p => p.childId)), [linkedPairs]);
  const unmatchedParentCount = parents.length - matchedParentIds.size;
  const unmatchedStudentCount = students.filter(s => !matchedStudentIds.has(s.id)).length;

  // Available sinif/sube options
  const sinifOptions = useMemo(() => [...new Set(students.map(s => s.sinif).filter(Boolean))].sort(), [students]);
  const subeOptions = useMemo(() => [...new Set(students.map(s => s.sube).filter(Boolean))].sort(), [students]);

  // Selected parent object
  const selectedParent = useMemo(() => parents.find(p => p.id === selectedParentId) || null, [parents, selectedParentId]);

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
      list = list.filter(p => p.adSoyad.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    }
    if (showUnmatchedParents) {
      list = list.filter(p => !matchedParentIds.has(p.id));
    }
    return list;
  }, [parents, parentSearch, showUnmatchedParents, matchedParentIds]);

  // Filtered and sorted students (with surname suggestions)
  const filteredStudents = useMemo(() => {
    let list = students;
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      list = list.filter(s => s.adSoyad.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
    }
    if (showUnmatchedStudents) {
      list = list.filter(s => !matchedStudentIds.has(s.id));
    }
    if (sinifFilter) {
      list = list.filter(s => s.sinif === sinifFilter);
    }
    if (subeFilter) {
      list = list.filter(s => s.sube === subeFilter);
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
  }, [students, studentSearch, showUnmatchedStudents, matchedStudentIds, sinifFilter, subeFilter, selectedParentSurname]);

  // Filtered linked pairs
  const filteredLinks = useMemo(() => {
    if (!linksSearch) return linkedPairs;
    const q = linksSearch.toLowerCase();
    return linkedPairs.filter(p =>
      p.parentName.toLowerCase().includes(q) || p.childName.toLowerCase().includes(q)
    );
  }, [linkedPairs, linksSearch]);

  // Check if student has same surname as selected parent
  const isSuggested = useCallback((student: UserType): boolean => {
    if (!selectedParentSurname) return false;
    return normalizeTurkish(extractSurname(student.adSoyad)) === selectedParentSurname;
  }, [selectedParentSurname]);

  // Check if student is already linked to selected parent
  const isLinkedToSelected = useCallback((studentId: string): boolean => {
    if (!selectedParent) return false;
    return (selectedParent.childId || []).includes(studentId);
  }, [selectedParent]);

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
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Link parent-child (single)
  const handleLink = async (studentId: string) => {
    if (!selectedParentId) return;
    if (isLinkedToSelected(studentId)) return;
    try {
      setProcessing(true);
      const { error: err } = await UserService.linkParentChild(selectedParentId, studentId);
      if (err) throw new Error(err);
      showMessage('Eşleştirme başarıyla yapıldı', 'success');
      await fetchData();
    } catch {
      showMessage('Eşleştirme yapılırken hata oluştu', 'error');
    } finally {
      setProcessing(false);
    }
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

  // Keyboard handler for selectable items
  const handleKeySelect = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
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

  // Virtual list row renderers
  const ParentRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const parent = filteredParents[index];
    if (!parent) return null;
    const childCount = (parent.childId || []).length;
    const isSelected = selectedParentId === parent.id;
    return (
      <div style={style}>
        <div
          className={`ve-user-item ${isSelected ? 'selected' : ''}`}
          onClick={() => setSelectedParentId(isSelected ? null : parent.id)}
          onKeyDown={e => handleKeySelect(e, () => setSelectedParentId(isSelected ? null : parent.id))}
          role="option"
          tabIndex={0}
          aria-selected={isSelected}
          aria-label={`${parent.adSoyad}${childCount > 0 ? `, ${childCount} çocuk` : ''}`}
        >
          <div className="ve-user-avatar parent">
            {parent.adSoyad.charAt(0).toUpperCase()}
          </div>
          <div className="ve-user-info">
            <div className="ve-user-name">{parent.adSoyad}</div>
            <div className="ve-user-meta">
              <span>{parent.id}</span>
              {childCount > 0 && (
                <span className="ve-badge children-count">{childCount} çocuk</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }, [filteredParents, selectedParentId]);

  const StudentRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const student = filteredStudents[index];
    if (!student) return null;
    const suggested = isSuggested(student);
    const alreadyLinked = isLinkedToSelected(student.id);
    const isChecked = selectedStudentIds.has(student.id);
    return (
      <div style={style}>
        <div
          className={`ve-user-item ${suggested ? 'suggested' : ''} ${alreadyLinked ? 'matched' : ''}`}
          onClick={() => {
            if (alreadyLinked || processing) return;
            toggleStudentSelection(student.id);
          }}
          onKeyDown={e => handleKeySelect(e, () => {
            if (!alreadyLinked && !processing) toggleStudentSelection(student.id);
          })}
          role="option"
          tabIndex={alreadyLinked ? -1 : 0}
          aria-selected={isChecked}
          aria-disabled={alreadyLinked}
          aria-label={`${student.adSoyad}${student.sinif ? ` ${student.sinif}/${student.sube}` : ''}${suggested ? ' - Önerilen eşleşme' : ''}${alreadyLinked ? ' - Zaten eşleşmiş' : ''}`}
          style={{ cursor: alreadyLinked || processing ? 'default' : 'pointer' }}
        >
          {/* Checkbox */}
          {!alreadyLinked && (
            <div className="ve-checkbox" aria-hidden="true">
              {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
            </div>
          )}
          <div className="ve-user-avatar student">
            {student.adSoyad.charAt(0).toUpperCase()}
          </div>
          <div className="ve-user-info">
            <div className="ve-user-name">{student.adSoyad}</div>
            <div className="ve-user-meta">
              <span>{student.id}</span>
              {student.sinif && <span>{student.sinif}/{student.sube}</span>}
              {suggested && <span className="ve-badge suggested">Önerilen</span>}
              {alreadyLinked && <span className="ve-badge matched">Eşleşmiş</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }, [filteredStudents, isSuggested, isLinkedToSelected, selectedStudentIds, processing]);

  // Reset virtual list scroll when filters change
  useEffect(() => {
    parentListRef.current?.scrollTo(0);
  }, [parentSearch, showUnmatchedParents]);

  useEffect(() => {
    studentListRef.current?.scrollTo(0);
  }, [studentSearch, showUnmatchedStudents, sinifFilter, subeFilter, selectedParentId]);

  if (loading) {
    return (
      <ModernDashboardLayout pageTitle="Veli-Öğrenci Eşleştirme" breadcrumb={breadcrumb}>
        <div className="veli-eslestirme-page">
          <div className="ve-stats-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="ve-stat-card"><div className="ve-skeleton" style={{ width: '100%', height: 48 }} /></div>
            ))}
          </div>
          <div className="ve-main-layout">
            <div className="ve-panel"><div className="ve-skeleton" style={{ width: '100%', height: 400 }} /></div>
            <div className="ve-panel"><div className="ve-skeleton" style={{ width: '100%', height: 400 }} /></div>
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
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
            >
              x
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="ve-stats-grid" role="region" aria-label="İstatistikler">
          <div className="ve-stat-card">
            <div className="ve-stat-icon blue"><Users size={20} /></div>
            <div>
              <div className="ve-stat-value">{parents.length}</div>
              <div className="ve-stat-label">Toplam Veli</div>
            </div>
          </div>
          <div className="ve-stat-card">
            <div className="ve-stat-icon green"><UserPlus size={20} /></div>
            <div>
              <div className="ve-stat-value">{students.length}</div>
              <div className="ve-stat-label">Toplam Öğrenci</div>
            </div>
          </div>
          <div className="ve-stat-card">
            <div className="ve-stat-icon purple"><Link2 size={20} /></div>
            <div>
              <div className="ve-stat-value">{linkedPairs.length}</div>
              <div className="ve-stat-label">Aktif Bağlantı</div>
            </div>
          </div>
          <div className="ve-stat-card">
            <div className="ve-stat-icon orange"><AlertTriangle size={20} /></div>
            <div>
              <div className="ve-stat-value">{unmatchedParentCount} / {unmatchedStudentCount}</div>
              <div className="ve-stat-label">Eşleşmemiş Veli / Öğrenci</div>
            </div>
          </div>
        </div>

        {/* Main split panel */}
        <div className="ve-main-layout">
          {/* Parents Panel */}
          <div className="ve-panel" role="region" aria-label="Veli listesi">
            <div className="ve-panel-header">
              <div className="ve-panel-title">
                <Users size={16} />
                Veliler
                <span className="count">{filteredParents.length}</span>
              </div>
              <div className="ve-search-row">
                <div className="ve-search-wrapper" role="search">
                  <Search size={14} />
                  <input
                    className="ve-search-input"
                    placeholder="Veli ara..."
                    value={parentSearchRaw}
                    onChange={e => setParentSearchRaw(e.target.value)}
                    aria-label="Veli adı veya ID ile ara"
                  />
                </div>
                <button
                  className={`ve-toggle-btn ${showUnmatchedParents ? 'active' : ''}`}
                  onClick={() => setShowUnmatchedParents(!showUnmatchedParents)}
                  aria-pressed={showUnmatchedParents}
                  title="Sadece eşleşmemiş velileri göster"
                >
                  Eşleşmemiş
                </button>
              </div>
            </div>
            <div className="ve-user-list" role="listbox" aria-label="Veli seçimi">
              {filteredParents.length === 0 ? (
                <div className="ve-empty">
                  <Users size={32} />
                  <p>Veli bulunamadı</p>
                </div>
              ) : (
                <AutoSizer>
                  {({ height, width }: { height: number; width: number }) => (
                    <VirtualList
                      ref={parentListRef}
                      height={height}
                      width={width}
                      itemCount={filteredParents.length}
                      itemSize={58}
                    >
                      {ParentRow}
                    </VirtualList>
                  )}
                </AutoSizer>
              )}
            </div>
          </div>

          {/* Students Panel */}
          <div className="ve-panel" role="region" aria-label="Öğrenci listesi">
            <div className="ve-panel-header">
              <div className="ve-panel-title">
                <UserPlus size={16} />
                Öğrenciler
                <span className="count">{filteredStudents.length}</span>
                {selectedStudentIds.size > 0 && (
                  <span className="ve-badge suggested">{selectedStudentIds.size} seçili</span>
                )}
              </div>
              <div className="ve-search-row">
                <div className="ve-search-wrapper" role="search">
                  <Search size={14} />
                  <input
                    className="ve-search-input"
                    placeholder="Öğrenci ara..."
                    value={studentSearchRaw}
                    onChange={e => setStudentSearchRaw(e.target.value)}
                    aria-label="Öğrenci adı veya ID ile ara"
                  />
                </div>
                <button
                  className={`ve-toggle-btn ${showUnmatchedStudents ? 'active' : ''}`}
                  onClick={() => setShowUnmatchedStudents(!showUnmatchedStudents)}
                  aria-pressed={showUnmatchedStudents}
                  title="Sadece eşleşmemiş öğrencileri göster"
                >
                  Eşleşmemiş
                </button>
              </div>
              <div className="ve-search-row">
                <Filter size={14} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
                <select className="ve-filter-select" value={sinifFilter} onChange={e => setSinifFilter(e.target.value)} aria-label="Sınıf filtrele">
                  <option value="">Tüm Sınıflar</option>
                  {sinifOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="ve-filter-select" value={subeFilter} onChange={e => setSubeFilter(e.target.value)} aria-label="Şube filtrele">
                  <option value="">Tüm Şubeler</option>
                  {subeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Bulk link button */}
              {selectedParentId && linkableSelectedCount > 0 && (
                <button
                  className="ve-bulk-link-btn"
                  onClick={handleBulkLink}
                  disabled={processing}
                  aria-label={`${linkableSelectedCount} öğrenciyi seçili veli ile eşleştir`}
                >
                  <Link2 size={14} />
                  {processing ? 'İşleniyor...' : `Seçilenleri Eşleştir (${linkableSelectedCount})`}
                </button>
              )}
            </div>
            <div className="ve-user-list" role="listbox" aria-label="Öğrenci seçimi" aria-multiselectable="true">
              {!selectedParentId && (
                <div className="ve-empty">
                  <Users size={32} />
                  <p>Eşleştirmek için sol panelden bir veli seçin</p>
                </div>
              )}
              {selectedParentId && filteredStudents.length === 0 && (
                <div className="ve-empty">
                  <Users size={32} />
                  <p>Öğrenci bulunamadı</p>
                </div>
              )}
              {selectedParentId && filteredStudents.length > 0 && (
                <AutoSizer>
                  {({ height, width }: { height: number; width: number }) => (
                    <VirtualList
                      ref={studentListRef}
                      height={height}
                      width={width}
                      itemCount={filteredStudents.length}
                      itemSize={58}
                    >
                      {StudentRow}
                    </VirtualList>
                  )}
                </AutoSizer>
              )}
            </div>
          </div>
        </div>

        {/* Existing Links */}
        <div className="ve-links-section" role="region" aria-label="Mevcut bağlantılar">
          <div className="ve-links-header">
            <div className="ve-links-title">
              <Link2 size={16} />
              Mevcut Bağlantılar ({linkedPairs.length})
            </div>
            <input
              className="ve-links-search"
              placeholder="Bağlantılarda ara..."
              value={linksSearchRaw}
              onChange={e => setLinksSearchRaw(e.target.value)}
              aria-label="Bağlantılarda ara"
            />
          </div>
          {filteredLinks.length === 0 ? (
            <div className="ve-empty">
              <Link2 size={32} />
              <p>{linkedPairs.length === 0 ? 'Henüz bağlantı yok' : 'Arama sonucu bulunamadı'}</p>
            </div>
          ) : (
            <div className="ve-links-grid">
              {filteredLinks.map(pair => (
                <div key={`${pair.parentId}-${pair.childId}`} className="ve-link-card">
                  <div className="ve-link-names">
                    <div className="ve-link-parent">{pair.parentName}</div>
                    <div className="ve-link-child">
                      {pair.childName}
                      {pair.childSinif && ` (${pair.childSinif}/${pair.childSube})`}
                    </div>
                  </div>
                  <ArrowRight size={14} className="ve-link-arrow" />
                  <button
                    className="ve-unlink-btn"
                    onClick={() => setConfirmAction({
                      type: 'unlink',
                      parentId: pair.parentId,
                      childId: pair.childId,
                      parentName: pair.parentName,
                      childName: pair.childName,
                    })}
                    disabled={processing}
                    aria-label={`${pair.parentName} ve ${pair.childName} bağlantısını kaldır`}
                    title="Bağlantıyı kaldır"
                  >
                    <Unlink size={12} />
                    Kaldır
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {confirmAction && (
          <div
            className="ve-confirm-overlay"
            onClick={() => setConfirmAction(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Onay penceresi"
          >
            <div className="ve-confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="ve-confirm-icon">
                <AlertTriangle size={24} />
              </div>
              <h3 className="ve-confirm-title">Bağlantıyı Kaldır</h3>
              <p className="ve-confirm-text">
                <strong>{confirmAction.parentName}</strong> ile <strong>{confirmAction.childName}</strong> arasındaki bağlantı kaldırılacak. Devam etmek istiyor musunuz?
              </p>
              <div className="ve-confirm-actions">
                <button
                  className="ve-confirm-cancel"
                  onClick={() => setConfirmAction(null)}
                  disabled={processing}
                >
                  İptal
                </button>
                <button
                  className="ve-confirm-danger"
                  onClick={() => handleUnlink(confirmAction.parentId, confirmAction.childId)}
                  disabled={processing}
                >
                  {processing ? 'Kaldırılıyor...' : 'Evet, Kaldır'}
                </button>
              </div>
            </div>
          </div>
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
