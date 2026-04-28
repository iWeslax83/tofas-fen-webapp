import { useRef, useEffect, useCallback } from 'react';
import { Users, UserPlus, Search, Link2, Filter, CheckSquare, Square } from 'lucide-react';
import { FixedSizeList as VirtualList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../utils/cn';
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

const selectClasses = cn(
  'h-8 bg-transparent border-0 border-b border-[var(--rule)] px-1 text-xs',
  'text-[var(--ink)] focus:outline-none focus:border-[var(--state)] focus:border-b-2',
  'transition-colors',
);

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
        <div style={style} className="px-3 py-1">
          <div
            className={cn(
              'flex items-center gap-3 px-3 py-2 border transition-colors',
              alreadyLinked
                ? 'bg-[var(--surface)] border-[var(--rule)] opacity-70 cursor-default'
                : suggested
                  ? 'border-[var(--state)] bg-[var(--paper)] hover:bg-[var(--surface)] cursor-pointer'
                  : isChecked
                    ? 'bg-[var(--surface-2)] border-[var(--ink)] cursor-pointer'
                    : 'bg-transparent border-[var(--rule)] hover:bg-[var(--surface)] hover:border-[var(--rule-2)] cursor-pointer',
            )}
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
          >
            {!alreadyLinked && (
              <div className="text-[var(--ink-2)] shrink-0" aria-hidden="true">
                {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
              </div>
            )}
            <div className="flex items-center justify-center w-9 h-9 bg-[var(--ink-2)] text-[var(--paper)] font-serif text-sm uppercase shrink-0">
              {student.adSoyad.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-serif text-sm text-[var(--ink)] truncate">{student.adSoyad}</div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="font-mono text-[10px] text-[var(--ink-dim)]">{student.id}</span>
                {student.sinif && (
                  <span className="font-mono text-[10px] text-[var(--ink-dim)]">
                    {student.sinif}/{student.sube}
                  </span>
                )}
                {suggested && (
                  <Chip tone="state" className="h-5 px-1.5 text-[10px]">
                    Önerilen
                  </Chip>
                )}
                {alreadyLinked && (
                  <Chip tone="black" className="h-5 px-1.5 text-[10px]">
                    Eşleşmiş
                  </Chip>
                )}
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
    <Card className="flex flex-col" contentClassName="flex flex-col h-[28rem]">
      <div className="border-b border-[var(--rule)] p-3 space-y-2">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          <UserPlus size={12} />
          Öğrenciler
          <span className="font-serif text-[var(--ink-2)] text-xs">{filteredStudents.length}</span>
          {selectedStudentIds.size > 0 && (
            <Chip tone="outline" className="ml-auto h-5 px-1.5 text-[10px]">
              {selectedStudentIds.size} seçili
            </Chip>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={12}
              className="absolute left-1 top-1/2 -translate-y-1/2 text-[var(--ink-dim)] pointer-events-none"
            />
            <Input
              placeholder="Öğrenci ara…"
              value={studentSearchRaw}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Öğrenci adı veya ID ile ara"
              className="pl-5 h-8 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={onToggleUnmatched}
            aria-pressed={showUnmatchedStudents}
            title="Sadece eşleşmemiş öğrencileri göster"
            className={cn(
              'h-8 px-2 text-[10px] font-mono uppercase tracking-wider border transition-colors',
              showUnmatchedStudents
                ? 'bg-[var(--state)] text-white border-[var(--state)]'
                : 'bg-transparent text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]',
            )}
          >
            Eşleşmemiş
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-[var(--ink-dim)] shrink-0" aria-hidden="true" />
          <select
            className={selectClasses}
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
            className={selectClasses}
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
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={onBulkLink}
            loading={processing}
            aria-label={`${linkableSelectedCount} öğrenciyi seçili veli ile eşleştir`}
          >
            <Link2 size={14} />
            Seçilenleri Eşleştir ({linkableSelectedCount})
          </Button>
        )}
      </div>
      <div
        className="flex-1 min-h-0"
        role="listbox"
        aria-label="Öğrenci seçimi"
        aria-multiselectable="true"
      >
        {!selectedParentId && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--ink-dim)] px-6 text-center">
            <Users size={28} />
            <p className="font-serif text-sm">Eşleştirmek için sol panelden bir veli seçin</p>
          </div>
        )}
        {selectedParentId && filteredStudents.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--ink-dim)]">
            <Users size={28} />
            <p className="font-serif text-sm">Öğrenci bulunamadı</p>
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
                itemSize={64}
              >
                {StudentRow}
              </VirtualList>
            )}
          </AutoSizer>
        )}
      </div>
    </Card>
  );
}
