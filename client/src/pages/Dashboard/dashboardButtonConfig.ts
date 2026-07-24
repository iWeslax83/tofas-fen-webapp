// Central config for dashboard panel buttons, routes, roles, and permissions
import {
  BookOpen,
  ClipboardList,
  Utensils,
  Wrench,
  House,
  MessageSquareWarning,
  Megaphone,
  NotebookText,
  BarChart3,
  UserPlus,
  CalendarDays,
  MessageCircle,
} from 'lucide-react';

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent' | 'ziyaretci';

// Sidebar groupings. Rendered top-to-bottom in this order under their headings.
export type NavSection = 'quick' | 'dormitory' | 'registration' | 'system';

export interface DashboardButton {
  key: string;
  title: string;
  description: string;
  route: string;
  roles: UserRole[]; // Who can see this button
  crudRoles?: UserRole[]; // Who can add/edit/delete (if different from view)
  icon?: React.ElementType;
  showForDormitory?: boolean; // Only show for users with pansiyon=true (boarders / their parents)
  actionText?: string; // Custom action text for the button
  color?: string;
  section?: NavSection; // Sidebar section (defaults to 'quick')
}

export const dashboardButtons: DashboardButton[] = [
  // ─── STUDENT ───────────────────────────────────────────────────────────────
  // Hızlı Erişim: Ödevler, Ders Programı, Duyurular, Notlarım, Dilekçe
  {
    key: 'student-assignments',
    title: 'Ödevler',
    description: 'Ödev oluştur ve yönet',
    route: '/student/odevler',
    roles: ['student'],
    icon: NotebookText,
    actionText: 'Ödevleri Gör',
  },
  {
    key: 'lesson-schedule-student',
    title: 'Ders Programı',
    description: 'Ders programını görüntüle',
    route: '/student/ders-programi',
    roles: ['student'],
    icon: ClipboardList,
    actionText: 'Programı Gör',
  },
  {
    key: 'announcements-student',
    title: 'Duyurular',
    description: 'Tüm duyuruları görüntüle',
    route: '/student/duyurular',
    roles: ['student'],
    icon: Megaphone,
    actionText: 'Duyuruları Gör',
  },
  {
    key: 'grades-student',
    title: 'Notlarım',
    description: 'Notlarını görüntüle',
    route: '/student/notlar',
    roles: ['student'],
    icon: BookOpen,
    actionText: 'Notlarımı Gör',
  },
  {
    key: 'dilekce-student',
    title: 'Dilekçe',
    description: 'Dilekçe oluştur ve takip et',
    route: '/student/dilekce',
    roles: ['student'],
    icon: MessageSquareWarning,
    actionText: 'Dilekçe Oluştur',
  },
  // Pansiyon (only for boarding students, pansiyon=true)
  {
    key: 'student-evci',
    title: 'Evci Bilgilerim',
    description: 'Evci bilgilerini görüntüle',
    route: '/student/evci',
    roles: ['student'],
    showForDormitory: true,
    section: 'dormitory',
    icon: House,
    actionText: 'Bilgilerimi Gör',
  },
  {
    key: 'student-meal-list',
    title: 'Yemek Listesi',
    description: 'Pansiyon yemek menüsünü görüntüle',
    route: '/student/yemek-listesi',
    roles: ['student'],
    showForDormitory: true,
    section: 'dormitory',
    icon: Utensils,
    actionText: 'Menüyü Gör',
  },

  // ─── TEACHER (order unchanged) ───────────────────────────────────────────────
  {
    key: 'teacher-assignments',
    title: 'Ödevler',
    description: 'Ödev oluştur ve yönet',
    route: '/teacher/odevler',
    roles: ['teacher'],
    icon: NotebookText,
    actionText: 'Ödevleri Yönet',
  },
  {
    key: 'teacher-grades',
    title: 'Notlar',
    description: 'Öğrenci notlarını gir ve düzenle',
    route: '/teacher/notlar',
    roles: ['teacher'],
    icon: BookOpen,
    actionText: 'Notları Gir',
  },
  {
    key: 'teacher-schedule',
    title: 'Ders Programı',
    description: 'Ders programını görüntüle',
    route: '/teacher/ders-programi',
    roles: ['teacher'],
    icon: ClipboardList,
    actionText: 'Programı Gör',
  },
  {
    key: 'teacher-announcements',
    title: 'Duyurular',
    description: 'Duyuruları yönet ve yayınla',
    route: '/teacher/duyurular',
    roles: ['teacher'],
    icon: Megaphone,
    actionText: 'Duyuruları Yönet',
  },
  {
    key: 'dilekce-teacher',
    title: 'Dilekçe',
    description: 'Dilekçe oluştur ve takip et',
    route: '/teacher/dilekce',
    roles: ['teacher'],
    icon: MessageSquareWarning,
    actionText: 'Dilekçe Oluştur',
  },

  // ─── PARENT ──────────────────────────────────────────────────────────────────
  // Hızlı Erişim: Ödevler, Ders Programı, Duyurular, Notlar, Dilekçe
  {
    key: 'assignments-parent',
    title: 'Ödevler',
    description: 'Çocuğunun ödevlerini takip et',
    route: '/parent/odevler',
    roles: ['parent'],
    icon: NotebookText,
    actionText: 'Ödevleri Takip Et',
  },
  {
    key: 'lesson-schedule-parent',
    title: 'Ders Programı',
    description: 'Çocuğunun ders programını görüntüle',
    route: '/parent/ders-programi',
    roles: ['parent'],
    icon: ClipboardList,
    actionText: 'Programı Gör',
  },
  {
    key: 'announcements-parent',
    title: 'Duyurular',
    description: 'Tüm duyuruları görüntüle',
    route: '/parent/duyurular',
    roles: ['parent'],
    icon: Megaphone,
    actionText: 'Duyuruları Gör',
  },
  {
    key: 'grades-parent',
    title: 'Notlar',
    description: 'Çocuğunun notlarını görüntüle',
    route: '/parent/notlar',
    roles: ['parent'],
    icon: BookOpen,
    actionText: 'Notları Gör',
  },
  {
    key: 'dilekce-parent',
    title: 'Dilekçe',
    description: 'Dilekçe oluştur ve takip et',
    route: '/parent/dilekce',
    roles: ['parent'],
    icon: MessageSquareWarning,
    actionText: 'Dilekçe Oluştur',
  },
  // Pansiyon (only for parents of boarding students, pansiyon=true)
  {
    key: 'parent-evci',
    title: 'Evci Bilgileri',
    description: 'Çocuğunun evci bilgilerini görüntüle',
    route: '/parent/evci',
    roles: ['parent'],
    showForDormitory: true,
    section: 'dormitory',
    icon: House,
    actionText: 'Bilgileri Gör',
  },
  {
    key: 'meal-list-parent',
    title: 'Yemek Listesi',
    description: 'Pansiyon yemek menüsünü görüntüle',
    route: '/parent/yemek-listesi',
    roles: ['parent'],
    showForDormitory: true,
    section: 'dormitory',
    icon: Utensils,
    actionText: 'Menüyü Gör',
  },

  // ─── ADMIN ───────────────────────────────────────────────────────────────────
  // Hızlı Erişim: Duyurular, Dilekçe Yönetimi
  {
    key: 'announcements-admin',
    title: 'Duyurular',
    description: 'Tüm duyuruları görüntüle',
    route: '/admin/duyurular',
    roles: ['admin'],
    icon: Megaphone,
    actionText: 'Duyuruları Gör',
  },
  {
    key: 'admin-dilekce-list',
    title: 'Dilekçe Yönetimi',
    description: 'Dilekçeleri incele ve yönet',
    route: '/admin/dilekce-listesi',
    roles: ['admin'],
    icon: MessageSquareWarning,
    actionText: 'Dilekçeleri Yönet',
  },
  // Pansiyon: Evci Listesi, Evci İstatistikleri, Pansiyon Yemek Listesi, Pansiyon Belletmen Listesi
  {
    key: 'admin-evci-list',
    title: 'Evci Listesi',
    description: 'Evci öğrencileri yönet',
    route: '/admin/evci-listesi',
    roles: ['admin'],
    section: 'dormitory',
    icon: House,
    actionText: 'Listeyi Yönet',
  },
  {
    key: 'admin-evci-stats',
    title: 'Evci İstatistikleri',
    description: 'Evci talep istatistiklerini görüntüle',
    route: '/admin/evci-istatistik',
    roles: ['admin'],
    section: 'dormitory',
    icon: BarChart3,
    actionText: 'İstatistikleri Gör',
  },
  {
    key: 'meal-list',
    title: 'Pansiyon Yemek Listesi',
    description: 'Aylık yemek menüsünü görüntüle ve düzenle',
    route: '/admin/yemek-listesi',
    roles: ['admin'],
    crudRoles: ['admin'],
    section: 'dormitory',
    icon: Utensils,
    actionText: 'Menüyü Yönet',
  },
  {
    key: 'supervisor-list-admin',
    title: 'Pansiyon Belletmen Listesi',
    description: 'Belletmen nöbet listelerini yönet',
    route: '/admin/belletmen-listesi',
    roles: ['admin'],
    crudRoles: ['admin'],
    section: 'dormitory',
    icon: ClipboardList,
    actionText: 'Listeyi Yönet',
  },
  // Yeni Kayıt: Yeni Kayıt Başvuruları, Randevu Başvuruları, Ziyaretçi Sohbetleri
  {
    key: 'admin-registrations',
    title: 'Yeni Kayıt Başvuruları',
    description: 'Yeni kayıt başvurularını incele ve yönet',
    route: '/admin/yeni-kayit-basvurulari',
    roles: ['admin'],
    section: 'registration',
    icon: UserPlus,
    actionText: 'Başvuruları Gör',
  },
  {
    key: 'admin-appointments',
    title: 'Randevu Başvuruları',
    description: 'Okul randevu taleplerini yönet',
    route: '/admin/randevu-basvurulari',
    roles: ['admin'],
    section: 'registration',
    icon: CalendarDays,
    actionText: 'Randevuları Gör',
  },
  {
    key: 'admin-visitor-chat',
    title: 'Ziyaretçi Sohbetleri',
    description: 'Yeni kayıt ziyaretçileri ile mesajlaş',
    route: '/admin/ziyaretci-sohbet',
    roles: ['admin'],
    section: 'registration',
    icon: MessageCircle,
    actionText: 'Sohbetleri Gör',
  },
  // Sistem: Senkronizasyon (Ayarlar sidebar'da ayrıca eklenir)
  {
    key: 'sync',
    title: 'Senkronizasyon',
    description: 'Veri senkronizasyon işlemleri',
    route: '/admin/senkronizasyon',
    roles: ['admin'],
    section: 'system',
    icon: Wrench,
    actionText: 'Senkronize Et',
  },

  // ─── ZİYARETÇİ ───────────────────────────────────────────────────────────────
  {
    key: 'visitor-chat',
    title: 'Yönetici ile Sohbet',
    description: 'Okul yöneticileri ile mesajlaşın',
    route: '/ziyaretci/sohbet',
    roles: ['ziyaretci'],
    icon: MessageCircle,
    actionText: 'Sohbeti Aç',
  },
  {
    key: 'visitor-appointment',
    title: 'Randevu Al',
    description: 'Okula ziyaret için randevu alın',
    route: '/ziyaretci/randevu',
    roles: ['ziyaretci'],
    icon: CalendarDays,
    actionText: 'Randevu Al',
  },

  // Settings — sidebar "Sistem" bölümünde zaten mevcut, burada tekrar eklenmez
];
