import React from 'react';

// Navigation Context
export interface NavigationContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  currentPath: string;
  breadcrumbs: BreadcrumbItem[];
}

// Types
export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ElementType;
}

export interface NavigationItem {
  key: string;
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string | number;
  children?: NavigationItem[];
  roles: string[];
  color?: string;
  description?: string;
}

export interface NavigationProviderProps {
  children: React.ReactNode;
}

// Utility Functions
export const getRoleDisplayName = (role?: string): string => {
  switch (role) {
    case 'admin':
      return 'Yönetici';
    case 'student':
      return 'Öğrenci';
    case 'teacher':
      return 'Öğretmen';
    case 'parent':
      return 'Veli';

    default:
      return 'Kullanıcı';
  }
};
