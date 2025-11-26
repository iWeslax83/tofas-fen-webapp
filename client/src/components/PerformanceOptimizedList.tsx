import React, { memo, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

interface ListItem {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
}

interface PerformanceOptimizedListProps {
  items: ListItem[];
  height: number;
  itemHeight?: number;
  onItemClick?: (item: ListItem) => void;
  onItemSelect?: (item: ListItem) => void;
  selectedItems?: string[];
  searchQuery?: string;
  filterStatus?: string;
}

/**
 * Performance optimized list component with virtualization
 */
const PerformanceOptimizedList: React.FC<PerformanceOptimizedListProps> = memo(({
  items,
  height,
  itemHeight = 60,
  onItemClick,
  onItemSelect,
  selectedItems = [],
  searchQuery = '',
  filterStatus = 'all'
}) => {
  // Filter and search items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [items, searchQuery, filterStatus]);

  // Memoized item renderer
  const ItemRenderer = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = filteredItems[index];
    const isSelected = selectedItems.includes(item.id);

    return (
      <div
        style={{
          ...style,
          padding: '8px 16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: isSelected ? '#dbeafe' : 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
        onClick={() => onItemClick?.(item)}
        onDoubleClick={() => onItemSelect?.(item)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: '600', 
            fontSize: '14px',
            marginBottom: '4px',
            color: '#374151'
          }}>
            {item.title}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280',
            marginBottom: '4px'
          }}>
            {item.description}
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: '#9ca3af'
          }}>
            {item.createdAt.toLocaleDateString()}
          </div>
        </div>
        <div style={{
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '500',
          backgroundColor: getStatusColor(item.status),
          color: 'white'
        }}>
          {item.status}
        </div>
      </div>
    );
  }, [filteredItems, selectedItems, onItemClick, onItemSelect]);

  if (filteredItems.length === 0) {
    return (
      <div style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        No items found
      </div>
    );
  }

  return (
    <List
      height={height}
      width="100%"
      itemCount={filteredItems.length}
      itemSize={itemHeight}
      itemData={filteredItems}
    >
      {ItemRenderer}
    </List>
  );
});

PerformanceOptimizedList.displayName = 'PerformanceOptimizedList';

/**
 * Get status color based on status
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return '#10b981';
    case 'inactive':
      return '#ef4444';
    case 'pending':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
}

export default PerformanceOptimizedList;
