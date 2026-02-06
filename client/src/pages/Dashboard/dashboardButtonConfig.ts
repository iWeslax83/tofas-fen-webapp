// Central config for dashboard panel buttons, routes, roles, and permissions
import { BookOpen, ClipboardList, Utensils, FileText, ShoppingBag, Wrench } from 'lucide-react';

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent' | 'hizmetli';

export interface DashboardButton {
  key: string;
  title: string;
  description: string;
  route: string;
  roles: UserRole[]; // Who can see this button
  crudRoles?: UserRole[]; // Who can add/edit/delete (if different from view)
  icon?: React.ElementType;
  showForDormitory?: boolean; // Only show for students with pansiyon=true
  actionText?: string; // Custom action text for the button
}

export const dashboardButtons: DashboardButton[] = [
  // STUDENT PRIORITY BUTTONS (Most Important First)
  // STUDENT PRIORITY BUTTONS (Most Important First)

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
    key: 'grades-student',
    title: 'Notlarım',
    description: 'Notlarını görüntüle',
    route: '/student/notlar',
    roles: ['student'],
    icon: BookOpen,
    actionText: 'Notlarımı Gör',
  },
  {
    key: 'announcements-student',
    title: 'Duyurular',
    description: 'Tüm duyuruları görüntüle',
    route: '/student/duyurular',
    roles: ['student'],
    icon: ClipboardList,
    actionText: 'Duyuruları Gör',
  },
  {
    key: 'dilekce-student',
    title: 'Dilekçe',
    description: 'Dilekçe oluştur ve takip et',
    route: '/student/dilekce',
    roles: ['student'],
    icon: FileText,
    actionText: 'Dilekçe Oluştur',
  },
  {
    key: 'student-evci',
    title: 'Evci Bilgilerim',
    description: 'Evci bilgilerini görüntüle',
    route: '/student/evci',
    roles: ['student'],
    showForDormitory: true,
    icon: ClipboardList,
    actionText: 'Bilgilerimi Gör',
  },
  {
    key: 'student-carzi',
    title: 'Çarşı İzni',
    description: 'Çarşı izni talep et ve takip et',
    route: '/student/carzi',
    roles: ['student'],
    showForDormitory: true,
    icon: ShoppingBag,
    actionText: 'İzin Talep Et',
  },

  // Dormitory related buttons (only for students with pansiyon=true)
  {
    key: 'student-meal-list',
    title: 'Yemek Listesi',
    description: 'Pansiyon yemek menüsünü görüntüle',
    route: '/student/yemek-listesi',
    roles: ['student'],
    showForDormitory: true,
    icon: Utensils,
    actionText: 'Menüyü Gör',
  },
  {
    key: 'student-supervisor-list',
    title: 'Belletmen Listesi',
    description: 'Pansiyon belletmenlerini görüntüle',
    route: '/student/belletmen-listesi',
    roles: ['student'],
    showForDormitory: true,
    icon: Utensils,
    actionText: 'Listeyi Gör',
  },

  // TEACHER PRIORITY BUTTONS

  {
    key: 'teacher-assignments',
    title: 'Ödevler',
    description: 'Ödev oluştur ve yönet',
    route: '/teacher/odevler',
    roles: ['teacher'],
    icon: BookOpen,
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
    icon: ClipboardList,
    actionText: 'Duyuruları Yönet',
  },
  {
    key: 'dilekce-teacher',
    title: 'Dilekçe',
    description: 'Dilekçe oluştur ve takip et',
    route: '/teacher/dilekce',
    roles: ['teacher'],
    icon: FileText,
    actionText: 'Dilekçe Oluştur',
  },

  // PARENT PRIORITY BUTTONS
  {
    key: 'assignments-parent',
    title: 'Ödevler',
    description: 'Çocuğunun ödevlerini takip et',
    route: '/parent/odevler',
    roles: ['parent'],
    icon: ClipboardList,
    actionText: 'Ödevleri Takip Et',
  },
  {
    key: 'lesson-schedule-parent',
    title: 'Ders Programı',
    description: 'Çocuğunun ders programını görüntüle',
    route: '/parent/ders-programi',
    roles: ['parent'],
    icon: BookOpen,
    actionText: 'Programı Gör',
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
    key: 'announcements-parent',
    title: 'Duyurular',
    description: 'Tüm duyuruları görüntüle',
    route: '/parent/duyurular',
    roles: ['parent'],
    icon: ClipboardList,
    actionText: 'Duyuruları Gör',
  },
  {
    key: 'dilekce-parent',
    title: 'Dilekçe',
    description: 'Dilekçe oluştur ve takip et',
    route: '/parent/dilekce',
    roles: ['parent'],
    icon: FileText,
    actionText: 'Dilekçe Oluştur',
  },
  {
    key: 'parent-evci',
    title: 'Evci Bilgileri',
    description: 'Çocuğunun evci bilgilerini görüntüle',
    route: '/parent/evci',
    roles: ['parent'],
    icon: ClipboardList,
    actionText: 'Bilgileri Gör',
  },

  // Admin & Hizmetli
  {
    key: 'meal-list',
    title: 'Pansiyon Yemek Listesi',
    description: 'Aylık yemek menüsünü görüntüle ve düzenle',
    route: '/admin/yemek-listesi',
    roles: ['admin', 'hizmetli'],
    crudRoles: ['admin', 'hizmetli'],
    icon: BookOpen,
    actionText: 'Menüyü Yönet',
  },
  // Belletmen Listesi (separate for admin and hizmetli)
  {
    key: 'supervisor-list-admin',
    title: 'Pansiyon Belletmen Listesi',
    description: 'Belletmen nöbet listelerini yönet',
    route: '/admin/belletmen-listesi',
    roles: ['admin'],
    crudRoles: ['admin'],
    icon: ClipboardList,
    actionText: 'Listeyi Yönet',
  },
  {
    key: 'supervisor-list-hizmetli',
    title: 'Pansiyon Belletmen Listesi',
    description: 'Belletmen nöbet listelerini yönet',
    route: '/hizmetli/belletmen-listesi',
    roles: ['hizmetli'],
    crudRoles: ['hizmetli'],
    icon: ClipboardList,
    actionText: 'Listeyi Yönet',
  },
  // Admin only
  {
    key: 'admin-evci-list',
    title: 'Evci Listesi',
    description: 'Evci öğrencileri yönet',
    route: '/admin/evci-listesi',
    roles: ['admin'],
    icon: ClipboardList,
    actionText: 'Listeyi Yönet',
  },
  {
    key: 'admin-carzi-list',
    title: 'Çarşı İzni Listesi',
    description: 'Çarşı izni taleplerini yönet',
    route: '/admin/carzi-listesi',
    roles: ['admin'],
    icon: ShoppingBag,
    actionText: 'Listeyi Yönet',
  },
  {
    key: 'admin-dilekce-list',
    title: 'Dilekçe Yönetimi',
    description: 'Dilekçeleri incele ve yönet',
    route: '/admin/dilekce-listesi',
    roles: ['admin'],
    icon: FileText,
    actionText: 'Dilekçeleri Yönet',
  },
  {
    key: 'assignments-admin',
    title: 'Ödevler',
    description: 'Tüm ödevleri görüntüle',
    route: '/admin/odevler',
    roles: ['admin'],
    icon: ClipboardList,
    actionText: 'Ödevleri Gör',
  },
  {
    key: 'announcements-admin',
    title: 'Duyurular',
    description: 'Tüm duyuruları görüntüle',
    route: '/admin/duyurular',
    roles: ['admin'],
    icon: ClipboardList,
    actionText: 'Duyuruları Gör',
  },
  {
    key: 'sync',
    title: 'Senkronizasyon',
    description: 'Veri senkronizasyon işlemleri',
    route: '/admin/senkronizasyon',
    roles: ['admin'],
    icon: Wrench,
    actionText: 'Senkronize Et',
  },
  // Analytics ve Raporlama - REMOVED

  // Dosya Yönetimi Sistemi (Sadece Admin) - REMOVED
];
