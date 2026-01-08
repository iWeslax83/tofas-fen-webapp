import React, { ReactNode } from 'react';
import './Grid.css';

export interface GridProps {
  children: ReactNode;
  cols?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number | string;
  className?: string;
}

export interface GridItemProps {
  children: ReactNode;
  colSpan?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  rowSpan?: number;
  className?: string;
}

// Grid Root Component
export const Grid: React.FC<GridProps> = ({
  children,
  cols = 12,
  gap = 4,
  className = '',
}) => {
  const getColsClass = () => {
    if (typeof cols === 'number') {
      return `grid-cols-${cols}`;
    }
    const classes: string[] = [];
    if (cols.sm) classes.push(`grid-cols-sm-${cols.sm}`);
    if (cols.md) classes.push(`grid-cols-md-${cols.md}`);
    if (cols.lg) classes.push(`grid-cols-lg-${cols.lg}`);
    if (cols.xl) classes.push(`grid-cols-xl-${cols.xl}`);
    return classes.join(' ');
  };

  const getGapStyle = () => {
    if (typeof gap === 'number') {
      return { gap: `var(--space-${gap})` };
    }
    return { gap };
  };

  return (
    <div
      className={`grid ${getColsClass()} ${className}`}
      style={getGapStyle()}
    >
      {children}
    </div>
  );
};

// Grid Item Component
export const GridItem: React.FC<GridItemProps> = ({
  children,
  colSpan,
  rowSpan,
  className = '',
}) => {
  const getColSpanClass = () => {
    if (!colSpan) return '';
    if (typeof colSpan === 'number') {
      return `grid-col-span-${colSpan}`;
    }
    const classes: string[] = [];
    if (colSpan.sm) classes.push(`grid-col-span-sm-${colSpan.sm}`);
    if (colSpan.md) classes.push(`grid-col-span-md-${colSpan.md}`);
    if (colSpan.lg) classes.push(`grid-col-span-lg-${colSpan.lg}`);
    if (colSpan.xl) classes.push(`grid-col-span-xl-${colSpan.xl}`);
    return classes.join(' ');
  };

  const getRowSpanStyle = () => {
    if (rowSpan) {
      return { gridRow: `span ${rowSpan}` };
    }
    return {};
  };

  return (
    <div
      className={`grid-item ${getColSpanClass()} ${className}`}
      style={getRowSpanStyle()}
    >
      {children}
    </div>
  );
};

export default Grid;

