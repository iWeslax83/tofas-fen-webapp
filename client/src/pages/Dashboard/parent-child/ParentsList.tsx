import { useRef, useEffect, useCallback } from 'react';
import { Users, Search } from 'lucide-react';
import { FixedSizeList as VirtualList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { Input } from '../../../components/ui/Input';
import { cn } from '../../../utils/cn';
import type { UserType } from './types';

interface ParentsListProps {
  filteredParents: UserType[];
  selectedParentId: string | null;
  parentSearchRaw: string;
  showUnmatchedParents: boolean;
  onSelectParent: (id: string | null) => void;
  onSearchChange: (value: string) => void;
  onToggleUnmatched: () => void;
}

function handleKeySelect(e: React.KeyboardEvent, action: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    action();
  }
}

export function ParentsList({
  filteredParents,
  selectedParentId,
  parentSearchRaw,
  showUnmatchedParents,
  onSelectParent,
  onSearchChange,
  onToggleUnmatched,
}: ParentsListProps) {
  const listRef = useRef<VirtualList>(null);

  useEffect(() => {
    listRef.current?.scrollTo(0);
  }, [parentSearchRaw, showUnmatchedParents]);

  const ParentRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const parent = filteredParents[index];
      if (!parent) return null;
      const childCount = (parent.childId || []).length;
      const isSelected = selectedParentId === parent.id;
      return (
        <div style={style} className="px-3 py-1">
          <div
            className={cn(
              'flex items-center gap-3 px-3 py-2 border cursor-pointer transition-colors',
              isSelected
                ? 'bg-[var(--surface-2)] border-[var(--ink)]'
                : 'bg-transparent border-[var(--rule)] hover:bg-[var(--surface)] hover:border-[var(--rule-2)]',
            )}
            onClick={() => onSelectParent(isSelected ? null : parent.id)}
            onKeyDown={(e) =>
              handleKeySelect(e, () => onSelectParent(isSelected ? null : parent.id))
            }
            role="option"
            tabIndex={0}
            aria-selected={isSelected}
            aria-label={`${parent.adSoyad}${childCount > 0 ? `, ${childCount} çocuk` : ''}`}
          >
            <div className="flex items-center justify-center w-9 h-9 bg-[var(--ink)] text-[var(--paper)] font-serif text-sm uppercase shrink-0">
              {parent.adSoyad.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-serif text-sm text-[var(--ink)] truncate">{parent.adSoyad}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-[10px] text-[var(--ink-dim)]">{parent.id}</span>
                {childCount > 0 && (
                  <Chip tone="black" className="h-5 px-1.5 text-[10px]">
                    {childCount} çocuk
                  </Chip>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    },
    [filteredParents, selectedParentId, onSelectParent],
  );

  return (
    <Card className="flex flex-col" contentClassName="flex flex-col h-[28rem]">
      <div className="border-b border-[var(--rule)] p-3 space-y-2">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-dim)]">
          <Users size={12} />
          Veliler
          <span className="ml-auto font-serif text-[var(--ink-2)] text-xs">
            {filteredParents.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={12}
              className="absolute left-1 top-1/2 -translate-y-1/2 text-[var(--ink-dim)] pointer-events-none"
            />
            <Input
              placeholder="Veli ara…"
              value={parentSearchRaw}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Veli adı veya ID ile ara"
              className="pl-5 h-8 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={onToggleUnmatched}
            aria-pressed={showUnmatchedParents}
            title="Sadece eşleşmemiş velileri göster"
            className={cn(
              'h-8 px-2 text-[10px] font-mono uppercase tracking-wider border transition-colors',
              showUnmatchedParents
                ? 'bg-[var(--state)] text-white border-[var(--state)]'
                : 'bg-transparent text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]',
            )}
          >
            Eşleşmemiş
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0" role="listbox" aria-label="Veli seçimi">
        {filteredParents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--ink-dim)]">
            <Users size={28} />
            <p className="font-serif text-sm">Veli bulunamadı</p>
          </div>
        ) : (
          <AutoSizer>
            {({ height, width }: { height: number; width: number }) => (
              <VirtualList
                ref={listRef}
                height={height}
                width={width}
                itemCount={filteredParents.length}
                itemSize={64}
              >
                {ParentRow}
              </VirtualList>
            )}
          </AutoSizer>
        )}
      </div>
    </Card>
  );
}
