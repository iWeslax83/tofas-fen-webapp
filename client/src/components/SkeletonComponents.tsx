import React from 'react';
import './SkeletonComponents.css';

// Base Skeleton Component
interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style, children }) => (
  <div className={`skeleton ${className}`} style={style}>
    {children}
  </div>
);

// Text Skeleton Components
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 1, 
  className = '' 
}) => (
  <div className={`skeleton-text ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <div key={index} className="skeleton-line" />
    ))}
  </div>
);

export const SkeletonTitle: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-title ${className}`} />
);

export const SkeletonSubtitle: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-subtitle ${className}`} />
);

// Card Skeleton Components
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-card ${className}`}>
    <div className="skeleton-card-header">
      <SkeletonTitle />
      <SkeletonSubtitle />
    </div>
    <div className="skeleton-card-content">
      <SkeletonText lines={3} />
    </div>
    <div className="skeleton-card-footer">
      <div className="skeleton-button" />
      <div className="skeleton-button" />
    </div>
  </div>
);

export const SkeletonClubCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-club-card ${className}`}>
    <div className="skeleton-club-image" />
    <div className="skeleton-club-content">
      <SkeletonTitle />
      <SkeletonText lines={2} />
      <div className="skeleton-club-stats">
        <div className="skeleton-stat" />
        <div className="skeleton-stat" />
        <div className="skeleton-stat" />
      </div>
    </div>
  </div>
);

// Table Skeleton Components
export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}) => (
  <div className={`skeleton-table ${className}`}>
    <div className="skeleton-table-header">
      {Array.from({ length: columns }).map((_, index) => (
        <div key={index} className="skeleton-table-header-cell" />
      ))}
    </div>
    <div className="skeleton-table-body">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="skeleton-table-cell" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// Form Skeleton Components
export const SkeletonForm: React.FC<{ fields?: number; className?: string }> = ({ 
  fields = 4, 
  className = '' 
}) => (
  <div className={`skeleton-form ${className}`}>
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index} className="skeleton-form-field">
        <div className="skeleton-label" />
        <div className="skeleton-input" />
      </div>
    ))}
    <div className="skeleton-form-actions">
      <div className="skeleton-button skeleton-button-primary" />
      <div className="skeleton-button skeleton-button-secondary" />
    </div>
  </div>
);

// List Skeleton Components
export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({ 
  items = 5, 
  className = '' 
}) => (
  <div className={`skeleton-list ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="skeleton-list-item">
        <div className="skeleton-avatar" />
        <div className="skeleton-list-content">
          <SkeletonTitle />
          <SkeletonText lines={1} />
        </div>
        <div className="skeleton-list-actions">
          <div className="skeleton-icon" />
          <div className="skeleton-icon" />
        </div>
      </div>
    ))}
  </div>
);

// Dashboard Skeleton Components
export const SkeletonDashboard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-dashboard ${className}`}>
    <div className="skeleton-dashboard-header">
      <SkeletonTitle />
      <div className="skeleton-dashboard-actions">
        <div className="skeleton-button" />
        <div className="skeleton-button" />
      </div>
    </div>
    <div className="skeleton-dashboard-grid">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
    <div className="skeleton-dashboard-content">
      <SkeletonTable rows={3} columns={3} />
    </div>
  </div>
);

// Profile Skeleton Components
export const SkeletonProfile: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-profile ${className}`}>
    <div className="skeleton-profile-header">
      <div className="skeleton-profile-avatar" />
      <div className="skeleton-profile-info">
        <SkeletonTitle />
        <SkeletonSubtitle />
      </div>
    </div>
    <div className="skeleton-profile-content">
      <SkeletonForm fields={6} />
    </div>
  </div>
);

// Notification Skeleton Components
export const SkeletonNotification: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-notification ${className}`}>
    <div className="skeleton-notification-icon" />
    <div className="skeleton-notification-content">
      <SkeletonTitle />
      <SkeletonText lines={1} />
    </div>
    <div className="skeleton-notification-time" />
  </div>
);

// Calendar Skeleton Components
export const SkeletonCalendar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-calendar ${className}`}>
    <div className="skeleton-calendar-header">
      <div className="skeleton-calendar-nav" />
      <SkeletonTitle />
      <div className="skeleton-calendar-nav" />
    </div>
    <div className="skeleton-calendar-grid">
      {Array.from({ length: 42 }).map((_, index) => (
        <div key={index} className="skeleton-calendar-day" />
      ))}
    </div>
  </div>
);

// Chart Skeleton Components
export const SkeletonChart: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-chart ${className}`}>
    <div className="skeleton-chart-header">
      <SkeletonTitle />
      <div className="skeleton-chart-legend">
        <div className="skeleton-legend-item" />
        <div className="skeleton-legend-item" />
        <div className="skeleton-legend-item" />
      </div>
    </div>
    <div className="skeleton-chart-content">
      <div className="skeleton-chart-bars">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="skeleton-chart-bar" />
        ))}
      </div>
    </div>
  </div>
);

// Loading States
export const LoadingState: React.FC<{ 
  isLoading: boolean; 
  error?: string | null; 
  onRetry?: () => void;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
}> = ({ isLoading, error, onRetry, children, skeleton }) => {
  if (isLoading) {
    return <>{skeleton}</>;
  }

  if (error) {
    return (
      <div className="error-state">
        <div className="error-icon">⚠️</div>
        <h3>Bir hata oluştu</h3>
        <p>{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="retry-button">
            Tekrar Dene
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
