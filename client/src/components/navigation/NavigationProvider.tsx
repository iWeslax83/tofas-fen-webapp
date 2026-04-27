import React, { useState, createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Home,
  Bell,
  User,
  HelpCircle,
  Calendar,
  FileText,
  Users,
  BookOpen,
  ClipboardList,
  Award,
  Activity,
  MessageSquare,
  Wrench,
  Utensils,
  Crown,
  Shield,
  Zap,
} from 'lucide-react';
import type { NavigationContextType, NavigationProviderProps, BreadcrumbItem } from './types';

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Ana Sayfa', path: '/', icon: Home }];

    let currentPath = '';
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;

      // Map segment to readable label
      const label = getSegmentLabel(segment);
      const icon = getSegmentIcon(segment);

      breadcrumbs.push({
        label,
        path: currentPath,
        icon,
      });
    });

    return breadcrumbs;
  };

  const getSegmentLabel = (segment: string): string => {
    const labelMap: Record<string, string> = {
      admin: 'Yönetici Paneli',
      teacher: 'Öğretmen Paneli',
      student: 'Öğrenci Paneli',
      parent: 'Veli Paneli',
      hizmetli: 'Hizmetli Paneli',
      odevler: 'Ödevler',
      'ders-programi': 'Ders Programı',
      notlar: 'Notlar',
      duyurular: 'Duyurular',
      kuluplerim: 'Kulüplerim',
      evci: 'Evci Bilgileri',
      'yemek-listesi': 'Yemek Listesi',
      'belletmen-listesi': 'Belletmen Listesi',
      'bakim-talepleri': 'Bakım Talepleri',
      // ogrencilerim: 'Öğrencilerim',
      kulupler: 'Kulüpler',
      'evci-listesi': 'Evci Listesi',
      // senkronizasyon: 'Senkronizasyon',
      // analytics: 'Analytics',
      // reports: 'Raporlar',
      takvim: 'Takvim',
      // dosyalar: 'Dosyalar',
      iletisim: 'İletişim',
      performans: 'Performans',
      yardim: 'Yardım',
      help: 'Yardım',
    };

    return labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  const getSegmentIcon = (segment: string): React.ElementType => {
    const iconMap: Record<string, React.ElementType> = {
      admin: Crown,
      teacher: User,
      student: GraduationCap,
      parent: Users,
      hizmetli: Shield,
      odevler: BookOpen,
      'ders-programi': Calendar,
      notlar: FileText,
      duyurular: Bell,
      kuluplerim: Award,
      evci: ClipboardList,
      'yemek-listesi': Utensils,
      'belletmen-listesi': Users,
      'bakim-talepleri': Wrench,
      // ogrencilerim: Users,
      kulupler: Award,
      'evci-listesi': ClipboardList,
      senkronizasyon: Zap,
      // analytics: BarChart3,
      // reports: FileText,
      takvim: Calendar,
      // dosyalar: Folder,
      iletisim: MessageSquare,
      performans: Activity,
      yardim: HelpCircle,
      help: HelpCircle,
    };

    return iconMap[segment] || Home;
  };

  const breadcrumbs = generateBreadcrumbs(location.pathname);

  const contextValue: NavigationContextType = {
    sidebarOpen,
    setSidebarOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    searchOpen,
    setSearchOpen,
    currentPath: location.pathname,
    breadcrumbs,
  };

  return <NavigationContext.Provider value={contextValue}>{children}</NavigationContext.Provider>;
};
