import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UI Store
 * Manages UI state using Zustand
 */
interface UIState {
  // Sidebar state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Mobile menu state
  mobileMenuOpen: boolean;
  
  // Search state
  searchOpen: boolean;
  searchQuery: string;
  
  // Theme state
  theme: 'light' | 'dark' | 'system';
  colorScheme: 'blue' | 'green' | 'purple' | 'red' | 'orange';
  
  // Loading states
  globalLoading: boolean;
  loadingMessage: string | null;
  
  // Modal states
  activeModal: string | null;
  modalData: unknown;
  
  // Toast settings
  toastPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  toastDuration: number;
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  toggleSearch: () => void;
  clearSearch: () => void;
  
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setColorScheme: (scheme: 'blue' | 'green' | 'purple' | 'red' | 'orange') => void;
  
  setGlobalLoading: (loading: boolean, message?: string) => void;
  
  setActiveModal: (modal: string | null, data?: unknown) => void;
  closeModal: () => void;
  
  setToastSettings: (position: UIState['toastPosition'], duration: number) => void;
  
  resetUI: () => void;
}

const initialState = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  searchOpen: false,
  searchQuery: '',
  theme: 'system' as const,
  colorScheme: 'blue' as const,
  globalLoading: false,
  loadingMessage: null,
  activeModal: null,
  modalData: null,
  toastPosition: 'top-right' as const,
  toastDuration: 4000
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      ...initialState,

      // Sidebar actions
      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      toggleSidebarCollapsed: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      // Mobile menu actions
      setMobileMenuOpen: (open: boolean) => {
        set({ mobileMenuOpen: open });
      },

      toggleMobileMenu: () => {
        set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen }));
      },

      // Search actions
      setSearchOpen: (open: boolean) => {
        set({ searchOpen: open });
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      toggleSearch: () => {
        set((state) => ({ searchOpen: !state.searchOpen }));
      },

      clearSearch: () => {
        set({ searchQuery: '', searchOpen: false });
      },

      // Theme actions
      setTheme: (theme: 'light' | 'dark' | 'system') => {
        set({ theme });
        
        // Apply theme to document
        const root = document.documentElement;
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          root.setAttribute('data-theme', systemTheme);
        } else {
          root.setAttribute('data-theme', theme);
        }
      },

      setColorScheme: (scheme: 'blue' | 'green' | 'purple' | 'red' | 'orange') => {
        set({ colorScheme: scheme });
        
        // Apply color scheme to document
        const root = document.documentElement;
        root.setAttribute('data-color-scheme', scheme);
      },

      // Loading actions
      setGlobalLoading: (loading: boolean, message?: string) => {
        set({ 
          globalLoading: loading, 
          loadingMessage: message || null 
        });
      },

      // Modal actions
      setActiveModal: (modal: string | null, data?: unknown) => {
        set({ 
          activeModal: modal, 
          modalData: data || null 
        });
      },

      closeModal: () => {
        set({ 
          activeModal: null, 
          modalData: null 
        });
      },

      // Toast settings
      setToastSettings: (position: UIState['toastPosition'], duration: number) => {
        set({ 
          toastPosition: position, 
          toastDuration: duration 
        });
      },

      // Reset UI
      resetUI: () => {
        set(initialState);
      }
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        colorScheme: state.colorScheme,
        sidebarOpen: state.sidebarOpen,
        sidebarCollapsed: state.sidebarCollapsed,
        toastPosition: state.toastPosition,
        toastDuration: state.toastDuration
      })
    }
  )
);

/**
 * Selectors for better performance
 */
export const useSidebar = () => useUIStore((state) => ({
  sidebarOpen: state.sidebarOpen,
  sidebarCollapsed: state.sidebarCollapsed,
  setSidebarOpen: state.setSidebarOpen,
  setSidebarCollapsed: state.setSidebarCollapsed,
  toggleSidebar: state.toggleSidebar,
  toggleSidebarCollapsed: state.toggleSidebarCollapsed
}));

export const useMobileMenu = () => useUIStore((state) => ({
  mobileMenuOpen: state.mobileMenuOpen,
  setMobileMenuOpen: state.setMobileMenuOpen,
  toggleMobileMenu: state.toggleMobileMenu
}));

export const useSearch = () => useUIStore((state) => ({
  searchOpen: state.searchOpen,
  searchQuery: state.searchQuery,
  setSearchOpen: state.setSearchOpen,
  setSearchQuery: state.setSearchQuery,
  toggleSearch: state.toggleSearch,
  clearSearch: state.clearSearch
}));

export const useTheme = () => useUIStore((state) => ({
  theme: state.theme,
  colorScheme: state.colorScheme,
  setTheme: state.setTheme,
  setColorScheme: state.setColorScheme
}));

export const useLoading = () => useUIStore((state) => ({
  globalLoading: state.globalLoading,
  loadingMessage: state.loadingMessage,
  setGlobalLoading: state.setGlobalLoading
}));

export const useModal = () => useUIStore((state) => ({
  activeModal: state.activeModal,
  modalData: state.modalData,
  setActiveModal: state.setActiveModal,
  closeModal: state.closeModal
}));

export const useToastSettings = () => useUIStore((state) => ({
  toastPosition: state.toastPosition,
  toastDuration: state.toastDuration,
  setToastSettings: state.setToastSettings
}));
