import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useNavigation } from './NavigationProvider';

export const EnhancedBreadcrumbs: React.FC = () => {
  const { breadcrumbs } = useNavigation();

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="enhanced-breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const Icon = crumb.icon;

          return (
            <li key={crumb.path} className="breadcrumb-item">
              {isLast ? (
                <span className="breadcrumb-current">
                  {Icon && <Icon className="breadcrumb-icon" />}
                  <span className="breadcrumb-label">{crumb.label}</span>
                </span>
              ) : (
                <Link to={crumb.path} className="breadcrumb-link">
                  {Icon && <Icon className="breadcrumb-icon" />}
                  <span className="breadcrumb-label">{crumb.label}</span>
                </Link>
              )}
              {!isLast && <ChevronRight className="breadcrumb-separator" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
