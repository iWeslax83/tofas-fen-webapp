import { useRef, useEffect, useCallback } from 'react';
import { Users, UserPlus, Search, Link2, Filter, CheckSquare, Square } from 'lucide-react';
import { FixedSizeList as VirtualList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import type { UserType } from './types';

interface StudentsListProps {
  filteredStudents: UserType[];
  selectedParentId: string | null;
  selectedStudentIds: Set<string>;
  studentSearchRaw: string;
  showUnmatchedStudents: boolean;
  sinifFilter: string;
  subeFilter: string;
  sinifOptions: (string | undefined)[];
  subeOptions: (string | undefined)[];
  linkableSelectedCount: number;
  processing: boolean;
  isSuggested: (student: UserType) => boolean;
  isLinkedToSelected: (studentId: string) => boolean;
  onToggleStudent: (studentId: string) => void;
  onSearchChange: (value: string) => void;
  onToggleUnmatched: () => void;
  onSinifFilterChange: (value: string) => void;
  onSubeFilterChange: (value: string) => void;
  onBulkLink: () => void;
}

function handleKeySelect(e: React.KeyboardEvent, action: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    action();
  }
}

export function StudentsList({
  filteredStudents,
  selectedParentId,
  selectedStudentIds,
  studentSearchRaw,
  showUnmatchedStudents,
  sinifFilter,
  subeFilter,
  sinifOptions,
  subeOptions,
  linkableSelectedCount,
  processing,
  isSuggested,
  isLinkedToSelected,
  onToggleStudent,
  onSearchChange,
  onToggleUnmatched,
  onSinifFilterChange,
  onSubeFilterChange,
  onBulkLink,
}: StudentsListProps) {
  const listRef = useRef<VirtualList>(null);

  useEffect(() => {
    listRef.current?.scrollTo(0);
  }, [studentSearchRaw, showUnmatchedStudents, sinifFilter, subeFilter, selectedParentId]);

  const StudentRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
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
              onToggleStudent(student.id);
            }}
            onKeyDown={(e) =>
              handleKeySelect(e, () => {
                if (!alreadyLinked && !processing) onToggleStudent(student.id);
              })
            }
            role="option"
            tabIndex={alreadyLinked ? -1 : 0}
            aria-selected={isChecked}
            aria-disabled={alreadyLinked}
            aria-label={`${student.adSoyad}${student.sinif ? ` ${student.sinif}/${student.sube}` : ''}${suggested ? ' - Önerilen eşleşme' : ''}${alreadyLinked ? ' - Zaten eşleşmiş' : ''}`}
            style={{ cursor: alreadyLinked || processing ? 'default' : 'pointer' }}
          >
            {!alreadyLinked && (
              <div className="ve-checkbox" aria-hidden="true">
                {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
              </div>
            )}
            <div className="ve-user-avatar student">{student.adSoyad.charAt(0).toUpperCase()}</div>
            <div className="ve-user-info">
              <div className="ve-user-name">{student.adSoyad}</div>
              <div className="ve-user-meta">
                <span>{student.id}</span>
                {student.sinif && (
                  <span>
                    {student.sinif}/{student.sube}
                  </span>
                )}
                {suggested && <span className="ve-badge suggested">Önerilen</span>}
                {alreadyLinked && <span className="ve-badge matched">Eşleşmiş</span>}
              </div>
            </div>
          </div>
        </div>
      );
    },
    [
      filteredStudents,
      isSuggested,
      isLinkedToSelected,
      selectedStudentIds,
      processing,
      onToggleStudent,
    ],
  );

  return (
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
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Öğrenci adı veya ID ile ara"
            />
          </div>
          <button
            className={`ve-toggle-btn ${showUnmatchedStudents ? 'active' : ''}`}
            onClick={onToggleUnmatched}
            aria-pressed={showUnmatchedStudents}
            title="Sadece eşleşmemiş öğrencileri göster"
          >
            Eşleşmemiş
          </button>
        </div>
        <div className="ve-search-row">
          <Filter size={14} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
          <select
            className="ve-filter-select"
            value={sinifFilter}
            onChange={(e) => onSinifFilterChange(e.target.value)}
            aria-label="Sınıf filtrele"
          >
            <option value="">Tüm Sınıflar</option>
            {sinifOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="ve-filter-select"
            value={subeFilter}
            onChange={(e) => onSubeFilterChange(e.target.value)}
            aria-label="Şube filtrele"
          >
            <option value="">Tüm Şubeler</option>
            {subeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {selectedParentId && linkableSelectedCount > 0 && (
          <button
            className="ve-bulk-link-btn"
            onClick={onBulkLink}
            disabled={processing}
            aria-label={`${linkableSelectedCount} öğrenciyi seçili veli ile eşleştir`}
          >
            <Link2 size={14} />
            {processing ? 'İşleniyor...' : `Seçilenleri Eşleştir (${linkableSelectedCount})`}
          </button>
        )}
      </div>
      <div
        className="ve-user-list"
        role="listbox"
        aria-label="Öğrenci seçimi"
        aria-multiselectable="true"
      >
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
                ref={listRef}
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
  );
}
