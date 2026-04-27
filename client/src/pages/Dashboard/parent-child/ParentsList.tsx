import { useRef, useEffect, useCallback } from 'react';
import { Users, Search } from 'lucide-react';
import { FixedSizeList as VirtualList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
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
        <div style={style}>
          <div
            className={`ve-user-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelectParent(isSelected ? null : parent.id)}
            onKeyDown={(e) =>
              handleKeySelect(e, () => onSelectParent(isSelected ? null : parent.id))
            }
            role="option"
            tabIndex={0}
            aria-selected={isSelected}
            aria-label={`${parent.adSoyad}${childCount > 0 ? `, ${childCount} çocuk` : ''}`}
          >
            <div className="ve-user-avatar parent">{parent.adSoyad.charAt(0).toUpperCase()}</div>
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
    },
    [filteredParents, selectedParentId, onSelectParent],
  );

  return (
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
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Veli adı veya ID ile ara"
            />
          </div>
          <button
            className={`ve-toggle-btn ${showUnmatchedParents ? 'active' : ''}`}
            onClick={onToggleUnmatched}
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
                ref={listRef}
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
  );
}
